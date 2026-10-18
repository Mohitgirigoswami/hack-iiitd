import os
import time
import base64
import json
import urllib.request
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv

from core.mandi_prices import get_mandi_price
from core.advisory import get_prescription, generate_hindi_audio, get_crop_diseases_catalog
from core.khetpin import generate_khet_pin
from core.pooling import match_buyer_order, calculate_freight_split
from core.ai_client import parse_voice_dialect_intent, analyze_crop_leaf_disease
from core.payments import create_escrow_order
from core.database import (
    get_user, get_or_create_user, update_user_telegram, get_user_lots,
    get_all_lots, get_lot_by_id, create_lot, update_lot_quantity,
    update_lot_status, delete_lot, get_backhaul_schedules, create_backhaul_schedule,
    get_notifications, add_activity, register_driver, register_buyer,
    verify_user_credentials, get_all_drivers, get_all_buyers,
    get_stakeholders_directory, schedule_backhaul_date_db, get_connection,
    get_active_pool, recalculate_active_pool
)
from core.notifications import send_dual_channel_alert, link_telegram, fetch_notifications
from state_manager import state

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv("PORT", 5000))

# --- System & Core State Endpoints ---

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "KhetOS Central API Engine"})

@app.route("/api/state", methods=["GET"])
def get_state():
    return jsonify(state.get_full_state())

@app.route("/api/reset", methods=["POST"])
def reset_state():
    state.reset_state()
    return jsonify({"status": "RESET_SUCCESSFUL", "state": state.get_full_state()})

@app.route("/api/prices", methods=["GET"])
def get_prices():
    crop = request.args.get("crop", "Mustard")
    prices = get_mandi_price(crop)
    return jsonify(prices)

# --- User Profile & Session Memory Endpoints ---

@app.route("/api/user/profile", methods=["GET"])
def get_user_profile():
    phone = request.args.get("phone", "+91 98123 45099").strip()
    user = get_user(phone)
    if not user:
        return jsonify({"status": "NOT_FOUND", "phone": phone}), 404
    lots = get_user_lots(phone)
    notifs = get_notifications(phone, limit=10)
    return jsonify({
        "status": "SUCCESS",
        "user": user,
        "lots": lots,
        "notifications": notifs
    })

# --- First-Call IVR Phone Registration & Location Capture ---

@app.route("/api/call/session", methods=["POST"])
def call_session_init():
    """
    Called when a phone dials 1800-KHET-OS.
    Checks Calling Line Identity (CLI / Caller Phone).
    If registered: personalized Hindi greeting.
    If unregistered: triggers first-call registration prompt.
    """
    data = request.get_json(silent=True) or {}
    phone = data.get("caller_phone", "+91 98123 45099").strip()
    user = get_user(phone)

    if user:
        welcome_text = (
            f"नमस्ते {user['name']} जी, खेतOS में आपका स्वागत है। "
            f"आपके {user['village']} खेत से जुड़े हैं। "
            f"मंडी भाव के लिए 1 दबाएं। अपनी गाड़ी पूलिंग के लिए 2 दबाएं। "
            f"लॉट स्टॉक बदलने के लिए 3 दबाएं। आज ट्यूबवेल कितनी देर चलाना है जानने के लिए 4 दबाएं।"
        )
        audio_bytes = generate_hindi_audio(welcome_text)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "REGISTERED_USER",
            "is_registered": True,
            "user": user,
            "voice_prompt_hi": welcome_text,
            "audio_base64": audio_b64
        })
    else:
        reg_prompt = (
            "खेतOS में आपका स्वागत है। आप पहली बार कॉल कर रहे हैं। "
            "अपना गांव चुनने और खेत लोकेशन रजिस्टर करने के लिए 1 दबाएं।"
        )
        audio_bytes = generate_hindi_audio(reg_prompt)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "NEW_CALLER_REGISTRATION_REQUIRED",
            "is_registered": False,
            "caller_phone": phone,
            "voice_prompt_hi": reg_prompt,
            "audio_base64": audio_b64
        })

@app.route("/api/call/register", methods=["POST"])
def call_register_farmer():
    """
    First-Call registration: captures Village choice and landmark voice breadcrumb,
    generates official KhetPin, and registers caller in database.
    """
    data = request.get_json(silent=True) or {}
    phone = data.get("caller_phone", "+91 98123 45099").strip()
    name = data.get("farmer_name", "Kisan Mitra").strip()
    village_choice = str(data.get("village_choice", "1"))
    voice_cue = data.get("voice_breadcrumb_text", "बड़ के पेड़ से नहर की पटरी पकड़ के ट्यूबवेल के सामने आ जाना।")

    village_map = {
        "1": ("Bhalaut", 28.8942, 76.6021),
        "2": ("Kalanaur", 28.8256, 76.3989),
        "3": ("Najafgarh", 28.6092, 76.9798),
        "4": ("Madina", 28.9312, 76.4520)
    }
    village_info = village_map.get(village_choice, ("Bhalaut", 28.8942, 76.6021))
    village_name = village_info[0]

    # Generate KhetPin anchored to PMGSY road
    pin_obj = generate_khet_pin(lat=village_info[1], lng=village_info[2], state_code="HR", district_code="ROH")
    khet_pin = pin_obj["khet_pin"]

    user = get_or_create_user(
        phone=phone,
        name=name,
        village=village_name,
        district="Rohtak",
        khet_pin=khet_pin,
        voice_breadcrumb=voice_cue
    )

    confirm_text = f"बधाई हो {name} जी! आपका खेत रजिस्टर हो गया है। आपका खेतपिन है {khet_pin}। अब गाड़ी पूलिंग में जुड़ने के लिए 2 दबाएं।"
    audio_bytes = generate_hindi_audio(confirm_text)
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None

    # Send dual-channel registration notification
    send_dual_channel_alert(
        phone=phone,
        title="KhetOS Registration Complete 🌾",
        message=f"Aapka KhetPin {khet_pin} ({village_name}) register ho gaya hai! Toll-free 1800-KHET-OS se judi gaadi pool karein.",
        hindi_voice_text=confirm_text
    )

    return jsonify({
        "status": "REGISTRATION_SUCCESSFUL",
        "user": user,
        "khet_pin": khet_pin,
        "voice_prompt_hi": confirm_text,
        "audio_base64": audio_b64
    })

@app.route("/api/call/keypad", methods=["POST"])
def handle_call_keypad():
    """
    Handles telephone keypad input from the simulated phone (/call).
    Supports persistent caller profiles, multi-crop selection, discrete bag steppers,
    tubewell advisor, and dynamic stock submenus.
    """
    data = request.get_json(silent=True) or {}
    digit = str(data.get("digit", "2")).strip()
    caller_phone = data.get("caller_phone", "+91 98123 45099").strip()
    
    user = get_user(caller_phone)
    if not user:
        farmer_name = data.get("farmer_name", "Ramu Sharma")
        village = data.get("village", "Najafgarh")
        user = get_or_create_user(caller_phone, name=farmer_name, village=village)
    else:
        farmer_name = user["name"]
        village = user["village"]

    # --- Sub-bag discrete stepper (e.g. 211, 222, 233, etc.) ---
    if len(digit) == 3 and digit.startswith("2"):
        crop_code = digit[:2]
        bag_code = digit[2]
        crop_name_map = {"21": "Mustard", "22": "Wheat", "23": "Paddy", "24": "Potato", "25": "Gram"}
        chosen_crop = crop_name_map.get(crop_code, "Wheat")
        bag_map = {"1": 5, "2": 10, "3": 20, "4": 30}
        chosen_bags = bag_map.get(bag_code, 10)
        chosen_qty = round(chosen_bags * 0.5, 1)

        user_lots = get_user_lots(caller_phone)
        if user_lots:
            lot = update_lot_quantity(user_lots[0]["lot_id"], chosen_qty)
        else:
            lot = create_lot(caller_phone, chosen_crop, chosen_qty, channel="ivr_call")

        hindi_reply = f"{farmer_name} जी, आपकी फसल {chosen_bags} बोरी ({chosen_qty} क्विंटल {chosen_crop}) में अपडेट हो गई है। बोलेरो गाड़ी 100% फुल है।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None

        return jsonify({
            "status": "POOL_JOINED_SUCCESS",
            "digit": digit,
            "crop": chosen_crop,
            "bags_count": chosen_bags,
            "quantity_quintals": chosen_qty,
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64,
            "lot": lot,
            "current_pool": state.active_pool
        })

    # --- Multi-crop pooling selection (Key 2, 21, 22, 23, 24, 25) ---
    if digit in ["2", "21", "22", "23", "24", "25"]:
        crop_map = {
            "21": ("Mustard", 4.0, 8),
            "22": ("Wheat", 5.0, 10),
            "23": ("Paddy", 6.0, 12),
            "24": ("Potato", 4.0, 8),
            "25": ("Gram", 4.0, 8),
            "2":  ("Mustard", 4.0, 8)
        }
        chosen_crop, chosen_qty, chosen_bags = crop_map.get(digit, ("Mustard", 4.0, 8))

        lot = state.add_lot_from_farmer(
            farmer_name=farmer_name,
            phone=caller_phone,
            village=village,
            crop=chosen_crop,
            quantity_quintals=chosen_qty,
            khet_pin=user.get("khet_pin", "HR-ROH-91P2"),
            channel="ivr_call"
        )
        hindi_reply = f"{farmer_name} जी, आपकी {chosen_bags} बोरी ({chosen_qty} क्विंटल {chosen_crop}) महिंद्रा बोलेरो पूल में जुड़ गई है। गाड़ी 100% फुल हो गई है और आज़ादपुर मंडी के लिए लॉक है।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None

        curr_code = digit if digit in ["21", "22", "23", "24", "25"] else "21"
        bag_options = [
            {"digit": f"{curr_code}1", "label": "5 बोरी (2.5 Qtl)"},
            {"digit": f"{curr_code}2", "label": "10 बोरी (5.0 Qtl)"},
            {"digit": f"{curr_code}3", "label": "20 बोरी (10.0 Qtl)"},
            {"digit": f"{curr_code}4", "label": "30 बोरी (15.0 Qtl)"}
        ]
        crop_options = [
            {"digit": "21", "label": "🟡 सरसों (8 बोरी)"},
            {"digit": "22", "label": "🌾 गेहूँ (10 बोरी)"},
            {"digit": "23", "label": "🌾 धान (12 बोरी)"},
            {"digit": "24", "label": "🥔 आलू (8 बोरी)"},
            {"digit": "25", "label": "🌱 चना (8 बोरी)"}
        ]

        return jsonify({
            "status": "POOL_JOINED_SUCCESS",
            "digit": digit,
            "crop": chosen_crop,
            "bags_count": chosen_bags,
            "message": f"{chosen_bags} bags ({chosen_qty} Qtl) of {chosen_crop} added to Bolero pool!",
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64,
            "lot": lot,
            "current_pool": state.active_pool,
            "crop_options": crop_options,
            "bag_options": bag_options
        })

    # --- Multi-crop Tubewell Advisor (Key 4, 41-45) ---
    elif digit in ["4", "41", "42", "43", "44", "45"]:
        crop_name = {
            "41": "Wheat",
            "42": "Mustard",
            "43": "Potato",
            "44": "Paddy",
            "45": "Gram",
            "4":  "Mustard"
        }.get(digit, "Mustard")

        from core.tubewell import calculate_tubewell_advisory
        res = calculate_tubewell_advisory(crop=crop_name, village=village, acres=1.0)
        hindi_reply = res["voice_text_hi"]

        crop_options = [
            {"digit": "41", "label": "🌾 गेहूँ सलाह (Wheat)"},
            {"digit": "42", "label": "🟡 सरसों सलाह (Mustard)"},
            {"digit": "43", "label": "🥔 आलू सलाह (Potato)"},
            {"digit": "44", "label": "🌾 धान सलाह (Paddy)"},
            {"digit": "45", "label": "🌱 चना सलाह (Gram)"}
        ]

        return jsonify({
            "status": "TUBEWELL_ADVISORY",
            "digit": digit,
            "crop": crop_name,
            "hours_recommended": res["hours_recommended"],
            "decision": res["decision"],
            "voice_prompt_hi": hindi_reply,
            "audio_base64": res["audio_base64"],
            "advisory": res,
            "crop_options": crop_options
        })

    # --- Multi-crop Mandi Prices (Key 1, 11-15) ---
    elif digit in ["1", "11", "12", "13", "14", "15"]:
        crop_name = {
            "11": "Mustard",
            "12": "Wheat",
            "13": "Potato",
            "14": "Paddy",
            "15": "Gram",
            "1":  "Mustard"
        }.get(digit, "Mustard")

        price = get_mandi_price(crop_name)
        diff = price['modal_price'] - price.get('local_trader_price', 4700)
        hindi_reply = f"आज आज़ादपुर मंडी में {crop_name} का भाव ₹{price['modal_price']} प्रति क्विंटल है। गांव के आढ़ती से ₹{diff} ज्यादा।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None

        crop_options = [
            {"digit": "11", "label": "🟡 सरसों भाव"},
            {"digit": "12", "label": "🌾 गेहूँ भाव"},
            {"digit": "13", "label": "🥔 आलू भाव"},
            {"digit": "14", "label": "🌾 धान भाव"},
            {"digit": "15", "label": "🌱 चना भाव"}
        ]

        return jsonify({
            "status": "PRICE_FETCHED",
            "digit": digit,
            "crop": crop_name,
            "price_data": price,
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64,
            "crop_options": crop_options
        })

    # --- Stock Management Submenu (Key 3, 31, 32, 33) ---
    elif digit == "3":
        user_lots = get_user_lots(caller_phone)
        total_qtl = sum(l["quantity_quintals"] for l in user_lots)
        hindi_reply = f"{farmer_name} जी, आपके खाते में कुल {len(user_lots)} लॉट ({total_qtl:.1f} क्विंटल) दर्ज हैं। स्टॉक 1 क्विंटल बढ़ाने के लिए 31 दबाएं। 1 क्विंटल घटाने के लिए 32 दबाएं। लॉट हटाने के लिए 33 दबाएं।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "STOCK_SUBMENU",
            "digit": "3",
            "user_lots": user_lots,
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64,
            "options": [
                {"digit": "31", "label": "➕ 1 क्विंटल बढ़ाएं"},
                {"digit": "32", "label": "➖ 1 क्विंटल घटाएं"},
                {"digit": "33", "label": "❌ लॉट हटाएं (₹0 पेनाल्टी)"}
            ]
        })
    elif digit == "31":
        user_lots = get_user_lots(caller_phone)
        if user_lots:
            target_lot = user_lots[0]
            updated = update_lot_quantity(target_lot["lot_id"], target_lot["quantity_quintals"] + 1.0)
            hindi_reply = f"{farmer_name} जी, आपका लॉट 1 क्विंटल बढ़ा दिया गया है। कुल {updated['quantity_quintals']:.1f} क्विंटल ({updated['bags_count']} बोरी) दर्ज हो गया है।"
            send_dual_channel_alert(
                phone=caller_phone,
                title="Stock Increased (+1 Qtl) 📦",
                message=f"Phone Call IVR Key 31: Lot #{target_lot['lot_id']} updated to {updated['quantity_quintals']:.1f} Qtl ({updated['bags_count']} bags).",
                hindi_voice_text=hindi_reply
            )
        else:
            lot = create_lot(caller_phone, "Mustard", 4.0, channel="ivr_call")
            hindi_reply = f"{farmer_name} जी, 4 क्विंटल सरसों का नया लॉट जोड़ दिया गया है।"
            updated = lot
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "STOCK_INCREASED",
            "digit": "31",
            "lot": updated,
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64
        })
    elif digit == "32":
        user_lots = get_user_lots(caller_phone)
        if user_lots:
            target_lot = user_lots[0]
            new_qty = max(1.0, target_lot["quantity_quintals"] - 1.0)
            updated = update_lot_quantity(target_lot["lot_id"], new_qty)
            hindi_reply = f"{farmer_name} जी, आपका लॉट 1 क्विंटल घटा दिया गया है। अब कुल {updated['quantity_quintals']:.1f} क्विंटल दर्ज है।"
            send_dual_channel_alert(
                phone=caller_phone,
                title="Stock Decreased (-1 Qtl) 📦",
                message=f"Phone Call IVR Key 32: Lot #{target_lot['lot_id']} reduced to {updated['quantity_quintals']:.1f} Qtl ({updated['bags_count']} bags).",
                hindi_voice_text=hindi_reply
            )
        else:
            updated = None
            hindi_reply = f"{farmer_name} जी, घटाने के लिए कोई सक्रिय लॉट नहीं मिला।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "STOCK_DECREASED",
            "digit": "32",
            "lot": updated,
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64
        })
    elif digit == "33":
        user_lots = get_user_lots(caller_phone)
        if user_lots:
            target_lot = user_lots[0]
            delete_lot(target_lot["lot_id"])
            hindi_reply = f"{farmer_name} जी, आपका लॉट #{target_lot['lot_id']} गाड़ी पूलिंग से हटा दिया गया है। शून्य पेनाल्टी लागू है।"
            send_dual_channel_alert(
                phone=caller_phone,
                title="Lot Removed (₹0 Penalty) ❌",
                message=f"Phone Call IVR Key 33: Lot #{target_lot['lot_id']} deferred and cancelled with zero penalty.",
                hindi_voice_text=hindi_reply
            )
        else:
            hindi_reply = f"{farmer_name} जी, हटाने के लिए कोई सक्रिय लॉट नहीं मिला।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "LOT_CANCELLED",
            "digit": "33",
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64
        })

    # --- Truck & Driver Status (Key 5) ---
    elif digit == "5":
        pool = get_active_pool() or state.active_pool
        hindi_reply = f"{farmer_name} जी, गाड़ी पूलिंग चालू है। बोलेरो पिकअप कल सुबह 7 बजे रवाना होगी। आपका पिकअप स्लॉट सुबह 8 बजकर 45 मिनट से 9 बजकर 15 मिनट तक रहेगा। ड्राइवर बलजीत सिंह हैं।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "TRUCK_STATUS",
            "digit": "5",
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64,
            "pool": pool,
            "milkrun": {
                "route": "Village Bhalaut (PACS) ➔ Azadpur Mandi",
                "driver": "Baljit Singh (+91 94160 88219)",
                "vehicle": "Mahindra Bolero Maxi Truck (HR-12-AE-8419)",
                "cutoff": "Today, 06:00 PM",
                "departure": "Tomorrow, 07:00 AM",
                "farmer_pickup_slot": "08:45 AM - 09:15 AM (Stop #3)"
            }
        })

    else:
        hindi_reply = "कृपया सही बटन दबाएं। मंडी भाव के लिए 1, गाड़ी पूलिंग के लिए 2, स्टॉक बदलने के लिए 3, ट्यूबवेल सलाह के लिए 4।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "UNKNOWN_DIGIT",
            "digit": digit,
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64
        })

# --- Dynamic Farmer Lot Stock CRUD & Decisions ---

@app.route("/api/farmer/lots", methods=["GET"])
def get_farmer_lots_route():
    phone = request.args.get("phone", "+91 98123 45099").strip()
    lots = get_user_lots(phone)
    return jsonify({"status": "SUCCESS", "lots": lots, "phone": phone})

@app.route("/api/farmer/lot/create", methods=["POST"])
def farmer_create_lot_route():
    data = request.get_json(silent=True) or {}
    phone = data.get("phone", "+91 98123 45099").strip()
    crop = data.get("crop", "Mustard")
    quantity_qtl = float(data.get("quantity_quintals", 4.0))
    channel = data.get("channel", "web_portal")

    lot = create_lot(phone, crop, quantity_qtl, channel=channel)
    user = get_user(phone)
    farmer_name = user["name"] if user else "Kisan Mitra"

    send_dual_channel_alert(
        phone=phone,
        title="New Harvest Lot Created 🌾",
        message=f"{farmer_name} ji, aapka {quantity_qtl} Qtl {crop} lot #{lot['lot_id']} pool mein shamil ho gaya hai.",
        hindi_voice_text=f"{farmer_name} चाचा, आपका {quantity_qtl} क्विंटल {crop} लॉट जुड़ गया है।"
    )
    return jsonify({"status": "SUCCESS", "lot": lot, "active_pool": state.active_pool})

@app.route("/api/farmer/lot/update", methods=["PUT"])
def farmer_update_lot_route():
    data = request.get_json(silent=True) or {}
    lot_id = data.get("lot_id")
    if not lot_id:
        return jsonify({"error": "lot_id required"}), 400

    current_lot = get_lot_by_id(lot_id)
    if not current_lot:
        return jsonify({"error": "Lot not found"}), 404

    new_qtl = data.get("quantity_quintals")
    delta_qtl = data.get("delta_quintals")

    if new_qtl is not None:
        target_qtl = float(new_qtl)
    elif delta_qtl is not None:
        target_qtl = current_lot["quantity_quintals"] + float(delta_qtl)
    else:
        target_qtl = current_lot["quantity_quintals"]

    updated = update_lot_quantity(lot_id, target_qtl)
    send_dual_channel_alert(
        phone=updated["phone"],
        title="Stock Quantity Updated 📦",
        message=f"Lot #{lot_id} updated: {updated['quantity_quintals']} Qtl ({updated['bags_count']} Bags). Freight share: ₹{updated['freight_share_rs']:.0f}.",
        hindi_voice_text=f"आपका लॉट #{lot_id} अब {updated['quantity_quintals']} क्विंटल हो गया है।"
    )
    return jsonify({"status": "SUCCESS", "lot": updated, "active_pool": state.active_pool})

@app.route("/api/farmer/lot/decision", methods=["POST"])
def farmer_lot_decision_route():
    data = request.get_json(silent=True) or {}
    lot_id = data.get("lot_id")
    decision = data.get("decision", "ACCEPT").upper()

    lot = get_lot_by_id(lot_id)
    if not lot:
        return jsonify({"error": "Lot not found"}), 404

    new_status = "ACCEPTED" if decision == "ACCEPT" else "REJECTED_BY_FARMER"
    updated = update_lot_status(lot_id, new_status)

    send_dual_channel_alert(
        phone=lot["phone"],
        title=f"Pickup Offer {decision}ED",
        message=f"Corridor Bolero pickup for lot #{lot_id} ({lot['quantity_quintals']} Qtl) marked {decision}ED.",
        hindi_voice_text=f"लॉट #{lot_id} का पिकअप {decision == 'ACCEPT' and 'स्वीकार' or 'रद्द'} कर दिया गया है।"
    )
    return jsonify({"status": "SUCCESS", "lot": updated, "active_pool": state.active_pool})

@app.route("/api/farmer/lot/<lot_id>", methods=["DELETE"])
def farmer_delete_lot_route(lot_id):
    success = delete_lot(lot_id)
    if not success:
        return jsonify({"error": "Lot not found"}), 404
    return jsonify({"status": "DELETED", "lot_id": lot_id, "active_pool": state.active_pool})

# --- Dual-Channel Notifications & Telegram Endpoints ---

@app.route("/api/notifications", methods=["GET"])
def get_notifications_route():
    phone = request.args.get("phone")
    notifs = fetch_notifications(phone, limit=30)
    return jsonify({"status": "SUCCESS", "notifications": notifs})

@app.route("/api/telegram/link", methods=["POST"])
def link_telegram_route():
    data = request.get_json(silent=True) or {}
    phone = data.get("phone", "+91 98123 45099").strip()
    chat_id = data.get("chat_id", "129841029")
    username = data.get("username", "@kisan_alert")
    user = link_telegram(phone, chat_id, username)
    return jsonify({"status": "LINKED", "user": user})

@app.route("/api/telegram/notify-test", methods=["POST"])
def telegram_test_notification_route():
    data = request.get_json(silent=True) or {}
    phone = data.get("phone", "+91 98123 45099").strip()
    result = send_dual_channel_alert(
        phone=phone,
        title="Omnichannel Test Alert 🔔",
        message="Aapki gaadi Kalanaur toll plaza par pahuch chuki hai. Dispatch active!",
        hindi_voice_text="आपकी गाड़ी कलानाौर टोल प्लाजा पर पहुंच चुकी है।"
    )
    return jsonify(result)

# --- 1-Day Prior Backhaul Capacity Planning Endpoints ---

@app.route("/api/backhaul/plans", methods=["GET"])
def get_backhaul_plans_route():
    schedules = get_backhaul_schedules()
    return jsonify({"status": "SUCCESS", "schedules": schedules})

@app.route("/api/backhaul/post-capacity", methods=["POST"])
def post_backhaul_capacity():
    """
    Transporters notify available return pickup capacity 1 day prior.
    """
    data = request.get_json(silent=True) or {}
    phone = data.get("transporter_phone", "+91 98123 77001")
    vehicle = data.get("vehicle", "Mahindra Bolero Maxi Truck (HR-12-AE-8419)")
    corridor = data.get("corridor", "Azadpur Mandi / Mill Hub ➔ Village Bhalaut PACS")
    pickup_date = data.get("pickup_date", "Tomorrow, 02:30 PM (24h Advance Notice)")
    capacity_kg = float(data.get("available_capacity_kg", 1500))
    cargo_items = data.get("cargo_items", [
        {"item": "Pashu Aahar (Mustard Cattle Feed Cake)", "quantity_kg": 500, "bags": 10},
        {"item": "IFFCO Neem-Coated Urea", "quantity_kg": 400, "bags": 8}
    ])

    sched_id = create_backhaul_schedule(
        transporter_phone=phone,
        vehicle=vehicle,
        corridor=corridor,
        pickup_date=pickup_date,
        available_capacity_kg=capacity_kg,
        cargo_items=cargo_items
    )

    add_activity(
        "BACKHAUL_SCHEDULED_1_DAY_PRIOR",
        f"Transporter notified return capacity for {pickup_date} on corridor {corridor}. 0% Khali Phera.",
        event_type="transporter"
    )

    return jsonify({"status": "BACKHAUL_SCHEDULED_SUCCESS", "schedule_id": sched_id, "schedules": get_backhaul_schedules()})

# --- General Agronomy & Weather Endpoints ---

@app.route("/api/tts", methods=["POST"])
def synthesize_tts():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    audio_bytes = generate_hindi_audio(text)
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
    return jsonify({
        "status": "SUCCESS",
        "audio_base64": audio_b64,
        "text": text
    })

@app.route("/api/advisory/scan", methods=["POST"])
def scan_crop_disease():
    """
    Autonomous Zero-Memory Crop Leaf Pathology Diagnosis.
    Farmers do NOT need to know the disease or crop in memory.
    AI Vision inspects raw image bytes, auto-detects crop & pathology,
    and returns deterministic ICAR prescription with 15L tank dosage.
    """
    crop = None
    image_bytes = None
    if request.is_json:
        json_data = request.get_json(silent=True) or {}
        crop = json_data.get("crop")
        b64_data = json_data.get("image_base64") or json_data.get("image")
        if b64_data:
            try:
                if "," in b64_data:
                    b64_data = b64_data.split(",", 1)[1]
                image_bytes = base64.b64decode(b64_data)
            except Exception:
                image_bytes = None
    else:
        crop = request.form.get("crop")
        file = request.files.get("image")
        image_bytes = file.read() if file else None

    # Autonomous zero-memory diagnosis: if crop is None/auto, vision detects both crop & disease
    diagnosis = analyze_crop_leaf_disease(image_bytes=image_bytes, crop_hint=crop)
    detected_crop = diagnosis.get("crop", crop or "Mustard")
    detected_disease = diagnosis.get("disease", "White Rust")
    prescription = get_prescription(crop=detected_crop, disease=detected_disease)

    hindi_text = (
        f"आपकी {detected_crop} की फसल में {prescription['disease_name']} के लक्षण हैं। "
        f"इसके लिए {prescription['chemical_salt']} का छिड़काव करें। "
        f"15 लीटर ढोलकी पंप नाप: {prescription.get('dosage_15l_tank_hi', prescription['dosage_hi'])}। "
        f"{prescription['warning_hi']}"
    )

    audio_bytes = generate_hindi_audio(hindi_text)
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None

    return jsonify({
        "status": "SUCCESS",
        "diagnosis": diagnosis,
        "prescription": prescription,
        "detected_crop": detected_crop,
        "detected_disease": detected_disease,
        "spoken_text_hi": hindi_text,
        "audio_base64": audio_b64,
        "autonomous_detected": diagnosis.get("autonomous_detected", True)
    })

@app.route("/api/advisory/catalog", methods=["GET"])
def get_crop_catalog_route():
    catalog = get_crop_diseases_catalog()
    return jsonify({
        "status": "SUCCESS",
        "crops": list(catalog.keys()),
        "catalog": catalog
    })

@app.route("/api/advisory/prescribe", methods=["POST"])
def get_crop_prescription_route():
    data = request.get_json(silent=True) or {}
    crop = data.get("crop", "Mustard")
    disease = data.get("disease", "Aphids / Mahu")
    presc = get_prescription(crop=crop, disease=disease)

    hindi_summary = f"{crop} में {presc['disease_name']} के लिए {presc['chemical_salt']} का छिड़काव करें। 15 लीटर ढोलकी पंप नाप: {presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}। {presc['warning_hi']}"
    audio_bytes = generate_hindi_audio(hindi_summary)
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None

    return jsonify({
        "status": "SUCCESS",
        "crop": crop,
        "disease": disease,
        "prescription": presc,
        "spoken_text_hi": hindi_summary,
        "audio_base64": audio_b64
    })

@app.route("/api/voice/process", methods=["POST"])
def process_voice_route():
    """
    Multimodal voice endpoint for Web Simulator & Mobile app.
    Ingests recorded audio bytes (base64) or transcribed text,
    parses dialect via Gemini 3.8 Flash, and executes corresponding action.
    """
    data = request.get_json(silent=True) or {}
    phone = data.get("phone", "+91 98123 45099").strip()
    audio_b64 = data.get("audio_base64")
    text_input = data.get("text")

    raw_payload = None
    mime_type = "audio/webm"
    if audio_b64:
        try:
            raw_payload = base64.b64decode(audio_b64)
            mime_type = data.get("mime_type", "audio/webm")
        except Exception:
            raw_payload = text_input
    else:
        raw_payload = text_input or "20 बोरी गेहूं मंडी भेजनी है"

    parsed = parse_voice_dialect_intent(raw_payload, mime_type=mime_type)
    intent = parsed.get("intent", "CROP_LOT")
    crop = parsed.get("crop", "Mustard")
    transcript = parsed.get("transcription") or text_input or "आवाज़ संदेश"

    user = get_user(phone) or get_or_create_user(phone, name="Kisan Mitra")
    farmer_name = user["name"]
    village = user.get("village", "Bhalaut")

    # Domain routing
    if intent == "TUBEWELL":
        from core.tubewell import calculate_tubewell_advisory
        res = calculate_tubewell_advisory(crop=crop, village=village, acres=1.0)
        reply = (
            f"🎙️ *आवाज़ समझी गई:* \"{transcript}\"\n\n"
            f"🚿 *{res['crop_hindi']} - आज का ट्यूबवेल सुझाव*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"⏱️ *सुझाव:* *{res['headline_hi']}*\n"
            f"💡 *कारण:* {res['reason_hi']}\n"
            f"⚡ *कृषि 3-फेज बिजली:* {res['power_roster']['active_slot']}\n"
            f"🌱 *बचत:* ~{res['groundwater_saved_liters']:,} लीटर भूजल व {res['electricity_units_saved_kwh']} यूनिट बिजली की बचत!"
        )
        audio_bytes = generate_hindi_audio(res.get("voice_text_hi") or res["headline_hi"])
        options = [
            {"label": f"🌾 {crop} पूलिंग में जोड़ें", "cmd": f"/lotcrop {crop.lower()}"},
            {"label": "📈 मंडी भाव देखें", "cmd": f"/mandi {crop.lower()}"}
        ]

    elif intent == "MANDI":
        p = get_mandi_price(crop)
        diff = p['modal_price'] - p.get('local_trader_price', 4700)
        reply = (
            f"🎙️ *आवाज़ समझी गई:* \"{transcript}\"\n\n"
            f"📈 *आज का {crop} मंडी भाव*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🏛️ *आज़ादपुर APMC मंडी:* ₹{p['modal_price']} / क्विंटल\n"
            f"🏘️ *गांव का स्थानीय आढ़ती:* ₹{p.get('local_trader_price', 4700)} / क्विंटल\n"
            f"💰 *KhetOS से सीधा मुनाफा:* *+₹{diff}/क्विंटल*\n"
            f"🛡️ *शून्य पेनाल्टी पूलिंग:* सीधे खेत से महिंद्रा बोलेरो पिकअप!"
        )
        spoken_text = f"आज {crop} का आज़ादपुर भाव ₹{p['modal_price']} है। खेतOS से आपको ₹{diff} प्रति क्विंटल का सीधा अतिरिक्त मुनाफा होगा।"
        audio_bytes = generate_hindi_audio(spoken_text)
        options = [
            {"label": f"🌾 {crop} गाड़ी में लोड कराएं", "cmd": f"/lotcrop {crop.lower()}"},
            {"label": "🚿 सिंचाई सलाह", "cmd": f"/tubewell {crop.lower()}"}
        ]

    elif intent == "PESTICIDE_DOCTOR":
        disease_query = parsed.get("pest_or_disease") or "Aphids / Mahu"
        presc = get_prescription(crop=crop, disease=disease_query)
        reply = (
            f"🎙️ *आवाज़ समझी गई:* \"{transcript}\"\n\n"
            f"🌿 *ICAR AI फसल डॉक्टर व कीटनाशक सलाह*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🌾 *फसल:* {crop}\n"
            f"🦠 *कीट/बीमारी:* *{presc['disease_name']}*\n"
            f"🧪 *असली टेक्निकल साल्ट:* `{presc['chemical_salt']}`\n"
            f"⚖️ *15L ढोलकी नाप:* *{presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}*\n"
            f"💰 *खर्च:* जेनेरिक {presc.get('generic_price', '₹180')} vs ब्रांडेड {presc.get('brand_price', '₹850')} (*~{presc.get('savings_pct', 75)}% बचत*)\n"
            f"🌱 *जैविक विकल्प:* {presc.get('organic_alternative_hi', 'नीम का तेल')}\n\n"
            f"⚠️ *सुरक्षा चेतावनी:* {presc['warning_hi']}"
        )
        spoken_summary = f"{crop} में {presc['disease_name']} के लिए दुकानदार से {presc['chemical_salt']} मांगें। {presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}।"
        audio_bytes = generate_hindi_audio(spoken_summary)
        options = [
            {"label": "🌾 अन्य रोग सलाह", "cmd": "/photo"},
            {"label": "🚿 ट्यूबवेल सलाह", "cmd": f"/tubewell {crop.lower()}"}
        ]

    elif intent == "TRUCK_TRACKING":
        pool = get_active_pool() or state.active_pool
        reply = (
            f"🎙️ *आवाज़ समझी गई:* \"{transcript}\"\n\n"
            f"🚛 *महिंद्रा बोलेरो - कृषि मिल्क-रन ट्रैकिंग*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🚚 *वाहन:* {pool.get('transporter', 'Mahindra Bolero Maxi Truck')} (HR-12-AE-8419)\n"
            f"👤 *ड्राइवर:* बलजीत सिंह (+91 94160 88219)\n"
            f"⏱️ *कट-ऑफ विंडो:* आज शाम 6:00 बजे | *प्रस्थान:* कल सुबह 07:00 बजे\n"
            f"🛣️ *मिल्क-रन रूट टाइमलाइन:*\n"
            f"  1. दिनेश छिल्लर (कल सुबह 07:15 - 07:45 AM)\n"
            f"  2. सुरेश कुमार (कल सुबह 08:00 - 08:30 AM)\n"
            f"  3. आपका खेत (कल सुबह 08:45 - 09:15 AM)\n"
            f"  ➔ आज़ादपुर APMC मंडी: कल सुबह 10:45 AM\n\n"
            f"📊 *बोलेरो लोड:* {pool.get('capacity_percentage', 73.3)}% ({pool.get('status', 'ACCEPTING_LOTS')})"
        )
        spoken_summary = "बोलेरो गाड़ी का रूट कल सुबह 7 बजे शुरू होगा। आपका पिकअप स्लॉट कल सुबह 8:45 से 9:15 बजे निर्धारित है।"
        audio_bytes = generate_hindi_audio(spoken_summary)
        options = [
            {"label": "✅ पिकअप स्वीकार करें", "cmd": "/accept"},
            {"label": "⏳ पिकअप टालें (₹0)", "cmd": "/reject"},
            {"label": "📦 मेरा स्टॉक", "cmd": "/mystock"}
        ]

    else:
        # Default: CROP_LOT
        bags = parsed.get("bags_count", 8)
        qty = parsed.get("quantity_quintals", round(bags * 0.5, 1))
        lot = create_lot(phone, crop, qty, channel="web_voice")
        pool = get_active_pool() or state.active_pool
        cap_pct = pool.get('capacity_percentage', 80.0)
        status_label = "डिस्पैच लॉक (100% Full)" if cap_pct >= 99 else "पूलिंग जारी (Accepting Lots)"

        reply = (
            f"🎙️ *आवाज़ समझी गई:* \"{transcript}\"\n\n"
            f"✅ *बधाई {farmer_name} जी! आपकी फसल पूलिंग में दर्ज हो गई!*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"📦 *लॉट आईडी:* `#{lot['lot_id']}`\n"
            f"🌾 *फसल:* {lot['crop']} ({lot['quantity_quintals']:.1f} क्विंटल / {lot['bags_count']} बोरी)\n"
            f"🚚 *गाड़ी:* Mahindra Bolero Maxi Truck (HR-12-AE-8419)\n"
            f"⏱️ *पिकअप स्लॉट:* कल सुबह 08:45 - 09:15 बजे (एग्री मिल्क-रन)\n"
            f"📊 *बोलेरो लोड:* {cap_pct}% ({status_label})\n"
            f"💰 *अतिरिक्त मुनाफा:* +₹{lot['extra_profit_rs']:.0f} (बिचौलिये से बचाई रकम!)\n\n"
            f"📍 *कट-ऑफ:* आज शाम 6:00 बजे | *रूट प्रस्थान:* कल सुबह 07:00 बजे"
        )
        spoken_summary = f"बधाई {farmer_name} जी! आपका {lot['bags_count']} बोरी ({qty} क्विंटल {crop}) दर्ज हो गया है। आपका पिकअप स्लॉट कल सुबह 8:45 से 9:15 बजे है।"
        audio_bytes = generate_hindi_audio(spoken_summary)
        options = [
            {"label": "📦 मेरा स्टॉक देखें", "cmd": "/mystock"},
            {"label": "🚿 ट्यूबवेल सलाह", "cmd": f"/tubewell {crop.lower()}"},
            {"label": "🚛 गाड़ी स्थिति", "cmd": "/truckstatus"}
        ]

    audio_b64_out = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None

    return jsonify({
        "status": "SUCCESS",
        "parsed": parsed,
        "reply": reply,
        "audio_base64": audio_b64_out,
        "options": options,
        "intent": intent,
        "crop": crop
    })

# --- Smart Tubewell & Irrigation Advisory Route ---

@app.route("/api/advisory/tubewell", methods=["GET", "POST"])
def get_tubewell_advisory_route():
    data = request.get_json(silent=True) or {}
    crop = request.args.get("crop") or data.get("crop", "Mustard")
    village = request.args.get("village") or data.get("village", "Bhalaut")
    acres = float(request.args.get("acres") or data.get("acres", 1.0))
    soil = request.args.get("soil") or data.get("soil", "loam")

    from core.tubewell import calculate_tubewell_advisory
    result = calculate_tubewell_advisory(crop=crop, village=village, acres=acres, soil_type=soil)
    return jsonify(result)

@app.route("/api/driver/inspect", methods=["POST"])
def driver_inspect_lot():
    data = request.get_json(silent=True) or {}
    lot_id = data.get("lot_id")
    action = data.get("action", "APPROVE")
    checklist = data.get("checklist")

    current_lot = get_lot_by_id(lot_id)
    if not current_lot:
        return jsonify({"error": "LOT_NOT_FOUND"}), 404

    # Terminal state lock: once lot is loaded or deferred, reject arbitrary modifications
    if current_lot["status"] in ["LOADED_ON_TRUCK", "DEFERRED_FOR_SUN_DRYING"]:
        if current_lot["status"] == "LOADED_ON_TRUCK" and action == "APPROVE":
            return jsonify({"status": "SUCCESS", "lot": current_lot, "message": "Lot already verified and loaded."})
        return jsonify({
            "error": "LOT_ALREADY_FINALIZED",
            "message": f"Lot #{lot_id} is already finalized with status '{current_lot['status']}'. State is locked."
        }), 409

    # Strict quality gate: if checklist provided for APPROVE, all 3 items must pass
    if action == "APPROVE" and checklist is not None:
        if not (checklist.get("stitched") and checklist.get("visual") and checklist.get("dryness")):
            return jsonify({
                "error": "CHECKLIST_INCOMPLETE",
                "message": "All 3 quality gate criteria (bag stitching, seed cleanliness, grain dryness) must pass before loading."
            }), 400

    if action == "APPROVE":
        updated = update_lot_status(lot_id, "LOADED_ON_TRUCK", inspection_passed=True)
    else:
        updated = update_lot_status(lot_id, "DEFERRED_FOR_SUN_DRYING", inspection_passed=False)

    if updated:
        return jsonify({"status": "SUCCESS", "lot": updated})
    return jsonify({"error": "LOT_NOT_FOUND"}), 404

@app.route("/api/buyer/order", methods=["POST"])
def place_buyer_order():
    data = request.get_json(silent=True) or {}
    buyer_name = data.get("buyer_name", "Shree Ram Roller Flour Mill")
    quantity_quintals = float(data.get("quantity_quintals", 1100))
    bid_price = float(data.get("bid_price", 5420))

    match_result = match_buyer_order(state.lots, quantity_quintals)
    escrow_amount = round(quantity_quintals * bid_price * 0.20, 2)
    order = {
        "order_id": f"ORD-{int(time.time()) % 1000}",
        "buyer_name": buyer_name,
        "quantity_requested": quantity_quintals,
        "quantity_fulfilled": match_result["total_fulfilled_quintals"],
        "offered_price": bid_price,
        "escrow_deposited_rs": escrow_amount,
        "status": "ESCROW_LOCKED_AND_DISPATCHED",
        "matched_lots": match_result["matched_lots"]
    }
    return jsonify({"status": "ORDER_MATCHED", "order": order, "matching_details": match_result})

@app.route("/api/buyer/create-payment", methods=["POST"])
def buyer_create_payment():
    data = request.get_json(silent=True) or {}
    amount_rs = float(data.get("amount_rs", 50000))
    order_id = data.get("order_id", f"ORD-{int(time.time()) % 1000}")
    buyer_name = data.get("buyer_name", "Agri Buyer")

    result = create_escrow_order(
        amount_rs=amount_rs,
        order_id=order_id,
        notes={"buyer_name": buyer_name, "purpose": "KhetOS Mandi Lot Escrow"}
    )
    return jsonify(result)

@app.route("/api/weather", methods=["GET"])
def get_corridor_weather():
    try:
        url = "https://api.open-meteo.com/v1/forecast?latitude=28.7041&longitude=77.1025&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=precipitation_probability&forecast_hours=6"
        req = urllib.request.Request(url, headers={"User-Agent": "KhetOS/1.0"})
        with urllib.request.urlopen(req, timeout=2.5) as res:
            wdata = json.loads(res.read())
            current = wdata.get("current", {})
            hourly = wdata.get("hourly", {})
            precip_prob = hourly.get("precipitation_probability", [0])[0] if hourly.get("precipitation_probability") else 0

            tarpaulin_required = precip_prob >= 25 or current.get("precipitation", 0) > 0
            return jsonify({
                "status": "LIVE_TELEMETRY",
                "temperature_c": current.get("temperature_2m", 24.5),
                "humidity_pct": current.get("relative_humidity_2m", 58),
                "precipitation_mm": current.get("precipitation", 0),
                "precipitation_probability_pct": precip_prob,
                "wind_speed_kmh": current.get("wind_speed_10m", 12.0),
                "tarpaulin_protocol": "MANDATORY_TIE_DOWN" if tarpaulin_required else "STANDBY_CLEAR",
                "advisory": "Rain risk detected — ensure tarpaulin tie-down over gunny bags." if tarpaulin_required else "Weather dry & optimal for open flatbed transit."
            })
    except Exception as e:
        return jsonify({
            "status": "CACHED_FALLBACK",
            "temperature_c": 24.0,
            "humidity_pct": 55,
            "precipitation_mm": 0.0,
            "precipitation_probability_pct": 8,
            "wind_speed_kmh": 11.5,
            "tarpaulin_protocol": "STANDBY_CLEAR",
            "advisory": "Weather dry & optimal for open flatbed transit."
        })

@app.route("/api/khetpin/audio", methods=["POST"])
def khetpin_voice_cue():
    data = request.get_json(silent=True) or {}
    khet_pin = data.get("khet_pin", "HR-ROH-91P2")
    cue_text = data.get("cue_text", "बड़ के पेड़ से नहर की पटरी पकड़ के ट्यूबवेल के सामने आ जाना।")

    audio_bytes = generate_hindi_audio(cue_text)
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
    return jsonify({
        "status": "SUCCESS",
        "khet_pin": khet_pin,
        "cue_text": cue_text,
        "audio_base64": audio_b64
    })

@app.route("/api/backhaul/manifest", methods=["GET"])
def get_backhaul_manifest():
    return jsonify({
        "status": "PRE_CONTRACTED_B2B_LOCKED",
        "corridor": "Azadpur Mandi / Mill Hub ➔ Village Bhalaut PACS Cooperative",
        "vehicle": "Mahindra Bolero Maxi Truck (HR-12-AE-8419)",
        "return_cargo": [
            {
                "item": "Pashu Aahar (Mustard Cattle Feed Cake)",
                "category": "Feed / Byproduct",
                "source": "Shree Ram Oil Mill Byproduct",
                "destination": "Bhalaut Dairy Cooperative",
                "quantity_kg": 500,
                "bags": 10,
                "wholesale_rate_rs": 1850
            },
            {
                "item": "IFFCO Neem-Coated Urea",
                "category": "Fertilizer",
                "source": "Central IFFCO Wholesale Depot",
                "destination": "Village Bhalaut PACS Society",
                "quantity_kg": 400,
                "bags": 8,
                "subsidized_mrp_rs": 266
            },
            {
                "item": "Certified ICAR Seeds & Mancozeb 75% WP",
                "category": "Certified Input",
                "source": "Pusa ICAR Agricultural Extension Hub",
                "destination": "Khad-Beej Kendra Bhalaut",
                "quantity_kg": 100,
                "bags": 2,
                "saving_vs_retail_pct": 80
            }
        ],
        "total_backhaul_weight_kg": 1000,
        "cargo_capacity_pct": 66.7,
        "transporter_backhaul_earning_rs": 850,
        "farmer_forward_freight_slashed_rs": 450,
        "deadhead_km_saved": 65,
        "khali_phera_eliminated": True
    })

# --- Multi-Stakeholder Auth, Onboarding & Directory Routes ---

@app.route("/api/auth/register-driver", methods=["POST"])
def auth_register_driver():
    data = request.get_json(silent=True) or {}
    phone = data.get("phone", "+91 94160 88219").strip()
    name = data.get("name", "Baljit Singh").strip()
    v_model = data.get("vehicle_model", "Mahindra Bolero Pickup (1.5T)")
    v_number = data.get("vehicle_number", "HR-12-AE-8419").strip()
    route = data.get("route", "Rohtak ➔ Azadpur APMC")
    license_num = data.get("license_number", "DL-042018009214")
    pin = data.get("pin_code", "1234")
    tg = data.get("telegram_username", "")

    user = register_driver(
        phone=phone, name=name, vehicle_model=v_model,
        vehicle_number=v_number, route=route,
        license_number=license_num, pin_code=pin, telegram=tg
    )
    send_dual_channel_alert(
        phone=phone,
        title="Driver Account Onboarded 🚚",
        message=f"Welcome {name}! Bolero Pickup ({v_number}) registered on corridor {route}. Passcode: {pin}.",
        hindi_voice_text=f"नमस्ते {name} जी! आपकी गाड़ी {v_number} खेतOS में रजिस्टर हो गई है।"
    )
    return jsonify({"status": "SUCCESS", "user": user})

@app.route("/api/auth/register-buyer", methods=["POST"])
def auth_register_buyer():
    data = request.get_json(silent=True) or {}
    phone = data.get("phone", "+91 98111 22334").strip()
    c_name = data.get("company_name", "Shree Ram Flour & Oil Mill").strip()
    rep_name = data.get("representative_name", "Anil Singhal").strip()
    gstin = data.get("gstin", "07AAAAA0000A1Z5").strip()
    loc = data.get("location", "Lawrence Road Industrial Area, Delhi").strip()
    crop = data.get("target_crop", "Mustard (सरसों)").strip()
    pin = data.get("pin_code", "1234")
    tg = data.get("telegram_username", "")

    user = register_buyer(
        phone=phone, company_name=c_name, representative_name=rep_name,
        gstin=gstin, location=loc, target_crop=crop, pin_code=pin, telegram=tg
    )
    send_dual_channel_alert(
        phone=phone,
        title="Buyer Escrow Account Activated 🏢",
        message=f"{c_name} (GSTIN: {gstin}) onboarded for {crop}. Sourcing Hub: {loc}.",
        hindi_voice_text=f"नमस्ते {rep_name} जी! {c_name} का एस्क्रो अकाउंट सक्रिय हो गया है।"
    )
    return jsonify({"status": "SUCCESS", "user": user})

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json(silent=True) or {}
    phone = data.get("phone", "").strip()
    pin = data.get("pin", "").strip()
    role = data.get("role")

    user, err = verify_user_credentials(phone, pin, role)
    if err:
        return jsonify({"status": "ERROR", "message": err}), 401
    return jsonify({"status": "SUCCESS", "user": user})

@app.route("/api/drivers", methods=["GET"])
def get_drivers_route():
    drivers = get_all_drivers()
    return jsonify({"status": "SUCCESS", "drivers": drivers})

@app.route("/api/buyers", methods=["GET"])
def get_buyers_route():
    buyers = get_all_buyers()
    return jsonify({"status": "SUCCESS", "buyers": buyers})

@app.route("/api/stakeholders/directory", methods=["GET"])
def get_stakeholders_directory_route():
    directory = get_stakeholders_directory()
    return jsonify({"status": "SUCCESS", "directory": directory})

# --- Reverse Backhaul Date Pooling Route ---

@app.route("/api/backhaul/pool-date", methods=["POST"])
def pool_backhaul_date_route():
    data = request.get_json(silent=True) or {}
    date_str = data.get("pickup_date", "Tomorrow, 02:30 PM (24h Prior Plan)")
    capacity_kg = float(data.get("capacity_kg", 1500))
    cargo_items = data.get("cargo_items")
    phone = data.get("transporter_phone", "+91 94160 88219")

    sched_id = schedule_backhaul_date_db(date_str, capacity_kg, cargo_items, phone)
    return jsonify({
        "status": "SUCCESS",
        "schedule_id": sched_id,
        "message": f"Backhaul return trip scheduled for {date_str} (0% Khali Phera locked)."
    })

# --- Interactive Telegram Bot Command Route ---

@app.route("/api/telegram/bot/command", methods=["POST"])
def telegram_bot_command():
    data = request.get_json(silent=True) or {}
    phone = data.get("phone", "+91 98123 45099").strip()
    command_text = data.get("text", "").strip()

    user = get_user(phone)
    if not user:
        user = get_or_create_user(phone, name="Kisan Mitra")

    farmer_name = user["name"]
    khet_pin = user.get("khet_pin", "HR-ROH-91P2")
    village = user.get("village", "Bhalaut")

    # Command Router
    parts = command_text.split()
    cmd = parts[0].lower() if parts else "/help"
    spoken_text = None
    options = []

    if cmd in ["/start", "/help"]:
        spoken_text = f"नमस्ते {farmer_name} जी, खेतOS में आपका स्वागत है। नीचे से विकल्प चुनें।"
        reply = (
            f"🌾 *नमस्ते {farmer_name} जी!*\n"
            f"KhetOS (खेतOS) किसान सहायता बॉट में आपका स्वागत है।\n\n"
            f"📍 आपका खेतपिन: `{khet_pin}` ({village})\n"
            f"📱 फोन CLI: `{phone}` (स्वचालित प्रमाणित)\n\n"
            f"⚡ *आपको कुछ टाइप करने की जरूरत नहीं है!*\n"
            f"नीचे दिए गए बटनों से जो सेवा चाहिए उसे तुरंत चुनें:"
        )
        options = [
            {"label": "🌾 फसल जोड़ें (Add Crop)", "cmd": "/addlot_start"},
            {"label": "🚿 ट्यूबवेल सलाह (Tubewell)", "cmd": "/tubewell"},
            {"label": "📈 मंडी भाव (Mandi Rates)", "cmd": "/mandi"},
            {"label": "📦 मेरा स्टॉक (My Stock)", "cmd": "/mystock"},
            {"label": "📸 पत्ती रोग जांच (Crop Doctor)", "cmd": "/photo"},
            {"label": "🚛 गाड़ी स्थिति (Truck Tracking)", "cmd": "/truckstatus"}
        ]
    elif cmd == "/addlot_start":
        spoken_text = "फसल चुनने के लिए नीचे से विकल्प चुनें।"
        reply = (
            f"🌾 *{farmer_name} जी, कौन सी फसल बोलेरो गाड़ी में लोड करवानी है?*\n"
            f"नीचे दिए गए विकल्पों में से चुनें:"
        )
        options = [
            {"label": "🌾 गेहूँ (Wheat)", "cmd": "/lotcrop wheat"},
            {"label": "🟡 सरसों (Mustard)", "cmd": "/lotcrop mustard"},
            {"label": "🥔 आलू (Potato)", "cmd": "/lotcrop potato"},
            {"label": "🌾 धान (Paddy)", "cmd": "/lotcrop paddy"},
            {"label": "🌱 चना (Gram)", "cmd": "/lotcrop gram"}
        ]
    elif cmd == "/lotcrop":
        crop_arg = parts[1].capitalize() if len(parts) > 1 else "Wheat"
        crop_hi_map = {"Mustard": "सरसों", "Wheat": "गेहूँ", "Potato": "आलू", "Paddy": "धान", "Gram": "चना"}
        crop_hi = crop_hi_map.get(crop_arg, crop_arg)
        spoken_text = f"{crop_hi} के कितने कट्टे लोड कराने हैं? नीचे से चुनें।"
        reply = (
            f"🌾 *{crop_hi} ({crop_arg})*\n"
            f"गाड़ी में कितने कट्टे / बोरी (50kg प्रत्येक) लोड कराने हैं?\n"
            f"नीचे से बोरियों की संख्या चुनें:"
        )
        options = [
            {"label": "5 बोरी (2.5 Qtl)", "cmd": f"/addlot 5 बोरी {crop_arg}"},
            {"label": "10 बोरी (5.0 Qtl)", "cmd": f"/addlot 10 बोरी {crop_arg}"},
            {"label": "20 बोरी (10.0 Qtl)", "cmd": f"/addlot 20 बोरी {crop_arg}"},
            {"label": "30 बोरी (15.0 Qtl)", "cmd": f"/addlot 30 बोरी {crop_arg}"},
            {"label": "50 बोरी (25.0 Qtl)", "cmd": f"/addlot 50 बोरी {crop_arg}"},
            {"label": "🔙 अन्य फसल", "cmd": "/addlot_start"}
        ]
    elif cmd in ["/tubewell", "/irrigation", "/water", "ट्यूबवेल", "सिंचाई"]:
        crop_arg = parts[1] if len(parts) > 1 else "Mustard"
        from core.tubewell import calculate_tubewell_advisory
        res = calculate_tubewell_advisory(crop=crop_arg, village=village, acres=1.0)
        spoken_text = res.get("voice_text_hi") or res["headline_hi"]
        reply = (
            f"🚿 *स्मार्ट ट्यूबवेल व सिंचाई परामर्श*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🌾 *फसल:* {res['crop_hindi']}\n"
            f"⏱️ *सुझाव:* *{res['headline_hi']}*\n"
            f"💡 *कारण:* {res['reason_hi']}\n\n"
            f"⚡ *कृषि 3-फेज बिजली:* {res['power_roster']['active_slot']}\n"
            f"🌱 *बचत:* ~{res['groundwater_saved_liters']:,} लीटर भूजल व {res['electricity_units_saved_kwh']} यूनिट बिजली की बचत!"
        )
        options = [
            {"label": f"🌾 {crop_arg} गाड़ी में लोड कराएं", "cmd": f"/lotcrop {crop_arg.lower()}"},
            {"label": "🌾 गेहूँ सलाह", "cmd": "/tubewell wheat"},
            {"label": "🟡 सरसों सलाह", "cmd": "/tubewell mustard"},
            {"label": "🥔 आलू सलाह", "cmd": "/tubewell potato"},
            {"label": "🌾 धान सलाह", "cmd": "/tubewell paddy"},
            {"label": "🌱 चना सलाह", "cmd": "/tubewell gram"}
        ]
    elif cmd == "/mandi":
        crop_arg = parts[1] if len(parts) > 1 else "Mustard"
        norm_crop = "Mustard"
        ca = crop_arg.lower()
        if "wheat" in ca or "कनक" in ca or "गेहूं" in ca: norm_crop = "Wheat"
        elif "potato" in ca or "आलू" in ca or "aloo" in ca: norm_crop = "Potato"
        elif "paddy" in ca or "धान" in ca: norm_crop = "Paddy"
        elif "gram" in ca or "चना" in ca: norm_crop = "Gram"

        p = get_mandi_price(norm_crop)
        diff = p['modal_price'] - p.get('local_trader_price', 4700)
        spoken_text = f"आज आज़ादपुर मंडी में {norm_crop} का भाव ₹{p['modal_price']} प्रति क्विंटल है। गांव के आढ़ती से ₹{diff} ज्यादा मिल रहे हैं।"
        reply = (
            f"📈 *आज़ादपुर APMC मंडी ({p.get('mandi', 'Azadpur')}) भाव:*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🌾 *फसल:* {p.get('commodity_hi', norm_crop)} ({norm_crop})\n"
            f"💰 *मॉडल भाव:* ₹{p['modal_price']} / क्विंटल\n"
            f"📊 *भाव सीमा:* ₹{p.get('min_price', p['modal_price'] - 150)} - ₹{p.get('max_price', p['modal_price'] + 150)}\n"
            f"📉 *स्थानीय आढ़ती भाव:* ₹{p.get('local_trader_price', 4700)}\n"
            f"✅ *खेतOS पूलिंग से सीधा लाभ:* +₹{diff}/क्विंटल"
        )
        options = [
            {"label": f"🌾 {norm_crop} पूलिंग में जोड़ें", "cmd": f"/lotcrop {norm_crop.lower()}"},
            {"label": "🌾 गेहूँ भाव", "cmd": "/mandi wheat"},
            {"label": "🟡 सरसों भाव", "cmd": "/mandi mustard"},
            {"label": "🥔 आलू भाव", "cmd": "/mandi potato"},
            {"label": "🌾 धान भाव", "cmd": "/mandi paddy"},
            {"label": "🌱 चना भाव", "cmd": "/mandi gram"},
            {"label": "🚿 सिंचाई सलाह", "cmd": f"/tubewell {norm_crop.lower()}"}
        ]
    elif cmd == "/mystock":
        lots = get_user_lots(phone)
        if not lots:
            reply = f"ℹ️ {farmer_name} जी, आपके खाते में अभी कोई सक्रिय लॉट नहीं है। नीचे दिए बटन से नया लॉट जोड़ें।"
            options = [
                {"label": "🌾 नई फसल जोड़ें", "cmd": "/addlot_start"},
                {"label": "📈 मंडी भाव देखें", "cmd": "/mandi"}
            ]
        else:
            lines = [f"📦 *आपके सक्रिय लॉट ({len(lots)}):*", "━━━━━━━━━━━━━━━━━━"]
            for l in lots:
                lines.append(f"• *#{l['lot_id']}*: {l['crop']} — {l['quantity_quintals']:.1f} Qtl ({l['bags_count']} बोरी) | स्थिति: `{l['status']}`")
            reply = "\n".join(lines)
            for l in lots:
                lid = l["lot_id"]
                if l.get("status") not in ["LOADED_ON_TRUCK", "DEFERRED_FOR_SUN_DRYING"]:
                    options.append({"label": f"➕ 5 बोरी (#{lid})", "cmd": f"/modlot {lid} {l['quantity_quintals'] + 2.5:.1f}"})
                    options.append({"label": f"➖ 5 बोरी (#{lid})", "cmd": f"/modlot {lid} {max(0.5, l['quantity_quintals'] - 2.5):.1f}"})
                    options.append({"label": f"❌ हटाएं #{lid} (₹0 पेनाल्टी)", "cmd": f"/dellot {lid}"})
            options.append({"label": "🌾 नई फसल जोड़ें", "cmd": "/addlot_start"})
            options.append({"label": "🚛 गाड़ी स्थिति", "cmd": "/truckstatus"})
    elif cmd == "/addlot":
        # Smart unit & crop parsing: supports `/addlot 10 bori wheat` or `/addlot 4 Mustard`
        msg_raw = command_text.lower()
        crop = "Mustard"
        if "wheat" in msg_raw or "गेहूं" in msg_raw or "कनक" in msg_raw: crop = "Wheat"
        elif "potato" in msg_raw or "आलू" in msg_raw or "aloo" in msg_raw: crop = "Potato"
        elif "paddy" in msg_raw or "धान" in msg_raw: crop = "Paddy"
        elif "gram" in msg_raw or "चना" in msg_raw: crop = "Gram"

        # Check for numeric amount
        raw_num = 4.0
        for p in parts[1:]:
            clean_p = p.replace("bori", "").replace("बोरी", "").replace("bags", "").replace("qtl", "").strip()
            try:
                raw_num = float(clean_p)
                break
            except ValueError:
                continue

        # Convert bags to quintals if specified
        if any(unit in msg_raw for unit in ["bori", "बोरी", "bag", "कट्टे", "katte"]):
            qty = max(0.5, round(raw_num * 0.5, 1))
            bags = int(raw_num)
        else:
            qty = max(0.5, round(raw_num, 1))
            bags = int(round(qty * 2))

        lot = create_lot(phone, crop, qty, channel="telegram_bot")
        reply = (
            f"✅ *बधाई! आपकी फसल पूलिंग में दर्ज हो गई है!*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"📦 लॉट #{lot['lot_id']}\n"
            f"🌾 *फसल:* {lot['crop']} ({lot['quantity_quintals']:.1f} क्विंटल / {lot['bags_count']} बोरी)\n"
            f"🚚 *गाड़ी:* Mahindra Bolero Maxi Truck\n"
            f"💰 *अतिरिक्त मुनाफा:* +₹{lot['extra_profit_rs']:.0f} (बिचौलिये से बचाई रकम!)"
        )
        options = [
            {"label": "📦 मेरा स्टॉक देखें", "cmd": "/mystock"},
            {"label": "🚿 ट्यूबवेल सलाह", "cmd": f"/tubewell {crop.lower()}"},
            {"label": f"📈 {crop} मंडी भाव", "cmd": f"/mandi {crop.lower()}"},
            {"label": "🌾 एक और फसल जोड़ें", "cmd": "/addlot_start"}
        ]
    elif cmd in ["/photo", "/scan", "/disease", "/doctor"]:
        image_b64 = data.get("image_base64")
        if image_b64:
            # Autonomous zero-memory vision diagnosis
            try:
                if "," in image_b64:
                    image_b64 = image_b64.split(",", 1)[1]
                img_bytes = base64.b64decode(image_b64)
            except Exception:
                img_bytes = None
            diag = analyze_crop_leaf_disease(image_bytes=img_bytes, crop_hint=data.get("crop"))
            crop_hint = diag.get("crop", "Mustard")
            disease = diag.get("disease", "White Rust")
        else:
            raw_target = (parts[1] if len(parts) > 1 else data.get("crop", "")).strip().lower()
            if not raw_target:
                # 5-Crop Menu Prompt
                reply = (
                    f"🌿 *ICAR AI फसल डॉक्टर व कीटनाशक सलाह*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"नीचे दिए 5 मुख्य फसलों में से अपनी फसल चुनें, या कैमरे से सीधे पत्ती की फोटो अपलोड करें (AI Vision अपने-आप फसल और रोग पहचान लेगा):"
                )
                options = [
                    {"label": "🟡 सरसों (Mustard)", "cmd": "/photo mustard"},
                    {"label": "🌾 गेहूँ (Wheat)", "cmd": "/photo wheat"},
                    {"label": "🥔 आलू (Potato)", "cmd": "/photo potato"},
                    {"label": "🌾 धान (Paddy)", "cmd": "/photo paddy"},
                    {"label": "🌱 चना (Gram)", "cmd": "/photo gram"}
                ]
                return jsonify({
                    "status": "SUCCESS",
                    "command": command_text,
                    "reply": reply,
                    "audio_base64": None,
                    "options": options,
                    "farmer_name": farmer_name,
                    "phone": phone
                })

            if "wheat" in raw_target or "गेहूं" in raw_target or "कनक" in raw_target:
                crop_hint = "Wheat"
                disease = data.get("disease") or (parts[2] if len(parts) > 2 else "Yellow Rust")
            elif "potato" in raw_target or "आलू" in raw_target:
                crop_hint = "Potato"
                disease = data.get("disease") or (parts[2] if len(parts) > 2 else "Late Blight")
            elif "paddy" in raw_target or "धान" in raw_target:
                crop_hint = "Paddy"
                disease = data.get("disease") or (parts[2] if len(parts) > 2 else "Brown Planthopper")
            elif "gram" in raw_target or "चना" in raw_target:
                crop_hint = "Gram"
                disease = data.get("disease") or (parts[2] if len(parts) > 2 else "Pod Borer")
            else:
                crop_hint = "Mustard"
                disease = data.get("disease") or (parts[2] if len(parts) > 2 else "Aphids / Mahu")

        from core.advisory import get_prescription
        presc = get_prescription(crop=crop_hint, disease=disease)
        reply = (
            f"📸 *फसल पत्ती रोग जांच रिपोर्ट (ICAR AI Doctor)*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🌾 *फसल:* {crop_hint}\n"
            f"🦠 *पहचानी गई बीमारी:* *{presc['disease_name']}*\n"
            f"🧪 *असली टेक्निकल साल्ट:* `{presc['chemical_salt']}`\n"
            f"⚖️ *15L ढोलकी नाप:* *{presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}*\n"
            f"💰 *अनुमानित खर्च:* जेनेरिक {presc.get('generic_price', '₹180')} vs ब्रांडेड {presc.get('brand_price', '₹850')} (*~{presc.get('savings_pct', 75)}% बचत*)\n"
            f"🌱 *जैविक विकल्प:* {presc.get('organic_alternative_hi', 'नीम का तेल (10,000 PPM)')}\n\n"
            f"⚠️ *सुरक्षा चेतावनी:* {presc['warning_hi']}"
        )
        options = [
            {"label": "🟡 सरसों (Mustard)", "cmd": "/photo mustard"},
            {"label": "🌾 गेहूँ (Wheat)", "cmd": "/photo wheat"},
            {"label": "🥔 आलू (Potato)", "cmd": "/photo potato"},
            {"label": "🌾 धान (Paddy)", "cmd": "/photo paddy"},
            {"label": "🌱 चना (Gram)", "cmd": "/photo gram"}
        ]
    elif cmd == "/truckstatus":
        pool = get_active_pool() or state.active_pool
        reply = (
            f"🚛 *महिंद्रा बोलेरो - कृषि मिल्क-रन ट्रैकिंग*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🚚 *वाहन:* {pool.get('transporter', 'Mahindra Bolero Maxi Truck')} (HR-12-AE-8419)\n"
            f"👤 *ड्राइवर:* बलजीत सिंह (+91 94160 88219)\n"
            f"⏱️ *कट-ऑफ विंडो:* आज शाम 6:00 बजे | *प्रस्थान:* कल सुबह 07:00 बजे रोहतक हब से\n"
            f"🛣️ *मिल्क-रन रूट टाइमलाइन:*\n"
            f"  1. दिनेश छिल्लर (कल सुबह 07:15 - 07:45 AM)\n"
            f"  2. सुरेश कुमार (कल सुबह 08:00 - 08:30 AM)\n"
            f"  3. आपका खेत (कल सुबह 08:45 - 09:15 AM)\n"
            f"  ➔ आज़ादपुर APMC मंडी: कल सुबह 10:45 AM (नीलामी पूर्व)\n\n"
            f"📊 *बोलेरो लोड:* {pool.get('capacity_percentage', 73.3)}% ({pool.get('status', 'ACCEPTING_LOTS')})"
        )
        options = [
            {"label": "✅ पिकअप स्वीकार करें", "cmd": "/accept"},
            {"label": "⏳ पिकअप टालें (₹0)", "cmd": "/reject"},
            {"label": "📦 मेरा स्टॉक", "cmd": "/mystock"}
        ]
    elif cmd == "/modlot":
        if len(parts) >= 3:
            lot_id = parts[1]
            qty = float(parts[2])
            updated = update_lot_quantity(lot_id, qty)
            reply = f"✅ लॉट #{lot_id} अपडेट हो गया: अब {updated['quantity_quintals']:.1f} क्विंटल ({updated['bags_count']} बोरी) दर्ज है।"
        else:
            reply = "⚠️ कृपया सही प्रारूप लिखें: `/modlot [lot_id] [नया_क्विंटल]`"
        options = [{"label": "📦 मेरा स्टॉक", "cmd": "/mystock"}]
    elif cmd == "/dellot":
        if len(parts) >= 2:
            lot_id = parts[1]
            success = delete_lot(lot_id)
            if success:
                reply = f"✅ लॉट #{lot_id} हटा दिया गया है। ₹0 पेनाल्टी सुरक्षित है।"
            else:
                reply = f"⚠️ लॉट #{lot_id} नहीं मिला।"
        else:
            reply = "⚠️ कृपया सही प्रारूप लिखें: `/dellot [lot_id]`"
        options = [{"label": "📦 मेरा स्टॉक", "cmd": "/mystock"}, {"label": "🌾 नई फसल जोड़ें", "cmd": "/addlot_start"}]
    elif cmd == "/accept":
        user_lots = get_user_lots(phone)
        lot_id = parts[1] if len(parts) > 1 else (user_lots[0]["lot_id"] if user_lots else None)
        if lot_id:
            update_lot_status(lot_id, "ACCEPTED")
            reply = f"✅ लॉट #{lot_id} का पिकअप स्वीकार कर लिया गया है। बोलेरो पिकअप लॉक हो गया है।"
        else:
            reply = "⚠️ कोई लॉट नहीं मिला।"
        options = [{"label": "📦 मेरा स्टॉक", "cmd": "/mystock"}]
    elif cmd in ["/verify", "/contact"]:
        target_phone = parts[1] if len(parts) > 1 else phone
        update_user_telegram(target_phone, "tg_verified_" + str(int(time.time())), "@" + farmer_name.lower().replace(" ", "_"))
        reply = (
            f"📱 *सत्यापन सफल (Phone Verified)* ✅\n\n"
            f"• मोबाइल नंबर: `{target_phone}`\n"
            f"• किसान: {farmer_name}\n"
            f"• KhetPin: `{khet_pin}` ({village})\n\n"
            f"अब आप सीधे इसी चैट से मंडी भाव (/mandi) और लॉट जोड़ सकते हैं (/addlot 10 बोरी गेहूँ)।"
        )
        options = [
            {"label": "🌾 फसल जोड़ें", "cmd": "/addlot_start"},
            {"label": "📈 मंडी भाव", "cmd": "/mandi"}
        ]
    elif cmd in ["/location", "/pin", "/geosync"]:
        try:
            lat = float(parts[1]) if len(parts) > 1 else 28.8942
            lng = float(parts[2]) if len(parts) > 2 else 76.6021
        except Exception:
            lat, lng = 28.8942, 76.6021
        from core.khetpin import generate_khet_pin
        new_pin = generate_khet_pin(lat, lng, state_code="HR", district_code="ROH")
        khet_pin = new_pin["khet_pin"]
        with get_connection() as conn:
            conn.execute("UPDATE users SET khet_pin = ? WHERE phone = ?;", (khet_pin, phone))
            conn.commit()
        reply = (
            f"📍 *खेत लोकेशन पिन अपडेट हो गई!*\n\n"
            f"• नया KhetPin: `{khet_pin}`\n"
            f"• GPS निर्देशांक: {lat:.4f}° N, {lng:.4f}° E\n"
            f"• पक्की सड़क टर्नऑफ: {new_pin['snapped_turnoff']['paved_road_name']}\n"
            f"• अनमैप्ड कच्चा रास्ता: ~{new_pin['snapped_turnoff']['unmapped_dirt_distance_meters']} मीटर"
        )
        options = [
            {"label": "🌾 फसल जोड़ें", "cmd": "/addlot_start"},
            {"label": "🚿 ट्यूबवेल सलाह", "cmd": "/tubewell"}
        ]
    else:
        # Dynamic vernacular text & voice transcript router
        parsed = parse_voice_dialect_intent(command_text)
        intent = parsed.get("intent", "CROP_LOT")
        crop = parsed.get("crop", "Mustard")
        transcript = parsed.get("transcription") or command_text

        if intent == "TUBEWELL":
            from core.tubewell import calculate_tubewell_advisory
            res = calculate_tubewell_advisory(crop=crop, village=village, acres=1.0)
            spoken_text = res.get("voice_text_hi") or res["headline_hi"]
            reply = (
                f"🎙️ *आवाज़/संदेश समझा गया:* \"{transcript}\"\n\n"
                f"🚿 *{res['crop_hindi']} - आज का ट्यूबवेल सुझाव*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"⏱️ *सुझाव:* *{res['headline_hi']}*\n"
                f"💡 *कारण:* {res['reason_hi']}\n\n"
                f"⚡ *कृषि 3-फेज बिजली:* {res['power_roster']['active_slot']}\n"
                f"🌱 *बचत:* ~{res['groundwater_saved_liters']:,} लीटर भूजल व {res['electricity_units_saved_kwh']} यूनिट बिजली की बचत!"
            )
            options = [
                {"label": f"🌾 {crop} पूलिंग में जोड़ें", "cmd": f"/lotcrop {crop.lower()}"},
                {"label": "📈 मंडी भाव देखें", "cmd": f"/mandi {crop.lower()}"}
            ]

        elif intent == "MANDI":
            p = get_mandi_price(crop)
            diff = p['modal_price'] - p.get('local_trader_price', 4700)
            spoken_text = f"आज {crop} का आज़ादपुर मंडी भाव ₹{p['modal_price']} है। खेतOS से आपको ₹{diff} प्रति क्विंटल का सीधा अतिरिक्त मुनाफा होगा।"
            reply = (
                f"🎙️ *आवाज़/संदेश समझा गया:* \"{transcript}\"\n\n"
                f"📈 *आज का {crop} मंडी भाव*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🏛️ *आज़ादपुर APMC मंडी:* ₹{p['modal_price']} / क्विंटल\n"
                f"🏘️ *गांव का स्थानीय आढ़ती:* ₹{p.get('local_trader_price', 4700)} / क्विंटल\n"
                f"💰 *KhetOS से सीधा मुनाफा:* *+₹{diff}/क्विंटल*\n"
                f"🛡️ *शून्य पेनाल्टी पूलिंग:* सीधे खेत से महिंद्रा बोलेरो पिकअप!"
            )
            options = [
                {"label": f"🌾 {crop} गाड़ी में लोड कराएं", "cmd": f"/lotcrop {crop.lower()}"},
                {"label": "🚿 सिंचाई सलाह", "cmd": f"/tubewell {crop.lower()}"}
            ]

        elif intent == "PESTICIDE_DOCTOR":
            disease_query = parsed.get("pest_or_disease") or "Aphids / Mahu"
            presc = get_prescription(crop=crop, disease=disease_query)
            spoken_text = f"{crop} में {presc['disease_name']} के लिए {presc['chemical_salt']} का छिड़काव करें। {presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}।"
            reply = (
                f"🎙️ *आवाज़/संदेश समझा गया:* \"{transcript}\"\n\n"
                f"🌿 *ICAR AI फसल डॉक्टर व कीटनाशक सलाह*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🌾 *फसल:* {crop}\n"
                f"🦠 *कीट/बीमारी:* *{presc['disease_name']}*\n"
                f"🧪 *असली टेक्निकल साल्ट:* `{presc['chemical_salt']}`\n"
                f"⚖️ *15L ढोलकी नाप:* *{presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}*\n"
                f"💰 *खर्च:* जेनेरिक {presc.get('generic_price', '₹180')} vs ब्रांडेड {presc.get('brand_price', '₹850')} (*~{presc.get('savings_pct', 75)}% बचत*)\n"
                f"🌱 *जैविक विकल्प:* {presc.get('organic_alternative_hi', 'नीम का तेल')}\n\n"
                f"⚠️ *सुरक्षा चेतावनी:* {presc['warning_hi']}"
            )
            options = [
                {"label": "🌾 अन्य रोग सलाह", "cmd": "/photo"},
                {"label": "🚿 ट्यूबवेल सलाह", "cmd": f"/tubewell {crop.lower()}"}
            ]

        elif intent == "TRUCK_TRACKING":
            pool = get_active_pool() or state.active_pool
            spoken_text = "बोलेरो गाड़ी का रूट कल सुबह 7 बजे शुरू होगा। आपका पिकअप स्लॉट कल सुबह 8:45 से 9:15 बजे निर्धारित है।"
            reply = (
                f"🎙️ *आवाज़/संदेश समझा गया:* \"{transcript}\"\n\n"
                f"🚛 *महिंद्रा बोलेरो - कृषि मिल्क-रन ट्रैकिंग*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🚚 *वाहन:* {pool.get('transporter', 'Mahindra Bolero Maxi Truck')} (HR-12-AE-8419)\n"
                f"👤 *ड्राइवर:* बलजीत सिंह (+91 94160 88219)\n"
                f"⏱️ *कट-ऑफ विंडो:* आज शाम 6:00 बजे | *प्रस्थान:* कल सुबह 07:00 बजे रोहतक हब से\n"
                f"🛣️ *मिल्क-रन रूट टाइमलाइन:*\n"
                f"  1. दिनेश छिल्लर (कल सुबह 07:15 - 07:45 AM)\n"
                f"  2. सुरेश कुमार (कल सुबह 08:00 - 08:30 AM)\n"
                f"  3. आपका खेत (कल सुबह 08:45 - 09:15 AM)\n"
                f"  ➔ आज़ादपुर APMC मंडी: कल सुबह 10:45 AM (नीलामी पूर्व)\n\n"
                f"📊 *बोलेरो लोड:* {pool.get('capacity_percentage', 73.3)}% ({pool.get('status', 'ACCEPTING_LOTS')})"
            )
            options = [
                {"label": "✅ पिकअप स्वीकार करें", "cmd": "/accept"},
                {"label": "⏳ पिकअप टालें (₹0)", "cmd": "/reject"},
                {"label": "📦 मेरा स्टॉक", "cmd": "/mystock"}
            ]

        else:
            # Default: CROP_LOT
            bags = parsed.get("bags_count", 8)
            qty = parsed.get("quantity_quintals", round(bags * 0.5, 1))
            lot = create_lot(phone, crop, qty, channel="telegram_bot")
            pool = get_active_pool() or state.active_pool
            cap_pct = pool.get('capacity_percentage', 80.0)
            status_label = "डिस्पैच लॉक (100% Full)" if cap_pct >= 99 else "पूलिंग जारी (Accepting Lots)"

            spoken_text = f"बधाई {farmer_name} जी! आपका {lot['bags_count']} बोरी ({qty} क्विंटल {crop}) दर्ज हो गया है। आपका पिकअप स्लॉट कल सुबह 8:45 से 9:15 बजे है।"
            reply = (
                f"🎙️ *आवाज़/संदेश समझा गया:* \"{transcript}\"\n\n"
                f"✅ *बधाई {farmer_name} जी! आपकी फसल पूलिंग में दर्ज हो गई!*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📦 *लॉट आईडी:* `#{lot['lot_id']}`\n"
                f"🌾 *फसल:* {lot['crop']} ({lot['quantity_quintals']:.1f} क्विंटल / {lot['bags_count']} बोरी)\n"
                f"🚚 *गाड़ी:* Mahindra Bolero Maxi Truck (HR-12-AE-8419)\n"
                f"⏱️ *पिकअप स्लॉट:* कल सुबह 08:45 - 09:15 बजे (एग्री मिल्क-रन)\n"
                f"📊 *बोलेरो लोड:* {cap_pct}% ({status_label})\n"
                f"💰 *अतिरिक्त मुनाफा:* +₹{lot['extra_profit_rs']:.0f} (बिचौलिये से बचाई रकम!)\n\n"
                f"📍 *कट-ऑफ:* आज शाम 6:00 बजे | *रूट प्रस्थान:* कल सुबह 07:00 बजे"
            )
            options = [
                {"label": "📦 मेरा स्टॉक देखें", "cmd": "/mystock"},
                {"label": "🚿 ट्यूबवेल सलाह", "cmd": f"/tubewell {crop.lower()}"},
                {"label": "🚛 गाड़ी स्थिति", "cmd": "/truckstatus"}
            ]

    # Clean markdown formatting for natural neural Hindi speech
    if not spoken_text:
        clean_speech_text = (
            reply.replace("*", "")
                 .replace("•", "")
                 .replace("`", "")
                 .replace("━━━━━━━━━━━━━━━━━━", "")
                 .replace("\n\n", " ")
        )
        import re
        clean_speech_text = re.sub(r'[\U00010000-\U0010ffff]', '', clean_speech_text)
        spoken_text = clean_speech_text[:120].strip()

    audio_bytes = generate_hindi_audio(spoken_text)
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None

    return jsonify({
        "status": "SUCCESS",
        "command": command_text,
        "reply": reply,
        "audio_base64": audio_b64,
        "options": options,
        "farmer_name": farmer_name,
        "phone": phone
    })

# --- Telegram Bot Background Long-Polling Daemon ---
from adapters.telegram_bot import start_telegram_bot_daemon

if __name__ == "__main__":
    # Auto-launch daemon thread if enabled (default True)
    if os.getenv("ENABLE_TELEGRAM_DAEMON", "1").strip().lower() in ["1", "true", "yes"]:
        try:
            start_telegram_bot_daemon()
            print("[KhetOS] Background Telegram bot daemon thread successfully initialized.")
        except Exception as e:
            print(f"[Warning] Failed to start Telegram Bot daemon: {e}")

    print(f"[KhetOS] Central API Engine running on http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)

