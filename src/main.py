import time
import sys
from .config import CHECK_INTERVAL_SECONDS, FR_THRESHOLD
from .fr_monitor import fetch_funding_rates, check_thresholds, format_message
from .notifier import send_telegram_message

def main():
    print(f"Starting Hyperliquid FR Bot...")
    print(f"Interval: {CHECK_INTERVAL_SECONDS}s")
    print(f"Threshold: {FR_THRESHOLD} (approx {FR_THRESHOLD*100}%)")
    
    while True:
        try:
            print("Fetching funding rates...")
            rates = fetch_funding_rates()
            if not rates:
                print("No rates fetched, retrying next interval.")
            else:
                abnormal = check_thresholds(rates, FR_THRESHOLD)
                
                if abnormal:
                    print(f"Found {len(abnormal)} abnormal rates.")
                    message = format_message(abnormal)
                    if message:
                        print("Sending notification...")
                        success = send_telegram_message(message)
                        if success:
                            print("Notification sent successfully.")
                        else:
                            print("Failed to send notification.")
                else:
                    print("No abnormal rates found.")
            
        except KeyboardInterrupt:
            print("\nStopping bot.")
            sys.exit(0)
        except Exception as e:
            print(f"Unexpected error in main loop: {e}")
            
        print(f"Sleeping for {CHECK_INTERVAL_SECONDS}s...")
        time.sleep(CHECK_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
