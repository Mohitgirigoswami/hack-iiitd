import os
import sqlite3
import json
import time

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "khetos.db")

def get_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db(seed_if_empty=True):
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Users table (Multi-stakeholder: Farmer, Driver, Buyer, Admin)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            phone TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            village TEXT NOT NULL,
            district TEXT DEFAULT 'Rohtak',
            khet_pin TEXT NOT NULL,
            voice_breadcrumb TEXT,
            telegram_chat_id TEXT,
            telegram_username TEXT,
            role TEXT DEFAULT 'farmer',
            vehicle_model TEXT,
            vehicle_number TEXT,
            company_name TEXT,
            gstin TEXT,
            route TEXT,
            license_number TEXT,
            pin_code TEXT DEFAULT '1234',
            created_at TEXT NOT NULL
        );
        """)

        # Migration columns if table already existed
        for col_name, col_type in [
            ("vehicle_model", "TEXT"),
            ("vehicle_number", "TEXT"),
            ("company_name", "TEXT"),
            ("gstin", "TEXT"),
            ("route", "TEXT"),
            ("license_number", "TEXT"),
            ("pin_code", "TEXT DEFAULT '1234'")
        ]:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type};")
            except sqlite3.OperationalError:
                pass

        # 2. Lots table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS lots (
            lot_id TEXT PRIMARY KEY,
            phone TEXT NOT NULL,
            farmer_name TEXT NOT NULL,
            village TEXT NOT NULL,
            khet_pin TEXT NOT NULL,
            crop TEXT NOT NULL,
            quantity_quintals REAL NOT NULL,
            bags_count INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING_OFFER',
            pool_id TEXT DEFAULT 'POOL-ROH-104',
            inspection_passed INTEGER DEFAULT 1,
            freight_share_rs REAL DEFAULT 0,
            extra_profit_rs REAL DEFAULT 0,
            channel TEXT DEFAULT 'ivr_call',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (phone) REFERENCES users(phone)
        );
        """)

        # 3. Pools table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS pools (
            pool_id TEXT PRIMARY KEY,
            cluster_name TEXT NOT NULL,
            crop TEXT NOT NULL,
            target_capacity_kg REAL DEFAULT 1500,
            current_loaded_kg REAL DEFAULT 0,
            capacity_percentage REAL DEFAULT 0,
            status TEXT DEFAULT 'ACCEPTING_LOTS',
            transporter TEXT,
            route TEXT,
            target_mandi TEXT,
            benchmark_mandi_price REAL DEFAULT 5420,
            local_trader_price REAL DEFAULT 4700
        );
        """)

        # 4. Backhaul schedules table (1-Day Prior advance planning)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS backhaul_schedules (
            schedule_id TEXT PRIMARY KEY,
            transporter_phone TEXT,
            vehicle TEXT,
            corridor TEXT,
            pickup_date TEXT,
            available_capacity_kg REAL,
            booked_capacity_kg REAL,
            cargo_items_json TEXT,
            status TEXT DEFAULT 'PLANNED_1_DAY_PRIOR',
            created_at TEXT NOT NULL
        );
        """)

        # 5. Omnichannel Notifications table (Phone + Telegram)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL,
            channel TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            audio_base64 TEXT,
            status TEXT DEFAULT 'DELIVERED',
            created_at TEXT NOT NULL
        );
        """)

        # 6. Activity Feed table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_feed (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            event TEXT NOT NULL,
            text TEXT NOT NULL,
            channel TEXT DEFAULT 'system',
            type TEXT DEFAULT 'system',
            created_at TEXT NOT NULL
        );
        """)

        # 7. Buyer Orders table (Institutional Procurement & Escrow)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS buyer_orders (
            order_id TEXT PRIMARY KEY,
            buyer_name TEXT NOT NULL,
            buyer_phone TEXT,
            crop TEXT NOT NULL,
            quantity_requested REAL NOT NULL,
            bid_price REAL NOT NULL,
            escrow_deposited_rs REAL NOT NULL,
            estimated_eta TEXT,
            status TEXT DEFAULT 'AWAITING_ADMIN_DISPATCH',
            matched_lots_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 8. Trips table (Single Seeded Bolero Truck Corridor Runs)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS trips (
            trip_id TEXT PRIMARY KEY,
            corridor TEXT NOT NULL,
            vehicle TEXT NOT NULL,
            vehicle_number TEXT NOT NULL,
            driver_name TEXT NOT NULL,
            driver_phone TEXT NOT NULL,
            order_id TEXT,
            crop TEXT NOT NULL,
            total_quintals REAL NOT NULL,
            total_bags INTEGER NOT NULL,
            stops_json TEXT NOT NULL,
            current_stop_index INTEGER DEFAULT 0,
            status TEXT DEFAULT 'ASSIGNED_TO_DRIVER',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        conn.commit()

        if seed_if_empty:
            # Check if users table is empty
            cursor.execute("SELECT COUNT(*) AS cnt FROM users;")
            if cursor.fetchone()["cnt"] == 0:
                seed_initial_data(conn)
            else:
                ensure_core_stakeholders(conn)

def get_core_stakeholders_data():
    return [
        # Farmers
        ("+91 98123 45099", "Ramu Sharma", "Najafgarh", "Delhi Rural", "HR-ROH-91P2", "बड़ के पेड़ से नहर की पटरी पकड़ के ट्यूबवेल के सामने आ जाना।", "@ramu_kisan", "farmer", None, None, None, None, None, None, "1234"),
        ("+91 98123 45001", "Suresh Kumar", "Bhalaut", "Rohtak", "HR-ROH-78G4", "पक्का मोड़ से 800 मीटर कच्चा रास्ता, बिजली के खंभे के पास।", "@suresh_kisan", "farmer", None, None, None, None, None, None, "1234"),
        ("+91 98123 45002", "Dinesh Chillar", "Kalanaur", "Rohtak", "HR-ROH-62K9", "नहर पुलिया पार करके दाहिनी तरफ 500 मीटर।", "@dinesh_kisan", "farmer", None, None, None, None, None, None, "1234"),
        # Transporters (Drivers)
        ("+91 94160 88219", "Baljit Singh", "Rohtak Hub", "Rohtak", "CORR-ROH-DRV1", "Highway bypass depot", "@baljit_driver", "driver", "Mahindra Bolero Pickup (1.5T)", "HR-12-AE-8419", None, None, "Rohtak ➔ Bhalaut ➔ Kalanaur ➔ Azadpur APMC", "DL-042018009214", "1234"),
        ("+91 98188 33441", "Ravinder Gujjar", "Hapur Hub", "Hapur", "CORR-HPR-DRV2", "Toll plaza depot", "@ravinder_driver", "driver", "Tata 407 (2.5T)", "UP-14-BT-5102", None, None, "Hapur ➔ Meerut ➔ Sahibabad APMC", "DL-072019001248", "1234"),
        # Institutional Processors (Buyers)
        ("+91 98111 22334", "Anil Singhal", "Lawrence Road Industrial Area", "Delhi", "BUYER-SRF", "Gate #4 Weighbridge", "@shreeram_buyer", "buyer", None, None, "Shree Ram Flour & Oil Mill", "07AAAAA0000A1Z5", "Direct Farm-Gate Procurement (Mustard)", None, "1234"),
        ("+91 98222 44556", "Vikramaditya Roy", "Kundli Mega Food Park", "Sonipat", "BUYER-PAT", "Processing Plant #2", "@patanjali_buyer", "buyer", None, None, "Patanjali Agro Processing", "06AABCP9911D1Z2", "North India Corridor Sourcing (Wheat/Mustard)", None, "1234"),
        # Mandi Authority (Admin)
        ("+91 11 2769 1100", "Dr. Vivek Swaminathan", "Azadpur APMC Mandi", "Delhi", "APMC-ADMIN", "APMC Secretary Directorate", "@azadpur_apmc", "admin", None, None, "Azadpur Agricultural Produce Market Committee", "07APMC0000A1Z9", "North India Agri-Logistics Grid", None, "2026")
    ]

def ensure_core_stakeholders(conn):
    cursor = conn.cursor()
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    for phone, name, vil, dist, kpin, cue, tg, role, vmod, vnum, cname, gstin, route, lic, pin in get_core_stakeholders_data():
        cursor.execute("""
        INSERT OR IGNORE INTO users (
            phone, name, village, district, khet_pin, voice_breadcrumb, 
            telegram_username, role, vehicle_model, vehicle_number, 
            company_name, gstin, route, license_number, pin_code, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (phone, name, vil, dist, kpin, cue, tg, role, vmod, vnum, cname, gstin, route, lic, pin, now))
    conn.commit()

def seed_initial_data(conn):
    cursor = conn.cursor()
    now = time.strftime("%Y-%m-%d %H:%M:%S")

    # Seed registered stakeholders (Farmers, Drivers, Buyers, Admin)
    for phone, name, vil, dist, kpin, cue, tg, role, vmod, vnum, cname, gstin, route, lic, pin in get_core_stakeholders_data():
        cursor.execute("""
        INSERT OR REPLACE INTO users (
            phone, name, village, district, khet_pin, voice_breadcrumb, 
            telegram_username, role, vehicle_model, vehicle_number, 
            company_name, gstin, route, license_number, pin_code, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (phone, name, vil, dist, kpin, cue, tg, role, vmod, vnum, cname, gstin, route, lic, pin, now))

    # Seed initial active pool (73.3% capacity with Suresh & Dinesh)
    cursor.execute("""
    INSERT OR REPLACE INTO pools (
        pool_id, cluster_name, crop, target_capacity_kg, current_loaded_kg,
        capacity_percentage, status, transporter, route, target_mandi,
        benchmark_mandi_price, local_trader_price
    ) VALUES (
        'POOL-ROH-104', 'Rohtak-Kalanaur Mustard Corridor', 'Mustard (सरसों)',
        1500, 1100, 73.3, 'ACCEPTING_LOTS',
        'Mahindra Bolero Maxi Truck (HR-12-AE-8419)',
        'Rohtak ➔ Azadpur Mandi (NH-9)', 'Azadpur APMC Mandi, Delhi',
        5420, 4700
    );
    """)

    # Seed baseline lots (Suresh: 6 Qtl, Dinesh: 5 Qtl)
    lots_data = [
        ("LOT-8921", "+91 98123 45001", "Suresh Kumar", "Bhalaut", "HR-ROH-78G4", "Mustard", 6.0, 12, "LOADED_ON_TRUCK", 960, 4320, "web"),
        ("LOT-8922", "+91 98123 45002", "Dinesh Chillar", "Kalanaur", "HR-ROH-62K9", "Mustard", 5.0, 10, "LOADED_ON_TRUCK", 800, 3600, "telegram"),
    ]

    for lid, phone, name, vil, kpin, crop, qtl, bags, stat, freight, profit, chan in lots_data:
        cursor.execute("""
        INSERT OR REPLACE INTO lots (
            lot_id, phone, farmer_name, village, khet_pin, crop,
            quantity_quintals, bags_count, status, freight_share_rs,
            extra_profit_rs, channel, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (lid, phone, name, vil, kpin, crop, qtl, bags, stat, freight, profit, chan, now, now))

    # Seed 1-Day Prior advance backhaul schedule
    backhaul_items = [
        {"item": "Pashu Aahar (Mustard Cattle Feed Cake)", "category": "Feed / Byproduct", "source": "Shree Ram Oil Mill Byproduct", "destination": "Bhalaut Dairy Cooperative", "quantity_kg": 500, "bags": 10, "wholesale_rate_rs": 1850},
        {"item": "IFFCO Neem-Coated Urea", "category": "Fertilizer", "source": "Central IFFCO Wholesale Depot", "destination": "Village Bhalaut PACS Society", "quantity_kg": 400, "bags": 8, "subsidized_mrp_rs": 266},
        {"item": "Certified ICAR Seeds & Mancozeb 75% WP", "category": "Certified Input", "source": "Pusa ICAR Agricultural Extension Hub", "destination": "Khad-Beej Kendra Bhalaut", "quantity_kg": 100, "bags": 2, "saving_vs_retail_pct": 80}
    ]

    cursor.execute("""
    INSERT OR REPLACE INTO backhaul_schedules (
        schedule_id, transporter_phone, vehicle, corridor, pickup_date,
        available_capacity_kg, booked_capacity_kg, cargo_items_json, status, created_at
    ) VALUES (
        'BHL-ROH-201', '+91 98123 77001', 'Mahindra Bolero Maxi Truck (HR-12-AE-8419)',
        'Azadpur Mandi / Mill Hub ➔ Village Bhalaut PACS Cooperative',
        'Tomorrow, 02:30 PM (24h Prior Plan)', 1500, 1000, ?, 'PLANNED_1_DAY_PRIOR', ?
    );
    """, (json.dumps(backhaul_items), now))

    # Seed activity feed
    activities = [
        ("09:15 AM", "POOL_INITIALIZED", "Rohtak-Kalanaur Bolero Corridor initialized for Azadpur Mandi.", "system", "system"),
        ("09:30 AM", "LOT_LOADED", "Suresh Kumar loaded 12 bags (6 Qtl) at Village Bhalaut (HR-ROH-78G4).", "lot", "farmer"),
        ("09:45 AM", "LOT_LOADED", "Dinesh Chillar loaded 10 bags (5 Qtl) at Village Kalanaur (HR-ROH-62K9).", "lot", "farmer")
    ]
    for ts, ev, txt, chan, tp in activities:
        cursor.execute("""
        INSERT INTO activity_feed (timestamp, event, text, channel, type, created_at)
        VALUES (?, ?, ?, ?, ?, ?);
        """, (ts, ev, txt, chan, tp, now))

    conn.commit()

# --- User Profile Methods ---

def get_user(phone):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE phone = ?;", (phone,))
        row = cursor.fetchone()
        return dict(row) if row else None

def get_or_create_user(phone, name="Kisan", village="Bhalaut", district="Rohtak", khet_pin="HR-ROH-91P2", voice_breadcrumb="बड़ के पेड़ से नहर की पटरी पकड़ के आ जाना।"):
    user = get_user(phone)
    if user:
        return user
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        conn.execute("""
        INSERT INTO users (phone, name, village, district, khet_pin, voice_breadcrumb, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'farmer', ?);
        """, (phone, name, village, district, khet_pin, voice_breadcrumb, now))
        conn.commit()
    return get_user(phone)

def update_user_telegram(phone, chat_id, username=None):
    with get_connection() as conn:
        conn.execute("""
        UPDATE users SET telegram_chat_id = ?, telegram_username = ? WHERE phone = ?;
        """, (str(chat_id), username, phone))
        conn.commit()
    return get_user(phone)

# --- Lot CRUD Methods ---

def get_all_lots():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lots ORDER BY created_at DESC;")
        return [dict(r) for r in cursor.fetchall()]

def get_user_lots(phone):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lots WHERE phone = ? ORDER BY created_at DESC;", (phone,))
        return [dict(r) for r in cursor.fetchall()]

def get_lot_by_id(lot_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lots WHERE lot_id = ?;", (lot_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def create_lot(phone, crop, quantity_quintals, channel="ivr_call", target_pool_id="POOL-ROH-104"):
    user = get_user(phone)
    if not user:
        user = get_or_create_user(phone)

    lot_id = f"LOT-{int(time.time() * 1000) % 100000}"
    quantity_quintals = max(0.5, round(float(quantity_quintals), 1))
    bags_count = int(round(quantity_quintals * 2))
    shared_freight = round(quantity_quintals * 120.0, 2)

    # Dynamic crop benchmark lookup
    from core.mandi_prices import get_mandi_price
    p = get_mandi_price(crop)
    benchmark_price = float(p.get("modal_price", 5420))
    local_price = float(p.get("local_trader_price", 4700))
    extra_profit = round(((quantity_quintals * benchmark_price) - shared_freight) - (quantity_quintals * local_price), 2)
    now = time.strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as conn:
        conn.execute("""
        INSERT INTO lots (
            lot_id, phone, farmer_name, village, khet_pin, crop,
            quantity_quintals, bags_count, status, pool_id,
            inspection_passed, freight_share_rs, extra_profit_rs,
            channel, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACCEPTED', ?, 1, ?, ?, ?, ?, ?);
        """, (
            lot_id, phone, user["name"], user["village"], user["khet_pin"],
            crop, quantity_quintals, bags_count, target_pool_id,
            shared_freight, extra_profit, channel, now, now
        ))
        conn.commit()

    recalculate_active_pool()
    add_activity("LOT_CREATED", f"{user['name']} declared {bags_count} bags ({quantity_quintals:.1f} Qtl) of {crop}. Extra profit: +₹{extra_profit:.0f}", event_type="farmer", channel=channel)
    return get_lot_by_id(lot_id)

def update_lot_quantity(lot_id, new_quantity_quintals):
    lot = get_lot_by_id(lot_id)
    if not lot:
        return None
    new_quantity_quintals = max(0.5, round(float(new_quantity_quintals), 1))
    bags_count = int(round(new_quantity_quintals * 2))
    shared_freight = round(new_quantity_quintals * 120.0, 2)

    from core.mandi_prices import get_mandi_price
    p = get_mandi_price(lot.get("crop", "Mustard"))
    benchmark_price = float(p.get("modal_price", 5420))
    local_price = float(p.get("local_trader_price", 4700))
    extra_profit = round(((new_quantity_quintals * benchmark_price) - shared_freight) - (new_quantity_quintals * local_price), 2)
    now = time.strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as conn:
        conn.execute("""
        UPDATE lots SET 
            quantity_quintals = ?,
            bags_count = ?,
            freight_share_rs = ?,
            extra_profit_rs = ?,
            updated_at = ?
        WHERE lot_id = ?;
        """, (new_quantity_quintals, bags_count, shared_freight, extra_profit, now, lot_id))
        conn.commit()

    recalculate_active_pool()
    add_activity("LOT_QUANTITY_UPDATED", f"Lot #{lot_id} ({lot['farmer_name']}) stock updated to {bags_count} bags ({new_quantity_quintals:.1f} Qtl).", event_type="farmer")
    return get_lot_by_id(lot_id)

def update_lot_status(lot_id, new_status, inspection_passed=None):
    lot = get_lot_by_id(lot_id)
    if not lot:
        return None
    now = time.strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as conn:
        if inspection_passed is not None:
            conn.execute("UPDATE lots SET status = ?, inspection_passed = ?, updated_at = ? WHERE lot_id = ?;", (new_status, int(inspection_passed), now, lot_id))
        else:
            conn.execute("UPDATE lots SET status = ?, updated_at = ? WHERE lot_id = ?;", (new_status, now, lot_id))
        conn.commit()

    recalculate_active_pool()
    add_activity("LOT_STATUS_CHANGED", f"Lot #{lot_id} ({lot['farmer_name']}) status changed to {new_status}.", event_type="lot")
    return get_lot_by_id(lot_id)

def delete_lot(lot_id):
    lot = get_lot_by_id(lot_id)
    if not lot:
        return False
    with get_connection() as conn:
        conn.execute("DELETE FROM lots WHERE lot_id = ?;", (lot_id,))
        conn.commit()
    recalculate_active_pool()
    add_activity("LOT_DELETED", f"Lot #{lot_id} removed by farmer.", event_type="farmer")
    return True

# --- Pool Calculation Methods ---

def get_active_pool():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pools WHERE pool_id = 'POOL-ROH-104';")
        row = cursor.fetchone()
        return dict(row) if row else None

def recalculate_active_pool():
    with get_connection() as conn:
        cursor = conn.cursor()
        # Sum all lots that are ACCEPTED, LOADED_ON_TRUCK, or READY_FOR_DISPATCH
        cursor.execute("""
        SELECT COALESCE(SUM(quantity_quintals * 100), 0) AS total_kg
        FROM lots
        WHERE pool_id = 'POOL-ROH-104' 
          AND status IN ('ACCEPTED', 'LOADED_ON_TRUCK', 'READY_FOR_DISPATCH');
        """)
        total_kg = cursor.fetchone()["total_kg"]
        target_kg = 1500.0
        cap_pct = round(min(100.0, (total_kg / target_kg) * 100.0), 1)
        status = "FULL_DISPATCH_LOCKED" if cap_pct >= 99.5 else "ACCEPTING_LOTS"

        conn.execute("""
        UPDATE pools SET
            current_loaded_kg = ?,
            capacity_percentage = ?,
            status = ?
        WHERE pool_id = 'POOL-ROH-104';
        """, (total_kg, cap_pct, status))
        conn.commit()

# --- Backhaul 1-Day Prior Schedule Methods ---

def get_backhaul_schedules():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM backhaul_schedules ORDER BY created_at DESC;")
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            if isinstance(r.get("cargo_items_json"), str):
                try:
                    r["cargo_items"] = json.loads(r["cargo_items_json"])
                except Exception:
                    r["cargo_items"] = []
        return rows

def create_backhaul_schedule(transporter_phone, vehicle, corridor, pickup_date, available_capacity_kg, cargo_items):
    schedule_id = f"BHL-ROH-{int(time.time() * 1000) % 10000}"
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    booked_kg = sum(item.get("quantity_kg", 0) for item in cargo_items)

    with get_connection() as conn:
        conn.execute("""
        INSERT INTO backhaul_schedules (
            schedule_id, transporter_phone, vehicle, corridor, pickup_date,
            available_capacity_kg, booked_capacity_kg, cargo_items_json, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PLANNED_1_DAY_PRIOR', ?);
        """, (
            schedule_id, transporter_phone, vehicle, corridor, pickup_date,
            available_capacity_kg, booked_kg, json.dumps(cargo_items), now
        ))
        conn.commit()
    return schedule_id

# --- Notifications & Activity ---

def add_notification(phone, channel, title, message, audio_base64=None):
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO notifications (phone, channel, title, message, audio_base64, created_at)
        VALUES (?, ?, ?, ?, ?, ?);
        """, (phone, channel, title, message, audio_base64, now))
        conn.commit()
        return cursor.lastrowid

def get_notifications(phone=None, limit=25):
    with get_connection() as conn:
        cursor = conn.cursor()
        if phone:
            cursor.execute("SELECT * FROM notifications WHERE phone = ? ORDER BY id DESC LIMIT ?;", (phone, limit))
        else:
            cursor.execute("SELECT * FROM notifications ORDER BY id DESC LIMIT ?;", (limit,))
        return [dict(r) for r in cursor.fetchall()]

def add_activity(event, text, event_type="system", channel="system"):
    now_ts = time.strftime("%I:%M %p")
    created = time.strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        conn.execute("""
        INSERT INTO activity_feed (timestamp, event, text, channel, type, created_at)
        VALUES (?, ?, ?, ?, ?, ?);
        """, (now_ts, event, text, channel, event_type, created))
        conn.commit()

def get_activity_feed(limit=10):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM activity_feed ORDER BY id DESC LIMIT ?;", (limit,))
        return [dict(r) for r in cursor.fetchall()]

# --- Multi-Stakeholder Registration & Authentication ---

def register_driver(phone, name, vehicle_model, vehicle_number, route, license_number="DL-042018009214", pin_code="1234", telegram=None):
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        conn.execute("""
        INSERT OR REPLACE INTO users (
            phone, name, village, district, khet_pin, voice_breadcrumb, 
            telegram_username, role, vehicle_model, vehicle_number, route, 
            license_number, pin_code, created_at
        ) VALUES (
            ?, ?, 'Corridor Hub', 'Rohtak', 'CORR-DRV', 'Vehicle fleet terminal',
            ?, 'driver', ?, ?, ?, ?, ?, ?
        );
        """, (phone, name, telegram, vehicle_model, vehicle_number, route, license_number, pin_code, now))
        conn.commit()
    add_activity("DRIVER_ONBOARDED", f"Transporter {name} ({vehicle_model} • {vehicle_number}) registered on corridor {route}.", event_type="driver")
    return get_user(phone)

def register_buyer(phone, company_name, representative_name, gstin, location, target_crop="Mustard", pin_code="1234", telegram=None):
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        conn.execute("""
        INSERT OR REPLACE INTO users (
            phone, name, village, district, khet_pin, voice_breadcrumb, 
            telegram_username, role, company_name, gstin, route, 
            pin_code, created_at
        ) VALUES (
            ?, ?, ?, 'APMC Industrial Hub', 'BUYER-ESCROW', 'Processing facility gate',
            ?, 'buyer', ?, ?, ?, ?, ?
        );
        """, (phone, representative_name, location, telegram, company_name, gstin, f"Procuring {target_crop}", pin_code, now))
        conn.commit()
    add_activity("BUYER_ONBOARDED", f"Institutional processor {company_name} (GSTIN: {gstin}) onboarded for {target_crop}.", event_type="buyer")
    return get_user(phone)

def verify_user_credentials(phone, pin, expected_role=None):
    user = get_user(phone)
    if not user:
        return None, "User phone not registered"
    user_pin = user.get("pin_code") or "1234"
    if str(pin).strip() != str(user_pin).strip():
        return None, "Invalid PIN code"
    if expected_role and user.get("role", "").upper() != str(expected_role).upper():
        return None, f"User role mismatch: expected {expected_role}"
    user_copy = dict(user)
    user_copy["role"] = user_copy.get("role", "farmer").upper()
    return user_copy, None

def get_all_drivers():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE LOWER(role) = 'driver' ORDER BY name ASC;")
        return [dict(r) for r in cursor.fetchall()]

def get_all_buyers():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE LOWER(role) = 'buyer' ORDER BY name ASC;")
        return [dict(r) for r in cursor.fetchall()]

def get_stakeholders_directory():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users ORDER BY role, name ASC;")
        raw_users = [dict(r) for r in cursor.fetchall()]
        users = []
        for u in raw_users:
            uc = dict(u)
            uc["role"] = uc.get("role", "farmer").upper()
            users.append(uc)
        
        farmers = [u for u in users if u["role"] == "FARMER"]
        drivers = [u for u in users if u["role"] == "DRIVER"]
        buyers = [u for u in users if u["role"] == "BUYER"]
        admins = [u for u in users if u["role"] == "ADMIN"]
        
        return {
            "total_count": len(users),
            "counts": {
                "total": len(users),
                "farmers": len(farmers),
                "drivers": len(drivers),
                "buyers": len(buyers),
                "admins": len(admins)
            },
            "farmers": farmers,
            "drivers": drivers,
            "buyers": buyers,
            "admins": admins,
            "users": users,
            "all": users
        }

def schedule_backhaul_date_db(date_str, capacity_kg=1500, cargo_items=None, transporter_phone="+91 94160 88219"):
    schedule_id = f"BHL-DATE-{int(time.time())}"
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    if cargo_items is None:
        cargo_items = [
            {"item": "Pashu Aahar (Mustard Cattle Feed Cake)", "quantity_kg": 500, "destination": "Bhalaut Cooperative"},
            {"item": "IFFCO Neem-Coated Urea", "quantity_kg": 400, "destination": "PACS Society"}
        ]
    booked_kg = sum(c.get("quantity_kg", 0) for c in cargo_items)
    with get_connection() as conn:
        conn.execute("""
        INSERT INTO backhaul_schedules (
            schedule_id, transporter_phone, vehicle, corridor, pickup_date,
            available_capacity_kg, booked_capacity_kg, cargo_items_json, status, created_at
        ) VALUES (
            ?, ?, 'Mahindra Bolero Maxi Truck (HR-12-AE-8419)',
            'Azadpur APMC / Processor Hub ➔ Village Bhalaut PACS',
            ?, ?, ?, ?, 'PLANNED_1_DAY_PRIOR', ?
        );
        """, (schedule_id, transporter_phone, date_str, capacity_kg, booked_kg, json.dumps(cargo_items), now))
        conn.commit()
    add_activity("BACKHAUL_POOLED", f"Reverse Backhaul scheduled for {date_str} ({booked_kg}/{capacity_kg} kg pooled).", event_type="driver")
    return schedule_id

def reset_database():
    with get_connection() as conn:
        conn.execute("PRAGMA foreign_keys=OFF;")
        conn.execute("DROP TABLE IF EXISTS lots;")
        conn.execute("DROP TABLE IF EXISTS users;")
        conn.execute("DROP TABLE IF EXISTS pools;")
        conn.execute("DROP TABLE IF EXISTS backhaul_schedules;")
        conn.execute("DROP TABLE IF EXISTS notifications;")
        conn.execute("DROP TABLE IF EXISTS activity_feed;")
        conn.execute("DROP TABLE IF EXISTS buyer_orders;")
        conn.execute("DROP TABLE IF EXISTS trips;")
        conn.commit()
    init_db(seed_if_empty=True)

# --- Live Farm-Gate Stock Aggregator ---

def get_available_stock_summary():
    """
    Returns live aggregated stock available in the SQLite DB across all registered farmer lots.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT lot_id, phone, farmer_name, village, khet_pin, crop,
               quantity_quintals, bags_count, status, channel, created_at
        FROM lots
        WHERE status NOT IN ('SOLD_AND_SETTLED', 'CANCELLED')
        ORDER BY created_at ASC;
        """)
        lots = [dict(r) for r in cursor.fetchall()]

        by_crop = {}
        crop_hi_names = {
            "Mustard": "सरसों",
            "Wheat": "गेहूँ",
            "Potato": "आलू",
            "Paddy": "धान",
            "Gram": "चना"
        }
        for l in lots:
            c = l["crop"]
            if c not in by_crop:
                by_crop[c] = {
                    "crop": c,
                    "crop_hindi": crop_hi_names.get(c, c),
                    "total_quintals": 0.0,
                    "total_bags": 0,
                    "lots_count": 0,
                    "farmers": [],
                    "lots": []
                }
            by_crop[c]["total_quintals"] = round(by_crop[c]["total_quintals"] + float(l["quantity_quintals"]), 1)
            by_crop[c]["total_bags"] += int(l["bags_count"])
            by_crop[c]["lots_count"] += 1
            if l["farmer_name"] not in by_crop[c]["farmers"]:
                by_crop[c]["farmers"].append(l["farmer_name"])
            by_crop[c]["lots"].append(l)

        total_qtl = sum(b["total_quintals"] for b in by_crop.values())
        total_bags = sum(b["total_bags"] for b in by_crop.values())

        return {
            "status": "SUCCESS",
            "total_available_quintals": round(total_qtl, 1),
            "total_available_bags": total_bags,
            "by_crop": by_crop,
            "all_active_lots": lots
        }

# --- Buyer Orders (Demand Side) ---

def create_buyer_order(buyer_name, phone, crop, quantity_quintals, bid_price, estimated_eta, matched_lots=None):
    order_id = f"ORD-BUY-{int(time.time() * 1000) % 10000}"
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    escrow = round(float(quantity_quintals) * float(bid_price) * 0.20, 2)
    with get_connection() as conn:
        conn.execute("""
        INSERT INTO buyer_orders (
            order_id, buyer_name, buyer_phone, crop, quantity_requested,
            bid_price, escrow_deposited_rs, estimated_eta, status, matched_lots_json,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AWAITING_ADMIN_DISPATCH', ?, ?, ?);
        """, (
            order_id, buyer_name, phone, crop, float(quantity_quintals),
            float(bid_price), escrow, estimated_eta, json.dumps(matched_lots or []),
            now, now
        ))
        conn.commit()
    add_activity("BUYER_ORDER_ACCEPTED", f"Order #{order_id} ({quantity_quintals} Qtl {crop}) confirmed from {buyer_name}. ETA: {estimated_eta}.", event_type="buyer")
    return get_buyer_order(order_id)

def get_buyer_order(order_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM buyer_orders WHERE order_id = ?;", (order_id,))
        row = cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        try:
            d["matched_lots"] = json.loads(d.get("matched_lots_json") or "[]")
        except Exception:
            d["matched_lots"] = []
        return d

def get_all_buyer_orders():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM buyer_orders ORDER BY created_at DESC;")
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            try:
                r["matched_lots"] = json.loads(r.get("matched_lots_json") or "[]")
            except Exception:
                r["matched_lots"] = []
        return rows

# --- Single Seeded Bolero Truck Corridor Trips ---

def create_or_dispatch_trip(order_id=None, crop="Mustard"):
    """
    Algorithm: Selects optimal smallholder cluster to fill single seeded Bolero truck (15.0 Qtl / 30 bags)
    and sequences stops by PMGSY road waypoints.
    """
    trip_id = f"TRIP-ROH-{int(time.time() * 10) % 1000}"
    now = time.strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM lots 
        WHERE crop = ? AND status NOT IN ('SOLD_AND_SETTLED', 'CANCELLED')
        ORDER BY created_at ASC;
        """, (crop,))
        candidate_lots = [dict(r) for r in cursor.fetchall()]

    if not candidate_lots:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM lots WHERE status NOT IN ('SOLD_AND_SETTLED', 'CANCELLED');")
            candidate_lots = [dict(r) for r in cursor.fetchall()]

    stops = []
    total_qtl = 0.0
    total_bags = 0

    for idx, lot in enumerate(candidate_lots):
        stops.append({
            "stop_index": idx,
            "lot_id": lot["lot_id"],
            "farmer_name": lot["farmer_name"],
            "village": lot["village"],
            "phone": lot["phone"],
            "khet_pin": lot["khet_pin"],
            "quantity_quintals": float(lot["quantity_quintals"]),
            "bags_count": int(lot["bags_count"]),
            "status": lot["status"],
            "is_loaded": lot["status"] == "LOADED_ON_TRUCK"
        })
        total_qtl += float(lot["quantity_quintals"])
        total_bags += int(lot["bags_count"])

    with get_connection() as conn:
        conn.execute("""
        INSERT OR REPLACE INTO trips (
            trip_id, corridor, vehicle, vehicle_number, driver_name, driver_phone,
            order_id, crop, total_quintals, total_bags, stops_json,
            current_stop_index, status, created_at, updated_at
        ) VALUES (
            ?, 'Rohtak-Kalanaur ➔ Azadpur APMC Mandi',
            'Mahindra Bolero Maxi Truck', 'HR-12-AE-8419',
            'Baljit Singh', '+91 94160 88219',
            ?, ?, ?, ?, ?, 0, 'ASSIGNED_TO_DRIVER', ?, ?
        );
        """, (
            trip_id, order_id or "ORD-SRF-01", crop, round(total_qtl, 1),
            total_bags, json.dumps(stops), now, now
        ))
        if order_id:
            conn.execute("UPDATE buyer_orders SET status = 'ASSIGNED_TO_TRIP', updated_at = ? WHERE order_id = ?;", (now, order_id))
        conn.commit()

    # Dispatch official allocation notification to each farmer allocated from the portal
    for lot in candidate_lots:
        farmer_name = lot["farmer_name"]
        f_phone = lot["phone"]
        f_crop = lot["crop"]
        f_qtl = lot["quantity_quintals"]
        f_bags = lot["bags_count"]
        f_pin = lot["khet_pin"]
        f_lid = lot["lot_id"]

        alloc_msg = (
            f"🚚 *गाड़ी व पिकअप आवंटन सूचना (Trip Allocated)*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"👨‍🌾 *नमस्ते {farmer_name} जी!*\n"
            f"Mandi Command Center द्वारा आपकी फसल के लिए महिंद्रा बोलेरो गाड़ी आवंटित कर दी गई है!\n\n"
            f"📦 *लॉट आईडी:* `#{f_lid}`\n"
            f"🌾 *आवंटित फसल:* {f_crop} ({f_qtl} क्विंटल / {f_bags} बोरी)\n"
            f"🏢 *खरीदार मिल:* Shree Ram Flour & Oil Mill\n"
            f"🚚 *आवंटित वाहन:* Mahindra Bolero Maxi Truck (`HR-12-AE-8419`)\n"
            f"👤 *ड्राइवर:* बलजीत सिंह (+91 94160 88219)\n"
            f"📍 *पिकअप स्थल:* आपके KhetPin (`{f_pin}`) पर\n"
            f"⏱️ *पिकअप स्लॉट:* आज सुबह 08:45 - 09:15 बजे (एग्री मिल्क-रन)\n\n"
            f"✅ *तैयारी:* कृपया बोरियों को सूखा और डबल सिलाई करके तैयार रखें।"
        )
        spoken_hi = f"नमस्ते {farmer_name} जी! आपकी {f_bags} बोरी {f_crop} के लिए महिंद्रा बोलेरो गाड़ी आवंटित हो गई है। ड्राइवर बलजीत सिंह आपके खेतपिन पर पिकअप के लिए रवाना हो रहे हैं।"
        try:
            from core.notifications import send_dual_channel_alert
            send_dual_channel_alert(
                phone=f_phone,
                title="Mahindra Bolero Truck Allocated 🚚",
                message=alloc_msg,
                hindi_voice_text=spoken_hi
            )
        except Exception as e:
            print(f"[Warning] Allocation alert dispatch warning: {e}")

    add_activity("TRIP_ASSIGNED", f"Milk-Run trip {trip_id} dispatched to Driver Baljit Singh (HR-12-AE-8419). {len(stops)} farmer stops scheduled.", event_type="driver")
    return get_active_trip()

def get_active_trip():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM trips ORDER BY created_at DESC LIMIT 1;")
        row = cursor.fetchone()
        if not row:
            # Seed default initial assigned trip for the seeded truck
            return create_or_dispatch_trip(order_id="ORD-SRF-01", crop="Mustard")
        d = dict(row)
        try:
            d["stops"] = json.loads(d.get("stops_json") or "[]")
        except Exception:
            d["stops"] = []
        return d

def update_trip_status(trip_id, status, current_stop_index=None):
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        if current_stop_index is not None:
            conn.execute("""
            UPDATE trips SET status = ?, current_stop_index = ?, updated_at = ?
            WHERE trip_id = ?;
            """, (status, current_stop_index, now, trip_id))
        else:
            conn.execute("""
            UPDATE trips SET status = ?, updated_at = ?
            WHERE trip_id = ?;
            """, (status, now, trip_id))
        conn.commit()
    add_activity("TRIP_STATUS_UPDATED", f"Trip #{trip_id} status changed to {status}.", event_type="driver")
    return get_active_trip()

def advance_trip_stop(trip_id, loaded_lot_id=None):
    """
    Marks a stop's lot as LOADED_ON_TRUCK and advances the stop index.
    """
    trip = get_active_trip()
    if not trip:
        return None
    stops = trip.get("stops", [])
    curr_idx = trip.get("current_stop_index", 0)

    if loaded_lot_id:
        update_lot_status(loaded_lot_id, "LOADED_ON_TRUCK", inspection_passed=True)

    for s in stops:
        if loaded_lot_id and s["lot_id"] == loaded_lot_id:
            s["is_loaded"] = True
            s["status"] = "LOADED_ON_TRUCK"

    next_idx = min(len(stops) - 1, curr_idx + 1)
    all_loaded = all(s.get("is_loaded") or s.get("status") == "LOADED_ON_TRUCK" for s in stops)
    new_status = "ALL_STOPS_LOADED" if all_loaded else "TRIP_IN_PROGRESS"

    now = time.strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        conn.execute("""
        UPDATE trips SET stops_json = ?, current_stop_index = ?, status = ?, updated_at = ?
        WHERE trip_id = ?;
        """, (json.dumps(stops), next_idx, new_status, now, trip_id))
        conn.commit()

    return get_active_trip()

# --- Reverse Backhaul Manifest Ingestion ---

def add_backhaul_item_db(item_dict):
    """
    Appends reverse logistics cargo to active backhaul schedule.
    """
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM backhaul_schedules ORDER BY created_at DESC LIMIT 1;")
        row = cursor.fetchone()
        if row:
            sched_id = row["schedule_id"]
            try:
                items = json.loads(row["cargo_items_json"] or "[]")
            except Exception:
                items = []
            items.append(item_dict)
            new_booked_kg = sum(float(it.get("quantity_kg", 0)) for it in items)
            conn.execute("""
            UPDATE backhaul_schedules SET
                cargo_items_json = ?,
                booked_capacity_kg = ?,
                created_at = ?
            WHERE schedule_id = ?;
            """, (json.dumps(items), new_booked_kg, now, sched_id))
        else:
            sched_id = f"BHL-ROH-{int(time.time())}"
            items = [item_dict]
            new_booked_kg = float(item_dict.get("quantity_kg", 100))
            conn.execute("""
            INSERT INTO backhaul_schedules (
                schedule_id, transporter_phone, vehicle, corridor, pickup_date,
                available_capacity_kg, booked_capacity_kg, cargo_items_json, status, created_at
            ) VALUES (
                ?, '+91 94160 88219', 'Mahindra Bolero Maxi Truck (HR-12-AE-8419)',
                'Azadpur Mandi / Mill Hub ➔ Village Bhalaut PACS Cooperative',
                'Tomorrow, 02:30 PM (24h Prior Plan)', 1500, ?, ?, 'PLANNED_1_DAY_PRIOR', ?
            );
            """, (sched_id, new_booked_kg, json.dumps(items), now))
        conn.commit()

    add_activity("REVERSE_CARGO_ADDED", f"Added {item_dict.get('item', 'Item')} ({item_dict.get('quantity_kg', 0)} kg) to return manifest.", event_type="admin")
    return get_backhaul_schedules()

# --- Mandi Weighbridge Sale & Telegram Payout Settlement ---

def settle_sale_and_notify_telegram(trip_id=None, mandi_price=5420, mandi_name="Azadpur APMC Mandi"):
    """
    Finalizes the Mandi sale, computes farmer net payouts with itemized deductions,
    and dispatches the live sale receipt via Telegram bot and audio voice note!
    """
    trip = get_active_trip()
    now = time.strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lots WHERE status IN ('LOADED_ON_TRUCK', 'ACCEPTED', 'PENDING_OFFER');")
        lots_to_settle = [dict(r) for r in cursor.fetchall()]

    settlement_results = []
    for lot in lots_to_settle:
        qtl = float(lot["quantity_quintals"])
        bags = int(lot["bags_count"])
        crop = lot["crop"]
        phone = lot["phone"]
        farmer_name = lot["farmer_name"]

        gross_value = round(qtl * mandi_price, 2)
        freight_charge = round(float(lot.get("freight_share_rs") or (qtl * 75)), 2)
        mandi_cess = round(gross_value * 0.01, 2)  # 1% standard APMC cess
        labor_charge = 100.0                       # Standard weighbridge handling per lot
        net_payout = round(gross_value - freight_charge - mandi_cess - labor_charge, 2)

        with get_connection() as conn:
            conn.execute("""
            UPDATE lots SET status = 'SOLD_AND_SETTLED', updated_at = ? WHERE lot_id = ?;
            """, (now, lot["lot_id"]))
            conn.commit()

        tg_receipt = (
            f"🎉 *बिक्री व मंडी भुगतान रसीद (Mandi Settlement)*\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"👨‍🌾 *किसान:* {farmer_name}\n"
            f"🌾 *फसल:* {crop} (लॉट #{lot['lot_id']})\n"
            f"⚖️ *मात्रा बेची गई:* *{qtl} क्विंटल* ({bags} बोरी)\n"
            f"🏛️ *मंडी:* {mandi_name}\n"
            f"💰 *सकल मूल्य (Gross Value):* ₹{gross_value:,.2f} (@ ₹{mandi_price}/क्विंटल)\n\n"
            f"🧾 *मंडी व लॉजिस्टिक्स कटौतियां (Deductions):*\n"
            f"• 🚚 डिलीवरी भाड़ा (Pooling Freight): -₹{freight_charge:,.2f}\n"
            f"• 🏛️ APMC मंडी शुल्क (1% Mandi Cess): -₹{mandi_cess:,.2f}\n"
            f"• 👷 पल्लेदारी व उतराई (Handling): -₹{labor_charge:,.2f}\n\n"
            f"✅ *कुल शुद्ध भुगतान (Net Payout):* *₹{net_payout:,.2f}*\n"
            f"🏦 *भुगतान स्थिति:* किसान बैंक खाते (DBT/UPI) में सीधा ट्रांसफर सफल!"
        )

        spoken_hi = (
            f"बधाई हो {farmer_name} जी! आपकी {qtl} क्विंटल {crop} आज़ादपुर मंडी में बिक गई है। "
            f"डिलीवरी भाड़ा ₹{freight_charge} और मंडी टैक्स काटकर आपके खाते में कुल ₹{net_payout:.0f} का शुद्ध भुगतान ट्रांसफर हो गया है।"
        )

        try:
            from core.notifications import send_dual_channel_alert
            send_dual_channel_alert(
                phone=phone,
                title="Mandi Settlement & Net Payout Credited 🌾",
                message=tg_receipt,
                hindi_voice_text=spoken_hi
            )
        except Exception as e:
            print(f"[Warning] Telegram settlement alert delivery: {e}")

        settlement_results.append({
            "lot_id": lot["lot_id"],
            "farmer_name": farmer_name,
            "phone": phone,
            "crop": crop,
            "quantity_quintals": qtl,
            "bags": bags,
            "gross_value": gross_value,
            "delivery_freight": freight_charge,
            "mandi_cess": mandi_cess,
            "labor_charge": labor_charge,
            "net_payout": net_payout,
            "receipt_text": tg_receipt
        })

    if trip:
        update_trip_status(trip["trip_id"], "SETTLED_COMPLETED")

    with get_connection() as conn:
        conn.execute("UPDATE buyer_orders SET status = 'DELIVERED_AND_SETTLED', updated_at = ? WHERE status != 'DELIVERED_AND_SETTLED';", (now,))
        conn.commit()

    add_activity("MANDI_SALE_SETTLED", f"Consignment of {len(settlement_results)} lots successfully sold & settled at {mandi_name}. Itemized payouts credited to farmers.", event_type="mandi")
    return settlement_results

# Initialize schema on module import
init_db(seed_if_empty=True)
