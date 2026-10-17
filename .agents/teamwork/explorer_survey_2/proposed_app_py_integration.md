# Proposed Backend Integration in `api/app.py`

## 1. Auto-Starting Telegram Bot Daemon Thread in `api/app.py`

At the bottom of `api/app.py`, right before `app.run(...)`:

```python
# --- Telegram Bot Background Long-Polling Daemon ---
from adapters.telegram_bot import start_telegram_bot_daemon

# Auto-launch daemon thread if enabled (default True)
if os.getenv("ENABLE_TELEGRAM_DAEMON", "1").strip().lower() in ["1", "true", "yes"]:
    try:
        start_telegram_bot_daemon()
        print("[KhetOS] Background Telegram bot daemon thread successfully initialized.")
    except Exception as e:
        print(f"[Warning] Failed to start Telegram Bot daemon: {e}")

if __name__ == "__main__":
    print(f"[KhetOS] Central API Engine running on http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
```

## 2. Returning `audio_base64` in `/api/telegram/bot/command` Route

In `api/app.py`, update `telegram_bot_command` around line 860:

```python
    # Clean markdown formatting for natural neural Hindi speech
    clean_speech_text = (
        reply.replace("*", "")
             .replace("•", "")
             .replace("`", "")
             .replace("━━━━━━━━━━━━━━━━━━", "")
             .replace("\n\n", " ")
    )
    audio_bytes = generate_hindi_audio(clean_speech_text[:200]) # First 200 chars for responsive audio
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else None

    return jsonify({
        "status": "SUCCESS",
        "command": command_text,
        "reply": reply,
        "audio_base64": audio_b64,
        "farmer_name": farmer_name,
        "phone": phone
    })
```

This ensures that the web UI `TelegramBotSimulator.jsx` plays authentic spoken Hindi audio when the farmer clicks "Listen to Spoken Hindi" in the web console.

## 3. Environment Variable Configuration (`api/.env`)

Ensure `api/.env` contains:
```env
PORT=5000
TELEGRAM_BOT_TOKEN=8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo
ENABLE_TELEGRAM_DAEMON=1
```
