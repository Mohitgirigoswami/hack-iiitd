"""
Standalone Telegram Bot Runner for KhetOS (खेतOS).
Can be run independently or via process manager.
"""
import os
import sys

# Ensure api directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from adapters.telegram_bot import init_telegram_bot, TELEGRAM_BOT_TOKEN

def main():
    print(f"[KhetOS] Initializing Telegram Bot Daemon (Token: {TELEGRAM_BOT_TOKEN[:10]}...)...")
    bot = init_telegram_bot()
    if not bot:
        print("[Error] Failed to initialize Telegram Bot. Check TELEGRAM_BOT_TOKEN in .env.")
        sys.exit(1)

    print("[KhetOS] Telegram bot long-polling started. Listening for updates...")
    bot.infinity_polling(timeout=20, long_polling_timeout=10)

if __name__ == "__main__":
    main()
