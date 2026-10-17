import time

class StateManager:
    def __init__(self):
        self.reset_state()

    def reset_state(self):
        # Initial seed state: 1,100 kg already loaded in the Rohtak Bolero Pool!
        # Just waiting for Ramu's 400 kg (4 quintals) to hit 100% capacity!
        self.active_pool = {
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
            "transporter": "Mahindra Bolero Pickup (HR-12-AE-8419)"
        }

        self.lots = [
            {
                "lot_id": "LOT-8921",
                "farmer_name": "Suresh Kumar",
                "phone": "+91 98123 45001",
                "village": "Bhalaut",
                "khet_pin": "HR-ROH-78G4",
                "crop": "Mustard",
                "quantity_quintals": 6.0,
                "bags_count": 12,
                "status": "LOADED_ON_TRUCK",
                "inspection_passed": True,
                "freight_share_rs": 960
            },
            {
                "lot_id": "LOT-8922",
                "farmer_name": "Dinesh Chillar",
                "phone": "+91 98123 45002",
                "village": "Kalanaur",
                "khet_pin": "HR-ROH-62K9",
                "crop": "Mustard",
                "quantity_quintals": 5.0,
                "bags_count": 10,
                "status": "LOADED_ON_TRUCK",
                "inspection_passed": True,
                "freight_share_rs": 800
            }
        ]

        self.activity_feed = [
            {
                "timestamp": "09:15 AM",
                "event": "POOL_INITIALIZED",
                "text": "Rohtak-Kalanaur Bolero Truck Pool initialized for Azadpur Mandi.",
                "type": "system"
            },
            {
                "timestamp": "09:30 AM",
                "event": "LOT_LOADED",
                "text": "Suresh Kumar loaded 12 bags (6 Qtl) at Village Bhalaut (HR-ROH-78G4).",
                "type": "lot"
            },
            {
                "timestamp": "09:45 AM",
                "event": "LOT_LOADED",
                "text": "Dinesh Chillar loaded 10 bags (5 Qtl) at Village Kalanaur (HR-ROH-62K9).",
                "type": "lot"
            }
        ]

        self.buyer_orders = [
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

    def add_lot_from_farmer(self, farmer_name, phone, village, crop, quantity_quintals, khet_pin="HR-ROH-91P2", channel="telegram"):
        lot_id = f"LOT-{int(time.time()) % 10000}"
        bags_count = int(quantity_quintals * 2)
        weight_kg = quantity_quintals * 100

        # Update pool
        new_loaded_kg = min(self.active_pool["target_capacity_kg"], self.active_pool["current_loaded_kg"] + weight_kg)
        self.active_pool["current_loaded_kg"] = new_loaded_kg
        self.active_pool["current_loaded_quintals"] = round(new_loaded_kg / 100.0, 1)
        self.active_pool["capacity_percentage"] = round((new_loaded_kg / self.active_pool["target_capacity_kg"]) * 100.0, 1)

        if self.active_pool["capacity_percentage"] >= 100.0:
            self.active_pool["status"] = "FULL_DISPATCH_LOCKED"

        # Calculate Ramu's extra profit
        local_income = quantity_quintals * self.active_pool["local_trader_price"]
        mandi_gross = quantity_quintals * self.active_pool["benchmark_mandi_price"]
        shared_freight = quantity_quintals * 120
        net_profit_extra = (mandi_gross - shared_freight) - local_income

        new_lot = {
            "lot_id": lot_id,
            "farmer_name": farmer_name,
            "phone": phone,
            "village": village,
            "khet_pin": khet_pin,
            "crop": crop,
            "quantity_quintals": quantity_quintals,
            "bags_count": bags_count,
            "status": "PENDING_DRIVER_INSPECTION" if self.active_pool["status"] != "FULL_DISPATCH_LOCKED" else "READY_FOR_DISPATCH",
            "inspection_passed": True,
            "freight_share_rs": shared_freight,
            "extra_profit_earned_rs": net_profit_extra,
            "channel": channel
        }
        self.lots.append(new_lot)

        event_text = f"{farmer_name} added {bags_count} bags ({quantity_quintals} Qtl) via {channel.upper()}! Extra profit: +₹{net_profit_extra:.0f}"
        self.activity_feed.insert(0, {
            "timestamp": time.strftime("%I:%M %p"),
            "event": "LOT_ADDED",
            "text": event_text,
            "type": "farmer"
        })

        return new_lot

    def get_full_state(self):
        return {
            "active_pool": self.active_pool,
            "lots": self.lots,
            "activity_feed": self.activity_feed[:8],
            "buyer_orders": self.buyer_orders
        }

state = StateManager()
