import json
import os
import io
from gtts import gTTS

ICAR_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "icar_registry.json")

def load_icar_db():
    try:
        with open(ICAR_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Warning] Failed to load ICAR registry: {e}")
        return {}

def get_prescription(crop, disease):
    """
    Deterministic ICAR lookup. Zero LLM dosage hallucinations.
    """
    db = load_icar_db()
    crop_data = db.get(crop, {})
    prescription = crop_data.get(disease)
    
    if not prescription:
        # Fallback to general advice if specific disease isn't matched
        return {
            "disease_name": disease,
            "crop": crop,
            "chemical_salt": "Consult Nearest KVK (Krishi Vigyan Kendra)",
            "dosage_hi": "कृपया नजदीकी कृषि विज्ञान केंद्र के विशेषज्ञ से सलाह लें।",
            "warning_hi": "दुकानदार से कोई भी अनधिकृत रासायनिक मिश्रण न खरीदें।"
        }

    return {
        "crop": crop,
        "disease_name": prescription.get("name_hi", disease),
        "chemical_salt": prescription.get("chemical_salt"),
        "dosage": prescription.get("dosage"),
        "dosage_hi": prescription.get("dosage_hi"),
        "estimated_price": prescription.get("market_price_approx"),
        "phi_days": prescription.get("phi_days"),
        "warning_hi": prescription.get("warning_hi")
    }

def generate_hindi_audio(text):
    """
    Synthesizes Hindi voice note using gTTS.
    Returns bytes buffer.
    """
    try:
        tts = gTTS(text=text, lang="hi", slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return fp.read()
    except Exception as e:
        print(f"[Error] Audio synthesis failed: {e}")
        return None
