import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv
from flask import g
from bson import ObjectId

def get_user_email_from_g():
    from Backend.userRoutes import users_collection
    user_id = g.get("user", {}).get("_id")
    print("🧪 get_user_email_from_g() -> user_id from g:", user_id)

    if not user_id:
        return None

    try:
        # Try as ObjectId
        user = users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        # Fallback: maybe it's an email (from old token)
        user = users_collection.find_one({"email": user_id})

    return user.get("username") if user else None



def send_alert_email(to_email, subject, message):
    dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Backend', '.env'))
    print("🔍 Looking for .env at:", dotenv_path)

    loaded = load_dotenv(dotenv_path=dotenv_path)
    print("✅ .env loaded:", loaded)

    EMAIL_ADDRESS = os.getenv('EMAIL_USER')
    EMAIL_PASSWORD = os.getenv('EMAIL_PASS')

    if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
        print("❌ EMAIL_USER or EMAIL_PASS is missing. Check .env formatting.")
        return

    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = to_email
        msg.set_content(message)

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)

        print(f"📬 Email sent to {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")


def send_alert_to_logged_in_user(subject: str, message: str):
    """
    Sends an email alert to the currently logged-in user's email.
    """
    try:
        user_email = get_user_email_from_g()
        if user_email:
            print(f"📤 Email will be sent to: {user_email}")
            send_alert_email(
                to_email=user_email,
                subject=subject,
                message=message
            )
            print(f"📬 Alert email sent to {user_email}")
        else:
            print("⚠️ No email found for current user (maybe not authenticated).")
    except Exception as e:
        print(f"❌ Error sending user alert email: {e}")
