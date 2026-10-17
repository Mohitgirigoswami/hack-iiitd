import os
import requests
import json
import time
from dotenv import load_dotenv

load_dotenv()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_TSPBoLOoXG6ksl")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "PDjA0tsYA8lVxWjVysRffCcl")

def create_escrow_order(amount_rs, order_id="ORD-101", notes=None):
    """
    Creates a Razorpay Escrow Order.
    If credentials are dead, inactive, or network fails -> Gracefully falls back
    to simulated escrow order so live hackathon demos never crash.
    """
    amount_paise = int(amount_rs * 100) # Razorpay accepts amounts in paise
    receipt_id = f"rcpt_{order_id}_{int(time.time())}"

    # Try live Razorpay API
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        try:
            url = "https://api.razorpay.com/v1/orders"
            payload = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt_id,
                "notes": notes or {"purpose": "KhetOS Buyer Escrow Deposit"}
            }
            auth = (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
            response = requests.post(url, json=payload, auth=auth, timeout=3.5)
            
            if response.status_code in [200, 201]:
                data = response.json()
                return {
                    "success": True,
                    "order_id": data.get("id"),
                    "amount_rs": amount_rs,
                    "amount_paise": amount_paise,
                    "currency": "INR",
                    "status": "LIVE_RAZORPAY_ESCROW_CREATED",
                    "key_id": RAZORPAY_KEY_ID,
                    "is_fallback": False
                }
            else:
                print(f"[Razorpay API Notice] HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print(f"[Razorpay Exception] {e}")

    # Seamless Fallback Mode (Ensures zero presentation crashes)
    mock_order_id = f"order_mock_{int(time.time()) % 100000}"
    return {
        "success": True,
        "order_id": mock_order_id,
        "amount_rs": amount_rs,
        "amount_paise": amount_paise,
        "currency": "INR",
        "status": "ESCROW_SIMULATED_SUCCESS",
        "key_id": RAZORPAY_KEY_ID,
        "is_fallback": True,
        "notes": "Seamless escrow fallback engaged (zero demo crash protection)"
    }
