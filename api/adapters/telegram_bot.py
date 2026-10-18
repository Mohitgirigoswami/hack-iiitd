import os
import sys
import io
import time
import threading
import telebot
from dotenv import load_dotenv

# Ensure parent directory (api/) is in path when run standalone or imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.khetpin import generate_khet_pin
from core.advisory import get_prescription, generate_hindi_audio
from core.ai_client import analyze_crop_leaf_disease, parse_voice_dialect_intent
from core.mandi_prices import get_mandi_price
from core.database import (
    get_user, get_or_create_user, update_user_telegram, get_user_lots,
    get_all_lots, get_lot_by_id, create_lot, update_lot_quantity,
    update_lot_status, delete_lot, get_active_pool, add_activity,
    get_connection
)
from state_manager import state

load_dotenv()

# Hardcoded production token from project specification with env override
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo").strip()

def dispatch_voice_safe(bot, chat_id, spoken_text):
    """
    Synthesizes natural vernacular Hindi speech and sends as a voice note.
    Safely catches any network or Telegram delivery issues without crashing.
    """
    if not spoken_text:
        return
    try:
        audio_bytes = generate_hindi_audio(spoken_text)
        if audio_bytes:
            voice_file = io.BytesIO(audio_bytes)
            voice_file.name = "voice.mp3"
            bot.send_voice(chat_id, voice_file)
    except Exception as e:
        print(f"[KhetOS Bot Warning] Voice dispatch to {chat_id} skipped: {e}")

def resolve_farmer(message_or_call):
    """
    Resolves the Telegram user to a persistent SQLite user.
    Auto-links chat_id to demo farmer Ramu Sharma (+91 98123 45099) if not bound.
    """
    if hasattr(message_or_call, 'message') and message_or_call.message:
        chat_id = str(message_or_call.message.chat.id)
        tg_user = message_or_call.from_user
    else:
        chat_id = str(message_or_call.chat.id)
        tg_user = message_or_call.from_user

    username = f"@{tg_user.username}" if (tg_user and tg_user.username) else None
    first_name = (tg_user.first_name if tg_user else None) or "Ramu Sharma"

    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Match by telegram_chat_id
        cursor.execute("SELECT * FROM users WHERE telegram_chat_id = ?;", (chat_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)

        # 2. Match by username if set
        if username:
            cursor.execute("SELECT * FROM users WHERE LOWER(telegram_username) = LOWER(?);", (username,))
            row = cursor.fetchone()
            if row:
                cursor.execute("UPDATE users SET telegram_chat_id = ? WHERE phone = ?;", (chat_id, row["phone"]))
                conn.commit()
                return dict(row)

        # 3. Default demo linkage: bind to Ramu Sharma (+91 98123 45099)
        cursor.execute("SELECT * FROM users WHERE phone = '+91 98123 45099';")
        ramu = cursor.fetchone()
        if ramu:
            cursor.execute("""
            UPDATE users SET telegram_chat_id = ?, telegram_username = COALESCE(telegram_username, ?)
            WHERE phone = '+91 98123 45099';
            """, (chat_id, username or "@ramu_kisan"))
            conn.commit()
            return dict(ramu)

        # 4. Fallback: create fresh farmer
        clean_id = chat_id.lstrip("-")
        phone_suffix = int(clean_id) % 90000000 + 10000000 if clean_id.isdigit() else 45099
        phone = f"+91 98{phone_suffix}"
        cursor.execute("""
        INSERT OR IGNORE INTO users (phone, name, village, district, khet_pin, voice_breadcrumb, telegram_chat_id, telegram_username, role, created_at)
        VALUES (?, ?, 'Najafgarh', 'Delhi Rural', 'HR-ROH-91P2', 'बड़ के पेड़ से नहर की पटरी पकड़ के ट्यूबवेल के सामने आ जाना।', ?, ?, 'farmer', ?);
        """, (phone, first_name, chat_id, username, time.strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()
        return get_user(phone)

# =========================================================================
# KEYBOARD & OPTIONS BUILDERS
# =========================================================================

def get_main_reply_keyboard():
    """Persistent 8-button vernacular menu anchored at the bottom of the chat."""
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True)
    b1 = telebot.types.KeyboardButton("🌾 फसल जोड़ें (Add Crop)")
    b2 = telebot.types.KeyboardButton("🚿 ट्यूबवेल सलाह (Tubewell)")
    b3 = telebot.types.KeyboardButton("📈 आज का मंडी भाव (Rates)")
    b4 = telebot.types.KeyboardButton("📦 मेरा स्टॉक (My Stock)")
    b5 = telebot.types.KeyboardButton("📸 फसल रोग जांच (Doctor)")
    b6 = telebot.types.KeyboardButton("🚛 गाड़ी स्थिति (Truck)")
    b7 = telebot.types.KeyboardButton("📍 खेत लोकेशन (Khet-PIN)", request_location=True)
    b8 = telebot.types.KeyboardButton("📞 किसान सहायता (Help)")
    markup.row(b1, b2)
    markup.row(b3, b4)
    markup.row(b5, b6)
    markup.row(b7, b8)
    return markup

def get_crop_selection_inline(action_prefix="crop_select"):
    """Inline keyboard for selecting crop variety with single tap."""
    markup = telebot.types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        telebot.types.InlineKeyboardButton("🌾 गेहूँ (Wheat)", callback_data=f"{action_prefix}:Wheat"),
        telebot.types.InlineKeyboardButton("🟡 सरसों (Mustard)", callback_data=f"{action_prefix}:Mustard"),
        telebot.types.InlineKeyboardButton("🥔 आलू (Potato)", callback_data=f"{action_prefix}:Potato"),
        telebot.types.InlineKeyboardButton("🌾 धान (Paddy)", callback_data=f"{action_prefix}:Paddy"),
        telebot.types.InlineKeyboardButton("🌱 चना (Gram)", callback_data=f"{action_prefix}:Gram")
    )
    return markup

def get_bag_selection_inline(crop):
    """Inline keyboard for selecting discrete 50kg bag quantities."""
    markup = telebot.types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        telebot.types.InlineKeyboardButton("5 बोरी (2.5 Qtl)", callback_data=f"bag_select:{crop}:5"),
        telebot.types.InlineKeyboardButton("10 बोरी (5.0 Qtl)", callback_data=f"bag_select:{crop}:10"),
        telebot.types.InlineKeyboardButton("20 बोरी (10.0 Qtl)", callback_data=f"bag_select:{crop}:20"),
        telebot.types.InlineKeyboardButton("30 बोरी (15.0 Qtl)", callback_data=f"bag_select:{crop}:30"),
        telebot.types.InlineKeyboardButton("40 बोरी (20.0 Qtl)", callback_data=f"bag_select:{crop}:40"),
        telebot.types.InlineKeyboardButton("50 बोरी (25.0 Qtl)", callback_data=f"bag_select:{crop}:50"),
        telebot.types.InlineKeyboardButton("🔙 दूसरी फसल चुनें", callback_data="crop_select_restart")
    )
    return markup

def get_post_lot_inline(lot_id, crop):
    """Next step actions after lot booking."""
    markup = telebot.types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        telebot.types.InlineKeyboardButton("📦 मेरा स्टॉक देखें", callback_data="show_stock"),
        telebot.types.InlineKeyboardButton("🚿 ट्यूबवेल सलाह", callback_data=f"tubewell_select:{crop}"),
        telebot.types.InlineKeyboardButton(f"📈 {crop} मंडी भाव", callback_data=f"mandi_select:{crop}"),
        telebot.types.InlineKeyboardButton("🌾 एक और फसल जोड़ें", callback_data="crop_select_restart")
    )
    return markup

def get_mandi_post_inline(crop):
    """Options displayed after viewing Mandi rates."""
    markup = telebot.types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        telebot.types.InlineKeyboardButton(f"🌾 {crop} पूलिंग में जोड़ें", callback_data=f"crop_select:{crop}"),
        telebot.types.InlineKeyboardButton("🔄 अन्य फसल का भाव", callback_data="mandi_select_restart"),
        telebot.types.InlineKeyboardButton("🚿 सिंचाई सलाह", callback_data=f"tubewell_select:{crop}"),
        telebot.types.InlineKeyboardButton("🏠 मुख्य मेन्यू", callback_data="show_main_menu")
    )
    return markup

def get_tubewell_post_inline(crop):
    """Options displayed after viewing Tubewell advisory."""
    markup = telebot.types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        telebot.types.InlineKeyboardButton("🔄 अन्य फसल की सलाह", callback_data="tubewell_select_restart"),
        telebot.types.InlineKeyboardButton(f"🌾 {crop} गाड़ी में लोड कराएं", callback_data=f"crop_select:{crop}"),
        telebot.types.InlineKeyboardButton("🏠 मुख्य मेन्यू", callback_data="show_main_menu")
    )
    return markup

def get_stock_management_inline(lots):
    """Options for modifying and deleting lots with ₹0 penalty."""
    markup = telebot.types.InlineKeyboardMarkup(row_width=2)
    if not lots:
        markup.add(telebot.types.InlineKeyboardButton("🌾 नई फसल जोड़ें", callback_data="crop_select_restart"))
        return markup

    for l in lots:
        lid = l["lot_id"]
        crop = l["crop"]
        status = l.get("status", "CONFIRMED")
        if status in ["LOADED_ON_TRUCK", "DEFERRED_FOR_SUN_DRYING"]:
            markup.add(telebot.types.InlineKeyboardButton(f"🔒 #{lid} ({crop}) लोड हो चुका है", callback_data=f"lot_locked:{lid}"))
        else:
            markup.add(
                telebot.types.InlineKeyboardButton(f"➕ 5 बोरी (#{lid})", callback_data=f"stock_adjust:{lid}:5"),
                telebot.types.InlineKeyboardButton(f"➖ 5 बोरी (#{lid})", callback_data=f"stock_adjust:{lid}:-5")
            )
            markup.add(telebot.types.InlineKeyboardButton(f"❌ हटाएँ #{lid} (₹0 पेनाल्टी)", callback_data=f"stock_del:{lid}"))

    markup.add(
        telebot.types.InlineKeyboardButton("🌾 नई फसल जोड़ें", callback_data="crop_select_restart"),
        telebot.types.InlineKeyboardButton("🚛 गाड़ी स्थिति", callback_data="show_truck_status")
    )
    return markup

def get_crop_doctor_inline():
    """Common symptoms and pests for instant 1-tap ICAR diagnosis."""
    markup = telebot.types.InlineKeyboardMarkup(row_width=1)
    markup.add(
        telebot.types.InlineKeyboardButton("🌿 सरसों — माहू / चेपा कीट (Aphids)", callback_data="doctor_select:Mustard:Aphids / Mahu"),
        telebot.types.InlineKeyboardButton("🌿 सरसों — सफेद रतुआ (White Rust)", callback_data="doctor_select:Mustard:White Rust"),
        telebot.types.InlineKeyboardButton("🌾 गेहूँ — पीला रतुआ (Yellow Rust)", callback_data="doctor_select:Wheat:Yellow Rust"),
        telebot.types.InlineKeyboardButton("🌾 गेहूँ — दीमक नियंत्रण (Termites)", callback_data="doctor_select:Wheat:Termites"),
        telebot.types.InlineKeyboardButton("🥔 आलू — पिछेता झुलसा (Late Blight)", callback_data="doctor_select:Potato:Late Blight"),
        telebot.types.InlineKeyboardButton("🌾 धान — तना छेदक कीट (Stem Borer)", callback_data="doctor_select:Paddy:Stem Borer"),
        telebot.types.InlineKeyboardButton("🌱 चना — फली छेदक इल्ली (Pod Borer)", callback_data="doctor_select:Gram:Pod Borer")
    )
    return markup

def get_truck_status_inline():
    """Truck pickup verification options."""
    markup = telebot.types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        telebot.types.InlineKeyboardButton("📞 ड्राइवर को कॉल करें", callback_data="truck_call"),
        telebot.types.InlineKeyboardButton("✅ पिकअप स्वीकार करें", callback_data="truck_accept"),
        telebot.types.InlineKeyboardButton("⏳ पिकअप टालें (₹0)", callback_data="truck_reject"),
        telebot.types.InlineKeyboardButton("🏠 मुख्य मेन्यू", callback_data="show_main_menu")
    )
    return markup

# =========================================================================
# BOT INSTANCE & HANDLERS
# =========================================================================

def init_telegram_bot(token=None):
    bot_token = token or TELEGRAM_BOT_TOKEN
    if not bot_token:
        print("[Notice] TELEGRAM_BOT_TOKEN is not configured. Telegram bot in standby.")
        return None

    bot = telebot.TeleBot(bot_token)

    # 1. /start and /help command handler
    @bot.message_handler(commands=['start', 'help'])
    def send_welcome(message):
        user = resolve_farmer(message)
        farmer_name = user.get("name", "Ramu Sharma")
        khet_pin = user.get("khet_pin", "HR-ROH-91P2")
        village = user.get("village", "Najafgarh")
        phone = user.get("phone", "+91 98123 45099")

        welcome_text = (
            f"🌾 *नमस्ते {farmer_name} जी!*\n"
            f"KhetOS (खेतOS) किसान साथी में आपका स्वागत है।\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"📍 *खेतपिन:* `{khet_pin}` ({village})\n"
            f"📱 *मोबाइल CLI:* `{phone}`\n\n"
            f"⚡ *आपको कुछ टाइप करने की जरूरत नहीं है!*\n"
            f"नीचे दिए गए बटनों से जो सेवा चाहिए उसे तुरंत चुनें:"
        )

        reply_markup = get_main_reply_keyboard()
        bot.reply_to(message, welcome_text, parse_mode="Markdown", reply_markup=reply_markup)

        # Also send 1-tap quick action inline buttons directly under the greeting
        quick_inline = telebot.types.InlineKeyboardMarkup(row_width=2)
        quick_inline.add(
            telebot.types.InlineKeyboardButton("🌾 नई फसल जोड़ें", callback_data="crop_select_restart"),
            telebot.types.InlineKeyboardButton("🚿 ट्यूबवेल सलाह", callback_data="tubewell_select_restart"),
            telebot.types.InlineKeyboardButton("📈 आज का मंडी भाव", callback_data="mandi_select_restart"),
            telebot.types.InlineKeyboardButton("📦 मेरा स्टॉक", callback_data="show_stock")
        )
        bot.send_message(message.chat.id, "👇 *त्वरित विकल्प चुनें:*", parse_mode="Markdown", reply_markup=quick_inline)

        spoken_text = f"नमस्ते {farmer_name} जी! खेतOS किसान साथी में आपका स्वागत है। फसल जोड़ने, ट्यूबवेल सलाह या मंडी भाव के लिए नीचे से विकल्प चुनें।"
        dispatch_voice_safe(bot, message.chat.id, spoken_text)

    # 2. /tubewell command handler
    @bot.message_handler(commands=['tubewell', 'irrigation', 'water'])
    def handle_tubewell_advisory_bot(message):
        user = resolve_farmer(message)
        village = user.get("village", "Bhalaut")
        parts = message.text.split()

        # If user explicitly specified crop
        if len(parts) > 1:
            crop_arg = parts[1]
        else:
            # Send crop options
            prompt_text = "🚿 *आज ट्यूबवेल कितनी देर चलाना है?*\nअपनी फसल का चयन करें:"
            bot.reply_to(message, prompt_text, parse_mode="Markdown", reply_markup=get_crop_selection_inline("tubewell_select"))
            return

        from core.tubewell import calculate_tubewell_advisory
        res = calculate_tubewell_advisory(crop=crop_arg, village=village, acres=1.0)

        reply_text = (
            f"🚿 *स्मार्ट ट्यूबवेल व सिंचाई परामर्श*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🌾 *फसल:* {res['crop_hindi']}\n"
            f"⏱️ *सुझाव:* *{res['headline_hi']}*\n"
            f"💡 *कारण:* {res['reason_hi']}\n\n"
            f"⚡ *कृषि 3-फेज बिजली:* {res['power_roster']['active_slot']}\n"
            f"🌱 *बचत:* ~{res['groundwater_saved_liters']:,} लीटर भूजल व {res['electricity_units_saved_kwh']} यूनिट बिजली की बचत!"
        )
        bot.reply_to(message, reply_text, parse_mode="Markdown", reply_markup=get_tubewell_post_inline(res["crop_english"]))
        dispatch_voice_safe(bot, message.chat.id, res["voice_text_hi"])

    # 3. /mandi command handler
    @bot.message_handler(commands=['mandi'])
    def handle_mandi_prices(message):
        parts = message.text.split()
        crop_arg = parts[1] if len(parts) > 1 else "Mustard"
        norm_crop = "Mustard"
        ca = crop_arg.lower()
        if "wheat" in ca or "कनक" in ca or "गेहूं" in ca: norm_crop = "Wheat"
        elif "potato" in ca or "आलू" in ca or "aloo" in ca: norm_crop = "Potato"
        elif "paddy" in ca or "धान" in ca: norm_crop = "Paddy"
        elif "gram" in ca or "चना" in ca: norm_crop = "Gram"

        p = get_mandi_price(norm_crop)
        diff = p['modal_price'] - p.get('local_trader_price', 4700)
        pct = round((diff / p.get('local_trader_price', 4700)) * 100, 1)

        reply_text = (
            f"📈 *आज का {p.get('mandi', 'आज़ादपुर APMC मंडी')} भाव*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🌾 *फसल:* {p.get('commodity_hi', norm_crop)} ({norm_crop})\n"
            f"📍 *मंडी:* {p.get('mandi', 'Azadpur APMC Mandi, Delhi')}\n"
            f"💰 *मॉडल भाव:* ₹{p['modal_price']} / क्विंटल\n"
            f"📊 *भाव सीमा:* ₹{p.get('min_price', p['modal_price'] - 150)} – ₹{p.get('max_price', p['modal_price'] + 150)}\n"
            f"📉 *स्थानीय गांव आढ़ती भाव:* ₹{p.get('local_trader_price', 4700)} / क्विंटल\n\n"
            f"✅ *खेतOS पूलिंग से सीधा लाभ:* +₹{diff} / क्विंटल (+{pct}%)\n"
            f"🚚 *गाड़ी पूलिंग में जुड़ने के लिए नीचे बटन दबाएं:*"
        )
        bot.reply_to(message, reply_text, parse_mode="Markdown", reply_markup=get_mandi_post_inline(norm_crop))

        spoken = f"आज आज़ादपुर मंडी में {norm_crop} का मॉडल भाव ₹{p['modal_price']} प्रति क्विंटल है। गांव के आढ़ती से ₹{diff} ज्यादा मिल रहे हैं।"
        dispatch_voice_safe(bot, message.chat.id, spoken)

    # 4. /mystock command handler
    @bot.message_handler(commands=['mystock'])
    def handle_my_stock(message):
        user = resolve_farmer(message)
        phone = user.get("phone", "+91 98123 45099")
        lots = get_user_lots(phone)

        if not lots:
            reply_text = (
                f"ℹ️ *{user['name']} जी, आपके खाते में अभी कोई सक्रिय लॉट नहीं है।*\n\n"
                f"महिंद्रा बोलेरो में अपनी फसल बुक करने के लिए नीचे '🌾 नई फसल जोड़ें' बटन दबाएं।"
            )
            bot.reply_to(message, reply_text, parse_mode="Markdown", reply_markup=get_stock_management_inline([]))
            return

        total_qtl = sum(l["quantity_quintals"] for l in lots)
        total_bags = sum(l["bags_count"] for l in lots)
        total_profit = sum(l.get("extra_profit_rs", 0) for l in lots)

        lines = [
            f"📦 *आपके सक्रिय लॉट ({len(lots)} लॉट | {total_qtl:.1f} क्विंटल / {total_bags} बोरी)*",
            f"━━━━━━━━━━━━━━━━━━"
        ]
        for l in lots:
            lines.append(
                f"• *#{l['lot_id']}* — {l['crop']}\n"
                f"  ⚖️ {l['quantity_quintals']:.1f} Qtl ({l['bags_count']} बोरी) | स्थिति: `{l['status']}`\n"
                f"  💰 अतिरिक्त मुनाफा: +₹{l.get('extra_profit_rs', 0):.0f}"
            )
        lines.append(f"\n📊 *कुल:* {total_bags} बोरियां (50kg प्रत्येक) | कुल बचत: +₹{total_profit:.0f}")

        bot.reply_to(message, "\n".join(lines), parse_mode="Markdown", reply_markup=get_stock_management_inline(lots))

        spoken = f"आपके खाते में कुल {len(lots)} लॉट और {total_qtl:.1f} क्विंटल फसल दर्ज है।"
        dispatch_voice_safe(bot, message.chat.id, spoken)

    # 5. /addlot command handler
    @bot.message_handler(commands=['addlot'])
    def handle_add_lot(message):
        user = resolve_farmer(message)
        phone = user.get("phone", "+91 98123 45099")
        msg_raw = message.text.lower()
        parts = message.text.split()

        # If user just sent /addlot without quantity or crop, show crop options
        if len(parts) == 1:
            prompt_text = (
                f"🌾 *{user['name']} जी, कौन सी फसल बोलेरो गाड़ी में लोड करवानी है?*\n"
                f"नीचे दिए विकल्पों में से चुनें:"
            )
            bot.reply_to(message, prompt_text, parse_mode="Markdown", reply_markup=get_crop_selection_inline("crop_select"))
            return

        crop = "Mustard"
        if "wheat" in msg_raw or "गेहूं" in msg_raw or "कनक" in msg_raw: crop = "Wheat"
        elif "potato" in msg_raw or "आलू" in msg_raw or "aloo" in msg_raw: crop = "Potato"
        elif "paddy" in msg_raw or "धान" in msg_raw: crop = "Paddy"
        elif "gram" in msg_raw or "चना" in msg_raw: crop = "Gram"

        # Check numeric quantity
        raw_num = 4.0
        for p in parts[1:]:
            clean_p = p.replace("bori", "").replace("बोरी", "").replace("bags", "").replace("qtl", "").strip()
            try:
                raw_num = float(clean_p)
                break
            except ValueError:
                continue

        # If user explicitly specified bags/bori, convert 1 bag = 0.5 Qtl
        if any(unit in msg_raw for unit in ["bori", "बोरी", "bag", "कट्टे", "katte"]):
            qty = max(0.5, round(raw_num * 0.5, 1))
            bags = int(raw_num)
        else:
            qty = max(0.5, round(raw_num, 1))
            bags = int(round(qty * 2))

        # Create lot in SQLite database
        lot = create_lot(phone, crop, qty, channel="telegram_bot")
        pool = get_active_pool() or state.active_pool
        cap_pct = pool.get('capacity_percentage', 80.0)
        status_label = "डिस्पैच लॉक (100% Full)" if cap_pct >= 99 else "पूलिंग जारी (Accepting Lots)"

        reply_text = (
            f"✅ *बधाई! आपकी फसल पूलिंग में दर्ज हो गई है!*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"📦 *लॉट आईडी:* `#{lot['lot_id']}`\n"
            f"🌾 *फसल:* {lot['crop']} ({lot['quantity_quintals']:.1f} क्विंटल / {lot['bags_count']} बोरी)\n"
            f"🚚 *गाड़ी:* {pool.get('transporter', 'Mahindra Bolero Maxi Truck')}\n"
            f"⏱️ *पिकअप स्लॉट:* कल सुबह 08:45 - 09:15 बजे (एग्री मिल्क-रन)\n"
            f"📊 *बोलेरो क्षमता:* *{cap_pct}%* ({status_label})\n"
            f"💰 *अतिरिक्त मुनाफा:* +₹{lot['extra_profit_rs']:.0f} (बिचौलिये से बचाई रकम!)\n\n"
            f"📍 *कट-ऑफ:* आज शाम 6:00 बजे | *रूट प्रस्थान:* कल सुबह 07:00 बजे रोहतक हब से"
        )
        bot.reply_to(message, reply_text, parse_mode="Markdown", reply_markup=get_post_lot_inline(lot['lot_id'], crop))

        spoken = f"बधाई {user['name']} जी! आपका {lot['bags_count']} बोरी ({qty} क्विंटल {crop}) दर्ज हो गया है। आपका पिकअप स्लॉट कल सुबह 8:45 से 9:15 बजे निर्धारित है।"
        dispatch_voice_safe(bot, message.chat.id, spoken)

    # 6. /dellot command handler
    @bot.message_handler(commands=['dellot'])
    def handle_del_lot(message):
        user = resolve_farmer(message)
        phone = user.get("phone", "+91 98123 45099")
        parts = message.text.split()

        target_lot_id = parts[1] if len(parts) > 1 else None
        if not target_lot_id:
            user_lots = get_user_lots(phone)
            if user_lots:
                target_lot_id = user_lots[0]["lot_id"]

        if not target_lot_id:
            bot.reply_to(message, "⚠️ हटाने के लिए कोई सक्रिय लॉट नहीं मिला।", parse_mode="Markdown")
            return

        success = delete_lot(target_lot_id)
        if success:
            pool = get_active_pool() or state.active_pool
            reply_text = (
                f"✅ *लॉट #{target_lot_id} हटा दिया गया है!*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🛡️ *शून्य पेनाल्टी सुरक्षित:* ₹0 Penalty Applied\n"
                f"🚚 *बोलेरो पूलिंग स्थिति:* अब {pool.get('capacity_percentage', 73.3)}% क्षमता"
            )
            bot.reply_to(message, reply_text, parse_mode="Markdown")

            spoken = f"आपका लॉट #{target_lot_id} पूलिंग से हटा दिया गया है। शून्य पेनाल्टी लागू है।"
            dispatch_voice_safe(bot, message.chat.id, spoken)
        else:
            bot.reply_to(message, f"⚠️ लॉट `#{target_lot_id}` नहीं मिला।", parse_mode="Markdown")

    # 7. /accept and /reject command handlers
    @bot.message_handler(commands=['accept'])
    def handle_accept_lot(message):
        user = resolve_farmer(message)
        phone = user.get("phone", "+91 98123 45099")
        parts = message.text.split()
        user_lots = get_user_lots(phone)
        lot_id = parts[1] if len(parts) > 1 else (user_lots[0]["lot_id"] if user_lots else None)
        if lot_id:
            update_lot_status(lot_id, "ACCEPTED")
            bot.reply_to(message, f"✅ लॉट `#{lot_id}` का पिकअप स्वीकार कर लिया गया है। बोलेरो पिकअप लॉक हो गया है।", parse_mode="Markdown")
        else:
            bot.reply_to(message, "⚠️ कोई लॉट नहीं मिला।", parse_mode="Markdown")

    @bot.message_handler(commands=['reject'])
    def handle_reject_lot(message):
        user = resolve_farmer(message)
        phone = user.get("phone", "+91 98123 45099")
        parts = message.text.split()
        user_lots = get_user_lots(phone)
        lot_id = parts[1] if len(parts) > 1 else (user_lots[0]["lot_id"] if user_lots else None)
        if lot_id:
            update_lot_status(lot_id, "REJECTED_BY_FARMER")
            bot.reply_to(message, f"✅ लॉट `#{lot_id}` का पिकअप टाल दिया गया है। ₹0 पेनाल्टी लागू है।", parse_mode="Markdown")
        else:
            bot.reply_to(message, "⚠️ कोई लॉट नहीं मिला।", parse_mode="Markdown")

    # 8. Location handler
    @bot.message_handler(content_types=['location'])
    def handle_location(message):
        lat = message.location.latitude
        lng = message.location.longitude
        khet_pin_data = generate_khet_pin(lat, lng, state_code="HR", district_code="ROH")
        khet_pin = khet_pin_data["khet_pin"]

        user = resolve_farmer(message)
        phone = user.get("phone", "+91 98123 45099")

        with get_connection() as conn:
            conn.execute("UPDATE users SET khet_pin = ?, telegram_chat_id = ? WHERE phone = ?;", (khet_pin, str(message.chat.id), phone))
            conn.execute("UPDATE lots SET khet_pin = ? WHERE phone = ? AND status != 'LOADED_ON_TRUCK';", (khet_pin, phone))
            conn.commit()

        add_activity(
            "LOCATION_GEO_SYNCED",
            f"📍 {user['name']} dropped GPS pin ({lat:.4f}, {lng:.4f}): Khet-PIN updated to {khet_pin}.",
            event_type="farmer",
            channel="telegram"
        )

        reply = (
            f"✅ *आपका डिजिटल KhetPin तैयार व सेव हो गया है!*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"📍 *KhetPin:* `{khet_pin}`\n"
            f"🛣️ *निकटतम पक्की सड़क:* {khet_pin_data['snapped_turnoff']['paved_road_name']}\n"
            f"🌾 *कच्चा रास्ता दूरी:* {khet_pin_data['snapped_turnoff']['unmapped_dirt_distance_meters']} मीटर\n"
            f"💾 *डेटाबेस स्थिति:* SQLite में सुरक्षित रूप से दर्ज"
        )
        bot.reply_to(message, reply, parse_mode="Markdown", reply_markup=get_crop_selection_inline("crop_select"))

        spoken = f"बधाई {user['name']} जी! आपका डिजिटल खेतपिन {khet_pin} डेटाबेस में अपडेट हो गया है।"
        dispatch_voice_safe(bot, message.chat.id, spoken)

    # 9. Contact handler
    @bot.message_handler(content_types=['contact'])
    def handle_contact(message):
        phone_num = message.contact.phone_number
        if not phone_num.startswith("+"):
            phone_num = f"+{phone_num}"
        update_user_telegram(phone_num, str(message.chat.id), f"@{message.from_user.username}" if message.from_user.username else None)
        user = get_user(phone_num)
        name = user["name"] if user else (message.from_user.first_name or "Kisan Mitra")

        reply = (
            f"📱 *मोबाइल नंबर सत्यापित हो गया!*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"👤 *किसान:* {name}\n"
            f"📞 *फोन CLI:* `{phone_num}`\n"
            f"✅ आपका टेलीग्राम खाता खेतOS से लिंक हो गया है।"
        )
        bot.reply_to(message, reply, parse_mode="Markdown", reply_markup=get_main_reply_keyboard())

    # 9B. Voice & Audio note handler (Real multimodal speech & dialect parsing)
    @bot.message_handler(content_types=['voice', 'audio'])
    def handle_voice_message(message):
        bot.reply_to(message, "🎙️ आपकी आवाज़ सुनी जा रही है... कृपया 1 सेकंड प्रतीक्षा करें।")
        try:
            # 1. Download voice note file from Telegram
            file_id = message.voice.file_id if message.voice else message.audio.file_id
            file_info = bot.get_file(file_id)
            audio_bytes = bot.download_file(file_info.file_path)

            # 2. Parse vernacular speech
            parsed = parse_voice_dialect_intent(audio_bytes, mime_type="audio/ogg")
            intent = parsed.get("intent", "CROP_LOT")
            crop = parsed.get("crop", "Mustard")
            transcript = parsed.get("transcription", "")
            user = resolve_farmer(message)
            phone = user.get("phone", "+91 98123 45099")
            chat_id = message.chat.id

            # Route by intent
            if intent == "TUBEWELL":
                res = calculate_tubewell_runtime(crop=crop, village=user.get("village", "Bhalaut"))
                reply_text = (
                    f"🎙️ *आवाज़ समझी गई:* \"{transcript}\"\n\n"
                    f"🚿 *{res['crop_hindi']} - आज का ट्यूबवेल सुझाव*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"⏱️ *सुझाव:* *{res['headline_hi']}*\n"
                    f"💡 *कारण:* {res['reason_hi']}\n"
                    f"⚡ *कृषि 3-फेज बिजली:* {res['power_roster']['active_slot']}\n"
                    f"🌱 *बचत:* ~{res['groundwater_saved_liters']:,}L भूजल व {res['electricity_units_saved_kwh']} यूनिट बिजली की बचत!"
                )
                bot.send_message(chat_id, reply_text, parse_mode="Markdown", reply_markup=get_tubewell_post_inline(crop))
                dispatch_voice_safe(bot, chat_id, res["voice_text_hi"])

            elif intent == "MANDI":
                prices = get_current_mandi_prices()
                crop_prices = [p for p in prices if crop.lower() in p["crop"].lower() or p["crop"].lower() in crop.lower()]
                p_item = crop_prices[0] if crop_prices else prices[0]
                reply_text = (
                    f"🎙️ *आवाज़ समझी गई:* \"{transcript}\"\n\n"
                    f"📈 *आज का {p_item['crop']} मंडी भाव*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"🏛️ *आज़ादपुर APMC मंडी:* ₹{p_item['benchmark_mandi_price_rs']}/क्विंटल\n"
                    f"🏘️ *गांव का स्थानीय आढ़ती:* ₹{p_item['local_trader_price_rs']}/क्विंटल\n"
                    f"💰 *KhetOS से सीधा मुनाफा:* *+₹{p_item['extra_profit_per_quintal_rs']}/क्विंटल*\n"
                    f"🛡️ *शून्य पेनाल्टी पूलिंग:* सीधे खेत से महिंद्रा बोलेरो पिकअप!"
                )
                bot.send_message(chat_id, reply_text, parse_mode="Markdown", reply_markup=get_post_lot_inline("POOL-ROH-104", crop))
                spoken = f"आज {p_item['crop']} का आज़ादपुर मंडी भाव ₹{p_item['benchmark_mandi_price_rs']} है। खेतOS से आपको प्रति क्विंटल ₹{p_item['extra_profit_per_quintal_rs']} का सीधा अतिरिक्त मुनाफा होगा।"
                dispatch_voice_safe(bot, chat_id, spoken)

            elif intent == "PESTICIDE_DOCTOR":
                disease_query = parsed.get("pest_or_disease") or "Aphids / Mahu"
                presc = get_prescription(crop=crop, disease=disease_query)
                hindi_reply = (
                    f"🎙️ *आवाज़ समझी गई:* \"{transcript}\"\n\n"
                    f"🌿 *ICAR AI फसल डॉक्टर व कीटनाशक सलाह*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"🌾 *फसल:* {crop}\n"
                    f"🦠 *कीट/बीमारी:* *{presc['disease_name']}*\n"
                    f"🧪 *असली टेक्निकल साल्ट:* `{presc['chemical_salt']}`\n"
                    f"⚖️ *15L ढोलकी नाप:* *{presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}*\n"
                    f"💰 *खर्च:* जेनेरिक {presc.get('generic_price', '₹180')} vs ब्रांडेड {presc.get('brand_price', '₹850')} (*~{presc.get('savings_pct', 75)}% बचत*)\n"
                    f"🌱 *जैविक विकल्प:* {presc.get('organic_alternative_hi', 'नीम का तेल')}\n\n"
                    f"⚠️ *सुरक्षा चेतावनी:* {presc['warning_hi']}"
                )
                bot.send_message(chat_id, hindi_reply, parse_mode="Markdown", reply_markup=get_crop_doctor_inline())
                spoken_summary = f"{crop} में {presc['disease_name']} के लिए दुकानदार से {presc['chemical_salt']} मांगें। {presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}। {presc['warning_hi']}"
                dispatch_voice_safe(bot, chat_id, spoken_summary)

            elif intent == "TRUCK_TRACKING":
                pool = get_active_pool() or state.active_pool
                truck_text = (
                    f"🎙️ *आवाज़ समझी गई:* \"{transcript}\"\n\n"
                    f"🚛 *महिंद्रा बोलेरो - कृषि मिल्क-रन शेड्यूल*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"🚚 *गाड़ी:* {pool.get('transporter', 'Mahindra Bolero Maxi Truck')} (HR-12-AE-8419)\n"
                    f"👤 *ड्राइवर:* बलजीत सिंह (+91 94160 88219)\n"
                    f"⏱️ *कट-ऑफ विंडो:* आज शाम 6:00 बजे तक\n"
                    f"🛣️ *शेड्यूल रूट व समय:*\n"
                    f"  1. दिनेश छिल्लर (कल सुबह 07:15 - 07:45 AM)\n"
                    f"  2. सुरेश कुमार (कल सुबह 08:00 - 08:30 AM)\n"
                    f"  3. आपका खेत (कल सुबह 08:45 - 09:15 AM)\n"
                    f"  ➔ आज़ादपुर APMC मंडी आगमन: कल सुबह 10:45 AM\n\n"
                    f"📊 *पूलिंग स्थिति:* {pool.get('capacity_percentage', 73.3)}% क्षमता"
                )
                bot.send_message(chat_id, truck_text, parse_mode="Markdown", reply_markup=get_truck_status_inline())
                spoken = f"बोलेरो गाड़ी का रूट कल सुबह 7 बजे शुरू होगा। आपका पिकअप स्लॉट कल सुबह 8:45 से 9:15 बजे निर्धारित है।"
                dispatch_voice_safe(bot, chat_id, spoken)

            else:
                # Default: CROP_LOT
                bags = parsed.get("bags_count", 8)
                qty = parsed.get("quantity_quintals", round(bags * 0.5, 1))
                lot = create_lot(phone, crop, qty, channel="telegram_voice")
                pool = get_active_pool() or state.active_pool
                cap_pct = pool.get('capacity_percentage', 80.0)
                status_label = "डिस्पैच लॉक (100% Full)" if cap_pct >= 99 else "पूलिंग जारी (Accepting Lots)"

                reply_text = (
                    f"🎙️ *आवाज़ समझी गई:* \"{transcript}\"\n\n"
                    f"✅ *बधाई! आपकी फसल पूलिंग में दर्ज हो गई है!*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"📦 *लॉट आईडी:* `#{lot['lot_id']}`\n"
                    f"🌾 *फसल:* {lot['crop']} ({lot['quantity_quintals']:.1f} क्विंटल / {lot['bags_count']} बोरी)\n"
                    f"🚚 *गाड़ी:* Mahindra Bolero Maxi Truck (HR-12-AE-8419)\n"
                    f"⏱️ *पिकअप स्लॉट:* कल सुबह 08:45 - 09:15 बजे (एग्री मिल्क-रन)\n"
                    f"📊 *बोलेरो लोड:* {cap_pct}% ({status_label})\n"
                    f"💰 *अतिरिक्त मुनाफा:* +₹{lot['extra_profit_rs']:.0f} (बिचौलिये से बचाई रकम!)\n\n"
                    f"📍 *कट-ऑफ:* आज शाम 6:00 बजे | *रूट प्रस्थान:* कल सुबह 07:00 बजे"
                )
                bot.reply_to(message, reply_text, parse_mode="Markdown", reply_markup=get_post_lot_inline(lot['lot_id'], crop))
                spoken = f"बधाई {user['name']} जी! आपका {lot['bags_count']} बोरी ({qty} क्विंटल {crop}) दर्ज हो गया है। आपका पिकअप स्लॉट कल सुबह 8:45 से 9:15 बजे है।"
                dispatch_voice_safe(bot, chat_id, spoken)

        except Exception as e:
            print(f"[Telegram Bot Error] Voice handling failed: {e}")
            bot.reply_to(message, "⚠️ आवाज़ समझने में कठिनाई हुई। कृपया पुनः स्पष्ट बोलें या नीचे दिए मेन्यू विकल्पों का उपयोग करें।", reply_markup=get_main_reply_keyboard())

    # 10. Photo handler (ICAR leaf disease vision diagnosis)
    @bot.message_handler(content_types=['photo'])
    def handle_photo(message):
        bot.reply_to(message, "🔍 पत्ती की जांच की जा रही है... कृपया 2 सेकंड प्रतीक्षा करें।")
        try:
            file_info = bot.get_file(message.photo[-1].file_id)
            downloaded_file = bot.download_file(file_info.file_path)

            diag = analyze_crop_leaf_disease(image_bytes=downloaded_file)
            crop_detected = diag.get("crop", "Mustard")
            presc = get_prescription(crop=crop_detected, disease=diag.get("disease", "Alternaria Blight"))

            hindi_reply = (
                f"🌿 *फसल रोग जांच रिपोर्ट (ICAR AI Doctor)*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🌾 *फसल:* {crop_detected}\n"
                f"🦠 *बीमारी/कीट:* *{presc['disease_name']}*\n"
                f"🧪 *असली टेक्निकल साल्ट:* `{presc['chemical_salt']}`\n"
                f"⚖️ *15L ढोलकी नाप:* *{presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}*\n"
                f"💰 *खर्च:* जेनेरिक {presc.get('generic_price', '₹180')} vs ब्रांडेड {presc.get('brand_price', '₹850')} (*~{presc.get('savings_pct', 75)}% बचत*)\n"
                f"🌱 *जैविक विकल्प:* {presc.get('organic_alternative_hi', 'नीम का तेल')}\n\n"
                f"⚠️ *सुरक्षा चेतावनी:* {presc['warning_hi']}"
            )
            bot.reply_to(message, hindi_reply, parse_mode="Markdown", reply_markup=get_crop_doctor_inline())

            spoken_summary = f"आपकी {crop_detected} की फसल में {presc['disease_name']} है। दुकानदार से {presc['chemical_salt']} मांगें। {presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}। {presc['warning_hi']}"
            dispatch_voice_safe(bot, message.chat.id, spoken_summary)
        except Exception as e:
            print(f"[Telegram Bot Error] Photo processing error: {e}")
            bot.reply_to(message, "⚠️ फोटो प्रोसेस करने में त्रुटि हुई। कृपया स्पष्ट रोशनी में पत्ती की तस्वीर पुनः भेजें।")

    # 11. Conversational router for text buttons & Hindi inputs
    @bot.message_handler(func=lambda m: True, content_types=['text'])
    def handle_text_message(message):
        text = message.text.strip()
        t_lower = text.lower()

        if "फसल जोड़ें" in text or "add crop" in t_lower or "जोड़" in text:
            prompt_text = "🌾 *कौन सी फसल बोलेरो गाड़ी में लोड करवानी है?*\nनीचे से अपनी फसल चुनें:"
            return bot.reply_to(message, prompt_text, parse_mode="Markdown", reply_markup=get_crop_selection_inline("crop_select"))

        elif "ट्यूबवेल" in text or "tubewell" in t_lower or "पानी" in text or "सिंचाई" in text:
            prompt_text = "🚿 *आज ट्यूबवेल कितनी देर चलाना है?*\nअपनी फसल का चयन करें:"
            return bot.reply_to(message, prompt_text, parse_mode="Markdown", reply_markup=get_crop_selection_inline("tubewell_select"))

        elif "मंडी भाव" in text or "mandi" in t_lower or "भाव" in text:
            prompt_text = "📈 *आज का आज़ादपुर APMC मंडी व गांव आढ़ती भाव*\nकिस फसल का भाव देखना चाहते हैं? चुनें:"
            return bot.reply_to(message, prompt_text, parse_mode="Markdown", reply_markup=get_crop_selection_inline("mandi_select"))

        elif "स्टॉक" in text or "stock" in t_lower or "लॉट" in text:
            return handle_my_stock(message)

        elif "रोग" in text or "doctor" in t_lower or "पत्ती" in text or "बीमारी" in text:
            prompt_text = "📸 *ICAR AI फसल डॉक्टर*\nपत्ती की तस्वीर भेजें या नीचे दिए आम रोगों में से चुनें:"
            return bot.reply_to(message, prompt_text, parse_mode="Markdown", reply_markup=get_crop_doctor_inline())

        elif "गाड़ी" in text or "ट्रक" in text or "truck" in t_lower or "पिकअप" in text:
            pool = get_active_pool() or state.active_pool
            truck_text = (
                f"🚛 *महिंद्रा बोलेरो - कृषि मिल्क-रन ट्रैकिंग*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🚚 *वाहन:* {pool.get('transporter', 'Mahindra Bolero Maxi Truck')} (HR-12-AE-8419)\n"
                f"👤 *ड्राइवर:* बलजीत सिंह (+91 94160 88219)\n"
                f"⏱️ *कट-ऑफ विंडो:* आज शाम 6:00 बजे | *प्रस्थान:* कल सुबह 07:00 बजे\n"
                f"🛣️ *मिल्क-रन रूट टाइमलाइन:*\n"
                f"  1. दिनेश छिल्लर (कल सुबह 07:15 - 07:45 AM)\n"
                f"  2. सुरेश कुमार (कल सुबह 08:00 - 08:30 AM)\n"
                f"  3. आपका खेत (कल सुबह 08:45 - 09:15 AM)\n"
                f"  ➔ आज़ादपुर APMC मंडी: कल सुबह 10:45 AM\n\n"
                f"📊 *बोलेरो लोड:* {pool.get('capacity_percentage', 73.3)}% ({pool.get('status', 'ACCEPTING_LOTS')})"
            )
            return bot.reply_to(message, truck_text, parse_mode="Markdown", reply_markup=get_truck_status_inline())

        elif "सहायता" in text or "help" in t_lower or "मदद" in text:
            return send_welcome(message)

        else:
            return send_welcome(message)

    # 12. Complete Callback Query Handler (Handles ALL Inline Button Clicks with 0 Typing)
    @bot.callback_query_handler(func=lambda call: True)
    def handle_callback_query(call):
        try:
            bot.answer_callback_query(call.id)
        except Exception:
            pass

        data = call.data
        user = resolve_farmer(call)
        phone = user.get("phone", "+91 98123 45099")
        village = user.get("village", "Bhalaut")
        chat_id = call.message.chat.id

        # Flow A: Crop selected for Lot Addition -> Prompt bag quantity
        if data.startswith("crop_select:"):
            crop = data.split(":")[1]
            crop_hi_map = {"Mustard": "सरसों", "Wheat": "गेहूँ", "Potato": "आलू", "Paddy": "धान", "Gram": "चना"}
            crop_hi = crop_hi_map.get(crop, crop)
            text = (
                f"🌾 *{crop_hi} ({crop})*\n"
                f"गाड़ी में कितने कट्टे / बोरी (50kg प्रत्येक) लोड कराने हैं?\n"
                f"नीचे से बोरियों की संख्या चुनें:"
            )
            bot.send_message(chat_id, text, parse_mode="Markdown", reply_markup=get_bag_selection_inline(crop))

        # Flow B: Bag count selected -> Book Lot immediately!
        elif data.startswith("bag_select:"):
            _, crop, bags_str = data.split(":")
            bags = int(bags_str)
            qty = round(bags * 0.5, 1)

            lot = create_lot(phone, crop, qty, channel="telegram_bot")
            pool = get_active_pool() or state.active_pool

            reply_text = (
                f"✅ *बधाई {user['name']} जी! आपकी फसल पूलिंग में दर्ज हो गई!*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📦 *लॉट आईडी:* `#{lot['lot_id']}`\n"
                f"🌾 *फसल:* {lot['crop']} ({lot['quantity_quintals']:.1f} क्विंटल / {lot['bags_count']} बोरी)\n"
                f"🚚 *गाड़ी:* {pool.get('transporter', 'Mahindra Bolero Maxi Truck')}\n"
                f"📊 *बोलेरो लोड:* *{pool.get('capacity_percentage', 100)}% FULL* ({pool.get('status', 'FULL_DISPATCH_LOCKED')})\n"
                f"💰 *अतिरिक्त मुनाफा:* +₹{lot['extra_profit_rs']:.0f} (बिचौलिये से बचाई रकम)\n\n"
                f"🎉 *बोलेरो गाड़ी भर चुकी है और आज़ादपुर मंडी के लिए लॉक हो गई है!*"
            )
            bot.send_message(chat_id, reply_text, parse_mode="Markdown", reply_markup=get_post_lot_inline(lot['lot_id'], crop))

            spoken = f"बधाई {user['name']} जी! आपका {lot['bags_count']} बोरी ({qty} क्विंटल {crop}) दर्ज हो गया है। बोलेरो गाड़ी {pool.get('capacity_percentage', 100)}% भर चुकी है।"
            dispatch_voice_safe(bot, chat_id, spoken)

        # Flow C: Mandi Crop Selected
        elif data.startswith("mandi_select:"):
            crop = data.split(":")[1]
            p = get_mandi_price(crop)
            diff = p['modal_price'] - p.get('local_trader_price', 4700)
            pct = round((diff / p.get('local_trader_price', 4700)) * 100, 1)

            reply_text = (
                f"📈 *आज का {p.get('mandi', 'आज़ादपुर APMC मंडी')} भाव*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🌾 *फसल:* {p.get('commodity_hi', crop)} ({crop})\n"
                f"💰 *मॉडल भाव:* ₹{p['modal_price']} / क्विंटल\n"
                f"📊 *भाव सीमा:* ₹{p.get('min_price', p['modal_price'] - 150)} – ₹{p.get('max_price', p['modal_price'] + 150)}\n"
                f"📉 *स्थानीय गांव आढ़ती भाव:* ₹{p.get('local_trader_price', 4700)} / क्विंटल\n\n"
                f"✅ *खेतOS पूलिंग से सीधा लाभ:* +₹{diff} / क्विंटल (+{pct}%)"
            )
            bot.send_message(chat_id, reply_text, parse_mode="Markdown", reply_markup=get_mandi_post_inline(crop))

            spoken = f"आज आज़ादपुर मंडी में {crop} का भाव ₹{p['modal_price']} प्रति क्विंटल है। आढ़ती से ₹{diff} ज्यादा मिल रहे हैं।"
            dispatch_voice_safe(bot, chat_id, spoken)

        # Flow D: Tubewell Crop Selected
        elif data.startswith("tubewell_select:"):
            crop = data.split(":")[1]
            from core.tubewell import calculate_tubewell_advisory
            res = calculate_tubewell_advisory(crop=crop, village=village, acres=1.0)

            reply_text = (
                f"🚿 *स्मार्ट ट्यूबवेल व सिंचाई परामर्श*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🌾 *फसल:* {res['crop_hindi']}\n"
                f"⏱️ *सुझाव:* *{res['headline_hi']}*\n"
                f"💡 *कारण:* {res['reason_hi']}\n\n"
                f"⚡ *कृषि 3-फेज बिजली:* {res['power_roster']['active_slot']}\n"
                f"🌱 *बचत:* ~{res['groundwater_saved_liters']:,} लीटर भूजल व {res['electricity_units_saved_kwh']} यूनिट बिजली की बचत!"
            )
            bot.send_message(chat_id, reply_text, parse_mode="Markdown", reply_markup=get_tubewell_post_inline(crop))
            dispatch_voice_safe(bot, chat_id, res["voice_text_hi"])

        # Flow E: Stock Quantity Adjustment (+/- 5 bags)
        elif data.startswith("stock_adjust:"):
            _, lot_id, delta_bags_str = data.split(":")
            delta_bags = int(delta_bags_str)
            lot = get_lot_by_id(lot_id)
            if lot:
                new_qty = max(0.5, round(lot["quantity_quintals"] + (delta_bags * 0.5), 1))
                updated = update_lot_quantity(lot_id, new_qty)
                pool = get_active_pool() or state.active_pool
                reply_text = (
                    f"✅ *लॉट #{lot_id} संशोधित हो गया!*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"⚖️ *नई मात्रा:* {updated['quantity_quintals']} क्विंटल ({updated['bags_count']} बोरी)\n"
                    f"🚚 *बोलेरो लोड:* {pool.get('capacity_percentage', 100)}% ({pool.get('current_loaded_kg', 1500)} kg)\n"
                    f"💰 *संशोधित अतिरिक्त मुनाफा:* +₹{updated['extra_profit_rs']:.0f}"
                )
                bot.send_message(chat_id, reply_text, parse_mode="Markdown", reply_markup=get_stock_management_inline(get_user_lots(phone)))
                spoken = f"आपका लॉट #{lot_id} अब {updated['quantity_quintals']} क्विंटल दर्ज हो गया है।"
                dispatch_voice_safe(bot, chat_id, spoken)
            else:
                bot.send_message(chat_id, f"⚠️ लॉट #{lot_id} नहीं मिला।")

        # Flow F: Stock Delete with ₹0 penalty
        elif data.startswith("stock_del:"):
            lot_id = data.split(":")[1]
            success = delete_lot(lot_id)
            if success:
                pool = get_active_pool() or state.active_pool
                reply_text = (
                    f"✅ *लॉट #{lot_id} हटा दिया गया है!*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"🛡️ *शून्य पेनाल्टी सुरक्षित:* ₹0 Penalty Applied\n"
                    f"🚚 *बोलेरो स्थिति:* अब {pool.get('capacity_percentage', 73.3)}% क्षमता"
                )
                bot.send_message(chat_id, reply_text, parse_mode="Markdown", reply_markup=get_stock_management_inline(get_user_lots(phone)))
                spoken = f"लॉट #{lot_id} पूलिंग से हटा दिया गया है। शून्य पेनाल्टी लागू है।"
                dispatch_voice_safe(bot, chat_id, spoken)
            else:
                bot.send_message(chat_id, f"⚠️ लॉट #{lot_id} नहीं मिला।")

        # Flow G: Crop Doctor 1-tap diagnosis
        elif data.startswith("doctor_select:"):
            _, crop, disease = data.split(":")
            presc = get_prescription(crop=crop, disease=disease)
            hindi_reply = (
                f"🌿 *ICAR AI फसल डॉक्टर व कीटनाशक सलाह*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🌾 *फसल:* {crop}\n"
                f"🦠 *बीमारी/कीट:* *{presc['disease_name']}*\n"
                f"🧪 *असली टेक्निकल साल्ट:* `{presc['chemical_salt']}`\n"
                f"⚖️ *15L ढोलकी नाप:* *{presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}*\n"
                f"💰 *अनुमानित खर्च:* जेनेरिक {presc.get('generic_price', '₹180')} vs ब्रांडेड {presc.get('brand_price', '₹850')} (*~{presc.get('savings_pct', 75)}% बचत*)\n"
                f"🌱 *जैविक विकल्प:* {presc.get('organic_alternative_hi', 'नीम का तेल')}\n\n"
                f"⚠️ *सुरक्षा चेतावनी:* {presc['warning_hi']}"
            )
            bot.send_message(chat_id, hindi_reply, parse_mode="Markdown", reply_markup=get_crop_doctor_inline())
            spoken_summary = f"{crop} में {presc['disease_name']} के लिए दुकानदार से {presc['chemical_salt']} मांगें। {presc.get('dosage_15l_tank_hi', presc['dosage_hi'])}। {presc['warning_hi']}"
            dispatch_voice_safe(bot, chat_id, spoken_summary)

        # Flow H: Restart submenus
        elif data == "crop_select_restart":
            bot.send_message(chat_id, "🌾 *कौन सी फसल गाड़ी में लोड करवानी है?*", parse_mode="Markdown", reply_markup=get_crop_selection_inline("crop_select"))

        elif data == "mandi_select_restart":
            bot.send_message(chat_id, "📈 *किस फसल का आज का मंडी भाव देखना चाहते हैं?*", parse_mode="Markdown", reply_markup=get_crop_selection_inline("mandi_select"))

        elif data == "tubewell_select_restart":
            bot.send_message(chat_id, "🚿 *किस फसल के लिए ट्यूबवेल सलाह चाहिए?*", parse_mode="Markdown", reply_markup=get_crop_selection_inline("tubewell_select"))

        elif data == "show_stock":
            lots = get_user_lots(phone)
            bot.send_message(chat_id, f"📦 *आपके सक्रिय लॉट ({len(lots)} दर्ज):*", parse_mode="Markdown", reply_markup=get_stock_management_inline(lots))

        elif data == "show_truck_status":
            pool = get_active_pool() or state.active_pool
            truck_text = (
                f"🚛 *महिंद्रा बोलेरो - कृषि मिल्क-रन ट्रैकिंग*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🚚 *वाहन:* {pool.get('transporter', 'Mahindra Bolero Maxi Truck')} (HR-12-AE-8419)\n"
                f"👤 *ड्राइवर:* बलजीत सिंह (+91 94160 88219)\n"
                f"⏱️ *कट-ऑफ विंडो:* आज शाम 6:00 बजे | *प्रस्थान:* कल सुबह 07:00 बजे\n"
                f"🛣️ *मिल्क-रन रूट टाइमलाइन:*\n"
                f"  1. दिनेश छिल्लर (कल सुबह 07:15 - 07:45 AM)\n"
                f"  2. सुरेश कुमार (कल सुबह 08:00 - 08:30 AM)\n"
                f"  3. आपका खेत (कल सुबह 08:45 - 09:15 AM)\n"
                f"  ➔ आज़ादपुर APMC मंडी: कल सुबह 10:45 AM\n\n"
                f"📊 *बोलेरो लोड:* {pool.get('capacity_percentage', 73.3)}% ({pool.get('status', 'ACCEPTING_LOTS')})"
            )
            bot.send_message(chat_id, truck_text, parse_mode="Markdown", reply_markup=get_truck_status_inline())

        elif data == "truck_accept":
            user_lots = get_user_lots(phone)
            if user_lots:
                update_lot_status(user_lots[0]["lot_id"], "ACCEPTED")
            bot.send_message(chat_id, "✅ महिंद्रा बोलेरो पिकअप स्वीकार कर लिया गया है। ड्राइवर को सूचना भेज दी गई है।")

        elif data == "truck_reject":
            user_lots = get_user_lots(phone)
            if user_lots:
                update_lot_status(user_lots[0]["lot_id"], "REJECTED_BY_FARMER")
            bot.send_message(chat_id, "⏳ पिकअप टाल दिया गया है। ₹0 पेनाल्टी लागू है।")

        elif data == "show_main_menu":
            send_welcome(call.message)

        elif data.startswith("lot_locked:"):
            lid = data.split(":")[1]
            bot.send_message(chat_id, f"🔒 लॉट #{lid} गाड़ी में लोड हो चुका है और लॉक है। इसे बदला नहीं जा सकता।")

    return bot

def start_telegram_bot_daemon(token=None):
    """
    Spawns background long-polling daemon thread for Telegram Bot.
    Guarantees zero crashes and auto-recovery from network dropouts.
    """
    bot = init_telegram_bot(token)
    if not bot:
        return None

    def polling_worker():
        print("[KhetOS] Telegram Bot daemon thread started for @KhetOSSaathiBot (polling active)...")
        while True:
            try:
                bot.infinity_polling(timeout=20, long_polling_timeout=10)
            except Exception as e:
                print(f"[KhetOS Bot Warning] Long-polling connection dropped ({e}). Auto-reconnecting in 3s...")
                time.sleep(3)

    daemon_thread = threading.Thread(target=polling_worker, daemon=True, name="KhetOS-TelegramBot-Daemon")
    daemon_thread.start()
    return daemon_thread

if __name__ == "__main__":
    print("[KhetOS] Launching Telegram Bot in standalone foreground mode...")
    bot = init_telegram_bot()
    if bot:
        bot.infinity_polling(timeout=20, long_polling_timeout=10)
