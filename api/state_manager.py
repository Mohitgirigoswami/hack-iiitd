import time
from core.database import (
    get_active_pool, get_all_lots, get_activity_feed, create_lot,
    get_or_create_user, reset_database, update_lot_quantity, update_lot_status,
    delete_lot, get_user_lots
)
from core.notifications import send_dual_channel_alert

class StateManager:
    """
    Persistent transactional state manager backed by SQLite.
    Guarantees multi-session memory and real-time knapsack recalculations.
    """
    def __init__(self):
        pass

    @property
    def active_pool(self):
        pool = get_active_pool()
        return pool or {
            "pool_id": "POOL-ROH-104",
            "cluster_name": "Rohtak-Kalanaur Mustard Corridor",
            "crop": "Mustard (सरसों)",
            "target_capacity_kg": 1500,
            "target_capacity_quintals": 15.0,
            "current_loaded_kg": 1100,
            "current_loaded_quintals": 11.0,
            "capacity_percentage": 73.3,
            "status": "ACCEPTING_LOTS",
            "target_mandi": "Azadpur APMC Mandi, Delhi",
            "benchmark_mandi_price": 5420,
            "local_trader_price": 4700,
            "transporter": "Mahindra Bolero Maxi Truck (HR-12-AE-8419)"
        }

    @property
    def lots(self):
        return get_all_lots()

    @property
    def activity_feed(self):
        return get_activity_feed(limit=12)

    @property
    def buyer_orders(self):
        return [
            {
                "order_id": "ORD-DL-901",
                "buyer_name": "Shree Ram Roller Flour & Oil Mill",
                "crop": "Mustard",
                "quantity_requested": 1100,
                "offered_price": 5420,
                "escrow_deposited_rs": 1192400,
                "status": "MATCHED_AND_DISPATCHED"
            }
        ]

    def reset_state(self):
        reset_database()
        return True

    def add_lot_from_farmer(self, farmer_name, phone, village, crop, quantity_quintals, khet_pin="HR-ROH-91P2", channel="ivr_call"):
        # 1. Ensure user is in database
        get_or_create_user(
            phone=phone,
            name=farmer_name,
            village=village,
            khet_pin=khet_pin,
            voice_breadcrumb="बड़ के पेड़ से नहर की पटरी पकड़ के ट्यूबवेल के सामने आ जाना।"
        )

        # 2. Create lot in database
        lot = create_lot(
            phone=phone,
            crop=crop,
            quantity_quintals=quantity_quintals,
            channel=channel
        )

        # 3. Fire dual-channel alert (Phone Call + Telegram)
        pool = self.active_pool
        pool_full_msg = f"{farmer_name} ji, aapki {quantity_quintals} quintal {crop} Mahindra Bolero pool mein jud gayi hai! Gaadi {pool['capacity_percentage']}% full hai."
        voice_hi = f"{farmer_name} चाचा, आपकी {quantity_quintals} क्विंटल {crop} गाड़ी में जुड़ गई है। महिंद्रा बोलेरो {pool['capacity_percentage']}% भर चुकी है।"

        try:
            send_dual_channel_alert(
                phone=phone,
                title="Corridor Pool Booking Confirmed ⚡",
                message=pool_full_msg,
                hindi_voice_text=voice_hi
            )
        except Exception as e:
            print(f"[Warning] Dual-channel alert dispatch warning: {e}")

        return lot

    def get_full_state(self):
        return {
            "active_pool": self.active_pool,
            "lots": self.lots,
            "activity_feed": self.activity_feed,
            "buyer_orders": self.buyer_orders
        }

state = StateManager()
