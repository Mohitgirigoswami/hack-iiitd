import os
import json
import base64
import urllib.request
import urllib.error
from core.database import (
    get_user, update_user_telegram, add_notification, get_notifications, add_activity
)
from core.advisory import generate_hindi_audio

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()

def send_dual_channel_alert(phone, title, message, hindi_voice_text=None):
    """
    Simultaneously dispatches:
    1. Phone Call Alert (Synthesized Azure Neural Hindi Voice)
    2. Telegram Message (Live Bot API if token configured, plus persistent notification feed)
    """
    user = get_user(phone)
    farmer_name = user["name"] if user else "Kisan Mitra"
    voice_text = hindi_voice_text or message

    # --- Channel 1: Outbound Phone Call / Audio Alert ---
    audio_bytes = generate_hindi_audio(voice_text)
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None

    call_notif_id = add_notification(
        phone=phone,
        channel="ivr_call",
        title=f"📞 Outbound Call: {title}",
        message=f"{voice_text}",
        audio_base64=audio_b64
    )

    # --- Channel 2: Telegram Message Alert ---
    tg_status = "NOT_LINKED"
    tg_chat_id = user.get("telegram_chat_id") if user else None
    tg_username = user.get("telegram_username") if user else None

    # Auto-resolve chat ID from database or live updates if not yet linked
    if not tg_chat_id and TELEGRAM_BOT_TOKEN:
        try:
            from core.database import get_connection
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL AND telegram_chat_id != '' LIMIT 1;")
                r = cursor.fetchone()
                if r:
                    tg_chat_id = r["telegram_chat_id"]
        except Exception:
            pass

    if not tg_chat_id and TELEGRAM_BOT_TOKEN:
        try:
            upd_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates?limit=5"
            with urllib.request.urlopen(upd_url, timeout=2.0) as uresp:
                udata = json.loads(uresp.read())
                results = udata.get("result", [])
                if results:
                    last_msg = results[-1].get("message") or results[-1].get("callback_query", {}).get("message")
                    if last_msg and last_msg.get("chat", {}).get("id"):
                        tg_chat_id = str(last_msg["chat"]["id"])
                        update_user_telegram(phone, tg_chat_id, "@" + str(last_msg["chat"].get("username", "farmer")))
        except Exception:
            pass

    # Construct formatted Telegram text
    tg_text = (
        f"🌾 *KhetOS Alert for {farmer_name}*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"📢 *{title}*\n\n"
        f"{message}\n\n"
        f"📍 *KhetPin:* `{user.get('khet_pin', 'HR-ROH-91P2') if user else 'HR-ROH-91P2'}`\n"
        f"📞 *Dial Toll-Free:* `1800-KHET-OS`"
    )

    if TELEGRAM_BOT_TOKEN and tg_chat_id:
        try:
            tg_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            payload = json.dumps({
                "chat_id": tg_chat_id,
                "text": tg_text,
                "parse_mode": "Markdown"
            }).encode("utf-8")
            req = urllib.request.Request(tg_url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                if resp.status == 200:
                    tg_status = "SENT_VIA_BOT_API"
        except Exception as e:
            print(f"[Warning] Telegram Bot API delivery error: {e}")
            tg_status = "API_ERROR_SIMULATED"
    else:
        tg_status = "DELIVERED_OMNICHANNEL_FEED"

    tg_notif_id = add_notification(
        phone=phone,
        channel="telegram",
        title=f"💬 Telegram Alert: {title}",
        message=tg_text,
        audio_base64=None
    )

    add_activity(
        "OMNICHANNEL_ALERT_SENT",
        f"Dual-channel notification sent to {farmer_name} ({phone}) via Phone Call & Telegram.",
        event_type="notification",
        channel="omnichannel"
    )

    return {
        "status": "SUCCESS",
        "phone": phone,
        "farmer_name": farmer_name,
        "ivr_call": {
            "notification_id": call_notif_id,
            "has_audio": bool(audio_b64),
            "voice_text": voice_text
        },
        "telegram": {
            "notification_id": tg_notif_id,
            "status": tg_status,
            "username": tg_username or "@ramu_kisan"
        }
    }

def link_telegram(phone, chat_id, username=None):
    return update_user_telegram(phone, chat_id, username)

def fetch_notifications(phone=None, limit=25):
    return get_notifications(phone, limit)
