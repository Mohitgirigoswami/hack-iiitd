import os
import time
import base64
import json
import urllib.request
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv

from core.mandi_prices import get_mandi_price
from core.advisory import get_prescription, generate_hindi_audio
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
    get_stakeholders_directory, schedule_backhaul_date_db
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
            f"अपने लॉट का स्टॉक बदलने के लिए 3 दबाएं।"
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
    Supports persistent caller profiles and dynamic stock.
    """
    data = request.get_json(silent=True) or {}
    digit = str(data.get("digit", "2"))
    caller_phone = data.get("caller_phone", "+91 98123 45099").strip()
    
    user = get_user(caller_phone)
    if not user:
        farmer_name = data.get("farmer_name", "Ramu Sharma")
        village = data.get("village", "Najafgarh")
        user = get_or_create_user(caller_phone, name=farmer_name, village=village)
    else:
        farmer_name = user["name"]
        village = user["village"]

    if digit == "2":
        # Pool lot or confirm pickup
        lot = state.add_lot_from_farmer(
            farmer_name=farmer_name,
            phone=caller_phone,
            village=village,
            crop="Mustard",
            quantity_quintals=4.0,
            khet_pin=user.get("khet_pin", "HR-ROH-91P2"),
            channel="ivr_call"
        )
        hindi_reply = f"{farmer_name} जी, आपकी 4 क्विंटल सरसों गाड़ी में जुड़ गई है। महिंद्रा बोलेरो 100% भर चुकी है और आज़ादपुर मंडी के लिए रवाना हो रही है।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "POOL_JOINED_SUCCESS",
            "digit": "2",
            "message": "Lot added to Bolero pool!",
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64,
            "lot": lot,
            "current_pool": state.active_pool
        })
    elif digit == "1":
        price = get_mandi_price("Mustard")
        hindi_reply = f"आज आज़ादपुर मंडी में सरसों का भाव ₹{price['modal_price']} प्रति क्विंटल है। गांव के आढ़ती से ₹720 ज्यादा।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "PRICE_FETCHED",
            "digit": "1",
            "price_data": price,
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64
        })
    elif digit == "3":
        # Stock management menu via keypad
        user_lots = get_user_lots(caller_phone)
        total_qtl = sum(l["quantity_quintals"] for l in user_lots)
        hindi_reply = f"{farmer_name} जी, आपके खाते में कुल {len(user_lots)} लॉट ({total_qtl} क्विंटल) दर्ज हैं। स्टॉक 1 क्विंटल बढ़ाने के लिए 31 दबाएं। 1 क्विंटल घटाने के लिए 32 दबाएं। लॉट हटाने के लिए 33 दबाएं।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "STOCK_SUBMENU",
            "digit": "3",
            "user_lots": user_lots,
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64
        })
    elif digit == "31":
        # Multi-key 31: Increment stock by 1 quintal
        user_lots = get_user_lots(caller_phone)
        if user_lots:
            target_lot = user_lots[0]
            updated = update_lot_quantity(target_lot["lot_id"], target_lot["quantity_quintals"] + 1.0)
            hindi_reply = f"{farmer_name} जी, आपका लॉट 1 क्विंटल बढ़ा दिया गया है। कुल {updated['quantity_quintals']} क्विंटल ({updated['bags_count']} बोरी) दर्ज हो गया है।"
            send_dual_channel_alert(
                phone=caller_phone,
                title="Stock Increased (+1 Qtl) 📦",
                message=f"Phone Call IVR Key 31: Lot #{target_lot['lot_id']} updated to {updated['quantity_quintals']} Qtl ({updated['bags_count']} bags).",
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
        # Multi-key 32: Decrement stock by 1 quintal
        user_lots = get_user_lots(caller_phone)
        if user_lots:
            target_lot = user_lots[0]
            new_qty = max(1.0, target_lot["quantity_quintals"] - 1.0)
            updated = update_lot_quantity(target_lot["lot_id"], new_qty)
            hindi_reply = f"{farmer_name} जी, आपका लॉट 1 क्विंटल घटा दिया गया है। अब कुल {updated['quantity_quintals']} क्विंटल दर्ज है।"
            send_dual_channel_alert(
                phone=caller_phone,
                title="Stock Decreased (-1 Qtl) 📦",
                message=f"Phone Call IVR Key 32: Lot #{target_lot['lot_id']} reduced to {updated['quantity_quintals']} Qtl ({updated['bags_count']} bags).",
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
        # Multi-key 33: Delete / cancel lot completely with 0 penalty
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
    else:
        hindi_reply = "कृपया सही बटन दबाएं। मंडी भाव के लिए 1, गाड़ी पूलिंग के लिए 2, स्टॉक बदलने के लिए 3।"
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
    if request.is_json:
        json_data = request.get_json(silent=True) or {}
        crop = json_data.get("crop", "Mustard")
        b64_data = json_data.get("image_base64")
        image_bytes = None
        if b64_data:
            try:
                image_bytes = base64.b64decode(b64_data)
            except Exception:
                image_bytes = None
    else:
        crop = request.form.get("crop", "Mustard")
        file = request.files.get("image")
        image_bytes = file.read() if file else None

    diagnosis = analyze_crop_leaf_disease(image_bytes=image_bytes, crop_hint=crop)
    prescription = get_prescription(crop=crop, disease=diagnosis["disease"])
    hindi_text = f"आपकी {crop} की फसल में {prescription['disease_name']} के लक्षण हैं। इसके लिए {prescription['chemical_salt']} का छिड़काव करें। नाप: {prescription['dosage_hi']}। {prescription['warning_hi']}"

    audio_bytes = generate_hindi_audio(hindi_text)
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None

    return jsonify({
        "diagnosis": diagnosis,
        "prescription": prescription,
        "spoken_text_hi": hindi_text,
        "audio_base64": audio_b64
    })

@app.route("/api/driver/inspect", methods=["POST"])
def driver_inspect_lot():
    data = request.get_json(silent=True) or {}
    lot_id = data.get("lot_id")
    action = data.get("action", "APPROVE")

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

    if cmd in ["/start", "/help"]:
        reply = (
            f"🌾 नमस्ते {farmer_name} जी!\n"
            f"KhetOS (खेतOS) किसान सहायता बॉट में आपका स्वागत है।\n\n"
            f"📍 आपका खेतपिन: `{khet_pin}` ({village})\n"
            f"📱 फोन CLI: `{phone}` (स्वचालित प्रमाणित)\n\n"
            f"उपलब्ध कमांड्स:\n"
            f"• `/mandi` - आज का मंडी भाव (आज़ादपुर vs स्थानीय)\n"
            f"• `/mystock` - आपके सक्रिय लॉट और बोरी विवरण\n"
            f"• `/addlot [मात्रा]` - नया लॉट जोड़ें (उदा. `/addlot 4`)\n"
            f"• `/modlot [lot_id] [मात्रा]` - स्टॉक अपडेट करें\n"
            f"• `/dellot [lot_id]` - लॉट हटाएं (₹0 पेनाल्टी)\n"
            f"• `/accept [lot_id]` - पिकअप स्वीकार करें\n"
            f"• `/reject [lot_id]` - पिकअप रद्द करें"
        )
    elif cmd == "/mandi":
        p = get_mandi_price("Mustard")
        reply = (
            f"📈 आज़ादपुर APMC मंडी भाव:\n"
            f"• फसल: सरसों (Mustard)\n"
            f"• मॉडल भाव: ₹{p['modal_price']} / क्विंटल\n"
            f"• भाव सीमा: ₹{p['min_price']} - ₹{p['max_price']}\n"
            f"• स्थानीय आढ़ती भाव: ₹4,700\n"
            f"✅ खेतOS पूलिंग से सीधा लाभ: +₹{p['modal_price'] - 4700}/क्विंटल"
        )
    elif cmd == "/mystock":
        lots = get_user_lots(phone)
        if not lots:
            reply = f"ℹ️ {farmer_name} जी, आपके खाते में अभी कोई सक्रिय लॉट नहीं है। नया लॉट जोड़ने के लिए `/addlot 4` लिखें।"
        else:
            lines = [f"📦 आपके सक्रिय लॉट ({len(lots)}):"]
            for l in lots:
                lines.append(f"• #{l['lot_id']}: {l['crop']} - {l['quantity_quintals']} Qtl ({l['bags_count']} बोरी) | स्थिति: {l['status']}")
            reply = "\n".join(lines)
    elif cmd == "/addlot":
        qty = float(parts[1]) if len(parts) > 1 else 4.0
        crop = parts[2] if len(parts) > 2 else "Mustard"
        lot = create_lot(phone, crop, qty, channel="telegram_bot")
        reply = f"✅ बधाई! लॉट #{lot['lot_id']} ({qty} क्विंटल {crop}) दर्ज हो गया है। 50kg की {lot['bags_count']} बोरियां बोलेरो पूल में शामिल हैं।"
    elif cmd == "/modlot":
        if len(parts) >= 3:
            lot_id = parts[1]
            qty = float(parts[2])
            updated = update_lot_quantity(lot_id, qty)
            reply = f"✅ लॉट #{lot_id} अपडेट हो गया: अब {updated['quantity_quintals']} क्विंटल ({updated['bags_count']} बोरी) दर्ज है।"
        else:
            reply = "⚠️ कृपया सही प्रारूप लिखें: `/modlot [lot_id] [नया_क्विंटल]`"
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
    elif cmd == "/accept":
        user_lots = get_user_lots(phone)
        lot_id = parts[1] if len(parts) > 1 else (user_lots[0]["lot_id"] if user_lots else None)
        if lot_id:
            update_lot_status(lot_id, "ACCEPTED")
            reply = f"✅ लॉट #{lot_id} का पिकअप स्वीकार कर लिया गया है। बोलेरो पिकअप लॉक हो गया है।"
        else:
            reply = "⚠️ कोई लॉट नहीं मिला।"
    elif cmd == "/reject":
        user_lots = get_user_lots(phone)
        lot_id = parts[1] if len(parts) > 1 else (user_lots[0]["lot_id"] if user_lots else None)
        if lot_id:
            update_lot_status(lot_id, "REJECTED_BY_FARMER")
            reply = f"✅ लॉट #{lot_id} का पिकअप रद्द कर दिया गया है। ₹0 पेनाल्टी लागू है।"
        else:
            reply = "⚠️ कोई लॉट नहीं मिला।"
    else:
        reply = f"अनजान कमांड `{command_text}`। उपलब्ध कमांड्स देखने के लिए `/help` लिखें।"

    return jsonify({
        "status": "SUCCESS",
        "command": command_text,
        "reply": reply,
        "farmer_name": farmer_name,
        "phone": phone
    })

if __name__ == "__main__":
    print(f"[KhetOS] Central API Engine running on http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
