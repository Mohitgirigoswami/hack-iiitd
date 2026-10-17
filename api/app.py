import os
import time
import base64
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv

from core.mandi_prices import get_mandi_price
from core.advisory import get_prescription, generate_hindi_audio
from core.khetpin import generate_khet_pin
from core.pooling import match_buyer_order, calculate_freight_split
from core.ai_client import parse_voice_dialect_intent, analyze_crop_leaf_disease
from core.payments import create_escrow_order
from state_manager import state

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv("PORT", 5000))

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

@app.route("/api/call/keypad", methods=["POST"])
def handle_call_keypad():
    """
    Handles telephone keypad input from the simulated phone (/call).
    Key '1' = Price Check
    Key '2' = Join Bolero Truck Pool (Adds Ramu's 4 quintals!)
    """
    data = request.get_json(silent=True) or {}
    digit = str(data.get("digit", "2"))
    farmer_name = data.get("farmer_name", "Ramu Sharma")
    village = data.get("village", "Najafgarh")

    if digit == "2":
        # Add Ramu's 4 Quintals (400 kg) to complete the 1,500 kg Bolero pool!
        lot = state.add_lot_from_farmer(
            farmer_name=farmer_name,
            phone="+91 98123 45099",
            village=village,
            crop="Mustard",
            quantity_quintals=4.0,
            khet_pin="HR-ROH-91P2",
            channel="ivr_call"
        )
        hindi_reply = "रामू चाचा, आपकी 4 क्विंटल सरसों गाड़ी में जुड़ गई है। महिंद्रा बोलेरो 100% भर चुकी है और आज़ादपुर मंडी के लिए रवाना हो रही है।"
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
    else:
        hindi_reply = "कृपया सही बटन दबाएं। मंडी भाव के लिए 1, गाड़ी पूलिंग के लिए 2।"
        audio_bytes = generate_hindi_audio(hindi_reply)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None
        return jsonify({
            "status": "UNKNOWN_DIGIT",
            "digit": digit,
            "voice_prompt_hi": hindi_reply,
            "audio_base64": audio_b64
        })

@app.route("/api/tts", methods=["POST"])
def synthesize_tts():
    """
    Synthesizes natural Hindi speech using gTTS and returns base64 MP3 audio.
    """
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
    Receives leaf photo / crop name, runs Gemini Vision,
    queries verified ICAR chemical database, and synthesizes Hindi voice note.
    """
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

    # Step 1: Vision feature extraction (constrained output)
    diagnosis = analyze_crop_leaf_disease(image_bytes=image_bytes, crop_hint=crop)

    # Step 2: Deterministic ICAR chemical prescription lookup
    prescription = get_prescription(crop=crop, disease=diagnosis["disease"])

    # Step 3: Assembly of Hindi voice explanation
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
    """
    Driver pre-loading inspection checklist (/driver).
    Approves or defers lot at the farm gate.
    """
    data = request.get_json(silent=True) or {}
    lot_id = data.get("lot_id")
    action = data.get("action", "APPROVE") # "APPROVE" or "DEFER"

    for lot in state.lots:
        if lot["lot_id"] == lot_id:
            if action == "APPROVE":
                lot["status"] = "LOADED_ON_TRUCK"
                lot["inspection_passed"] = True
                event_text = f"Driver Approved Lot #{lot_id} ({lot['farmer_name']}). Loaded into cargo bay."
            else:
                lot["status"] = "DEFERRED_FOR_SUN_DRYING"
                lot["inspection_passed"] = False
                event_text = f"Lot #{lot_id} ({lot['farmer_name']}) deferred at farm gate for sun-drying. ₹0 penalty."
            
            state.activity_feed.insert(0, {
                "timestamp": "Just now",
                "event": "INSPECTION_" + action,
                "text": event_text,
                "type": "driver"
            })
            return jsonify({"status": "SUCCESS", "lot": lot})

    return jsonify({"error": "LOT_NOT_FOUND"}), 404

@app.route("/api/buyer/order", methods=["POST"])
def place_buyer_order():
    """
    Institutional buyer order placement & hybrid knapsack matching.
    """
    data = request.get_json(silent=True) or {}
    buyer_name = data.get("buyer_name", "Shree Ram Roller Flour Mill")
    quantity_quintals = float(data.get("quantity_quintals", 1100))
    bid_price = float(data.get("bid_price", 5420))

    # Match against active lots
    match_result = match_buyer_order(state.lots, quantity_quintals)
    
    escrow_amount = round(quantity_quintals * bid_price * 0.20, 2) # 20% advance escrow
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
    state.buyer_orders.insert(0, order)

    return jsonify({"status": "ORDER_MATCHED", "order": order, "matching_details": match_result})

@app.route("/api/buyer/create-payment", methods=["POST"])
def buyer_create_payment():
    """
    Creates Razorpay Escrow order for buyer advance deposit.
    Supports live Razorpay + graceful fallback.
    """
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

if __name__ == "__main__":
    print(f"[KhetOS] Central API Engine running on http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
