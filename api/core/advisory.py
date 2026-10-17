import json
import os
import io
import asyncio
import edge_tts
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

_tts_cache = {}

async def _synthesize_neural_edge(text, voice="hi-IN-MadhurNeural"):
    communicate = edge_tts.Communicate(text, voice)
    data = bytearray()
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio":
            data.extend(chunk.get("data", b""))
    return bytes(data)

def generate_hindi_audio(text):
    """
    Synthesizes natural Hindi voice note using high-fidelity Microsoft Azure Neural Voice
    (ElevenLabs equivalent: hi-IN-MadhurNeural) with caching and gTTS fallback.
    Returns audio bytes.
    """
    if not text:
        return None
    if text in _tts_cache:
        return _tts_cache[text]

    # Primary: Azure Neural Voice (ElevenLabs quality, human cadence & breath)
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        data = loop.run_until_complete(_synthesize_neural_edge(text))
        loop.close()
        if data and len(data) > 0:
            _tts_cache[text] = data
            return data
    except Exception as e:
        print(f"[Warning] Neural edge-tts failed ({e}), falling back to gTTS")

    # Fallback: Google Translate TTS
    try:
        tts = gTTS(text=text, lang="hi", slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        data = fp.read()
        _tts_cache[text] = data
        return data
    except Exception as e:
        print(f"[Error] Audio synthesis fallback failed: {e}")
        return None


