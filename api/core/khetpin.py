from openlocationcode import openlocationcode as olc

def generate_khet_pin(lat, lng, state_code="HR", district_code="ROH"):
    """
    Encodes GPS coordinates into an open KhetPin standard.
    Format: [State]-[District]-[5-Char MicroGrid]
    Example: HR-ROH-78G4
    """
    try:
        full_code = olc.encode(lat, lng, codeLength=10)
        # Extract the last 5 characters of the Plus Code for human friendliness
        short_suffix = full_code[-5:].replace("+", "")
        khet_pin = f"{state_code}-{district_code}-{short_suffix}"
    except Exception as e:
        print(f"[Warning] Plus Code encoding failed: {e}")
        khet_pin = f"{state_code}-{district_code}-78G4"

    # Simulated PMGSY paved road turnoff point (within 1.2 km of the farm gate)
    snapped_turnoff = {
        "paved_road_name": f"{district_code} Rural Link Road (KM 3.8)",
        "turnoff_lat": round(lat + 0.008, 5),
        "turnoff_lng": round(lng - 0.005, 5),
        "unmapped_dirt_distance_meters": 850
    }

    return {
        "khet_pin": khet_pin,
        "gps": {"latitude": lat, "longitude": lng},
        "snapped_turnoff": snapped_turnoff,
        "voice_breadcrumb_prompt": "बड़ के पेड़ से नहर की पटरी पकड़ के ट्यूबवेल के सामने आ जाना।"
    }
