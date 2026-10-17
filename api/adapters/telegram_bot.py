import os
import telebot
from dotenv import load_dotenv

# Import core domain modules
from core.khetpin import generate_khet_pin
from core.advisory import get_prescription, generate_hindi_audio
from core.ai_client import analyze_crop_leaf_disease, parse_voice_dialect_intent
from state_manager import state

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

def init_telegram_bot():
    if not TOKEN:
        print("[Notice] TELEGRAM_BOT_TOKEN is not set in .env. Bot is in standby mode.")
        return None

    bot = telebot.TeleBot(TOKEN)

    @bot.message_handler(commands=['start', 'help'])
    def send_welcome(message):
        welcome_text = (
            "🌾 *KhetOS (खेतOS) में आपका स्वागत है!*\n\n"
            "अपनी फसल को सीधे बड़े खरीदारों को बेचने और मंडी तक गाड़ी शेयर करने के लिए:\n"
            "1. 📍 अपनी लोकेशन भेजें (खेत का KhetPin बनाने के लिए)\n"
            "2. 🌿 फसल की पत्ती की फोटो भेजें (दवाई व बीमारी जांचने के लिए)\n"
            "3. 🎙️ बोलकर बताएं कि आपके पास कितनी फसल है (उदा: '40 कट्टे कनक')"
        )
        markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True)
        btn_loc = telebot.types.KeyboardButton("📍 अपनी लोकेशन भेजें", request_location=True)
        btn_contact = telebot.types.KeyboardButton("📱 मोबाइल नंबर साझा करें", request_contact=True)
        markup.row(btn_loc, btn_contact)
        bot.reply_to(message, welcome_text, parse_mode="Markdown", reply_markup=markup)

    @bot.message_handler(content_types=['location'])
    def handle_location(message):
        lat = message.location.latitude
        lng = message.location.longitude
        khet_pin_data = generate_khet_pin(lat, lng, state_code="HR", district_code="ROH")
        
        reply = (
            f"✅ *आपका डिजिटल KhetPin तैयार है!*\n\n"
            f"📍 *KhetPin:* `{khet_pin_data['khet_pin']}`\n"
            f"🛣️ *निकटतम पक्की सड़क:* {khet_pin_data['snapped_turnoff']['paved_road_name']}\n\n"
            f"🎙️ *कृपया 10 सेकंड की ऑडियो भेजें:* कच्चा रास्ता समझाने के लिए आवाज़ रिकॉर्ड करें।"
        )
        bot.reply_to(message, reply, parse_mode="Markdown")

    @bot.message_handler(content_types=['photo'])
    def handle_photo(message):
        bot.reply_to(message, "🔍 पत्ती की जांच की जा रही है... कृपया 2 सेकंड प्रतीक्षा करें।")
        
        # Download photo
        file_info = bot.get_file(message.photo[-1].file_id)
        downloaded_file = bot.download_file(file_info.file_path)
        
        # Analyze via Vision + ICAR database
        diag = analyze_crop_leaf_disease(image_bytes=downloaded_file, crop_hint="Mustard")
        presc = get_prescription(crop=diag.get("crop", "Mustard"), disease=diag.get("disease", "Alternaria Blight"))
        
        hindi_reply = (
            f"🌿 *फसल रोग जांच रिपोर्ट*\n\n"
            f"🦠 *बीमारी:* {presc['disease_name']}\n"
            f"🧪 *असली टेक्निकल साल्ट:* `{presc['chemical_salt']}`\n"
            f"⚖️ *नाप (Dosage):* {presc['dosage_hi']}\n"
            f"💰 *अनुमानित खर्च:* {presc.get('estimated_price', '₹180')}\n\n"
            f"⚠️ *चेतावनी:* {presc['warning_hi']}"
        )
        bot.reply_to(message, hindi_reply, parse_mode="Markdown")

        # Synthesize and send voice note
        spoken_summary = f"आपकी फसल में {presc['disease_name']} है। दुकानदार से {presc['chemical_salt']} मांगें। {presc['warning_hi']}"
        audio_bytes = generate_hindi_audio(spoken_summary)
        if audio_bytes:
            bot.send_voice(message.chat.id, audio_bytes)

    @bot.message_handler(content_types=['voice', 'text'])
    def handle_voice_or_text(message):
        content = message.text or "Voice note received"
        parsed = parse_voice_dialect_intent(content)
        
        # Add to state
        lot = state.add_lot_from_farmer(
            farmer_name=message.from_user.first_name or "Kisan Brother",
            phone=f"+91 {message.from_user.id % 90000 + 10000}",
            village="Rohtak",
            crop=parsed.get("crop", "Mustard"),
            quantity_quintals=parsed.get("quantity_quintals", 4.0),
            khet_pin="HR-ROH-78G4",
            channel="telegram"
        )
        
        reply = (
            f"✅ *फसल पूलिंग में दर्ज हो गई है!*\n\n"
            f"📦 *फसल:* {lot['crop']} ({lot['quantity_quintals']} क्विंटल / {lot['bags_count']} बोरी)\n"
            f"🚚 *गाड़ी:* {state.active_pool['transporter']}\n"
            f"💰 *अतिरिक्त मुनाफा:* +₹{lot['extra_profit_earned_rs']:.0f} (बिचौलिये से बचाई रकम!)\n\n"
            f"प्रोजेक्टर डैशबोर्ड पर आपकी गाड़ी 100% फुल हो गई है!"
        )
        bot.reply_to(message, reply, parse_mode="Markdown")

    return bot

if __name__ == "__main__":
    bot = init_telegram_bot()
    if bot:
        print("[KhetOS] Telegram Bot polling started...")
        bot.infinity_polling()
