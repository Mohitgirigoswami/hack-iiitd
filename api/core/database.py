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
    bags_count = int(round(quantity_quintals * 2))
    shared_freight = quantity_quintals * 120
    benchmark_price = 5420
    local_price = 4700
    extra_profit = ((quantity_quintals * benchmark_price) - shared_freight) - (quantity_quintals * local_price)
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
    add_activity("LOT_CREATED", f"{user['name']} declared {bags_count} bags ({quantity_quintals} Qtl) of {crop}. Extra profit: +₹{extra_profit:.0f}", event_type="farmer", channel=channel)
    return get_lot_by_id(lot_id)

def update_lot_quantity(lot_id, new_quantity_quintals):
    lot = get_lot_by_id(lot_id)
    if not lot:
        return None
    new_quantity_quintals = max(0.5, round(float(new_quantity_quintals), 1))
    bags_count = int(round(new_quantity_quintals * 2))
    shared_freight = new_quantity_quintals * 120
    extra_profit = ((new_quantity_quintals * 5420) - shared_freight) - (new_quantity_quintals * 4700)
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
    add_activity("LOT_QUANTITY_UPDATED", f"Lot #{lot_id} ({lot['farmer_name']}) stock updated to {bags_count} bags ({new_quantity_quintals} Qtl).", event_type="farmer")
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
        conn.commit()
    init_db(seed_if_empty=True)

# Initialize schema on module import
init_db(seed_if_empty=True)
