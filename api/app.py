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
    get_notifications, add_activity
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
        # Stock management summary via keypad
        user_lots = get_user_lots(caller_phone)
        total_qtl = sum(l["quantity_quintals"] for l in user_lots)
        hindi_reply = f"{farmer_name} जी, आपके खाते में कुल {len(user_lots)} लॉट ({total_qtl} क्विंटल) दर्ज हैं। स्टॉक बदलने के लिए वेब पोर्टल पर जाएं।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "STOCK_FETCHED",
            "digit": "3",
            "user_lots": user_lots,
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64
        })
    else:
        hindi_reply = "कृपया सही बटन दबाएं। मंडी भाव के लिए 1, गाड़ी पूलिंग के लिए 2, स्टॉक के लिए 3।"
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

if __name__ == "__main__":
    print(f"[KhetOS] Central API Engine running on http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
