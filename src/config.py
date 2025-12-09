import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Configuration Constants
CHECK_INTERVAL_SECONDS = int(os.getenv("CHECK_INTERVAL_SECONDS", "300"))
FR_THRESHOLD = float(os.getenv("FR_THRESHOLD", "0.0001"))
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
