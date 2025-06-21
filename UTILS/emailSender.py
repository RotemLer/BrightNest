import smtplib
import threading
from datetime import datetime
from email.message import EmailMessage
import os
from dotenv import load_dotenv
from flask import g
from bson import ObjectId
from flask import current_app
import jwt


def get_user_email_from_g():
    from Backend.userRoutes import users_collection
    user_data = g.get("user")

    print("🧠 g.user:", user_data)

    if not user_data:
        return None

    email_or_id = user_data.get("_id")
    if not email_or_id:
        print("❌ No _id found in g.user")
        return None

    user = None
    try:
        # Try ObjectId first
        user = users_collection.find_one({"_id": ObjectId(email_or_id)})
    except Exception:
        # It's probably an email
        user = users_collection.find_one({"username": email_or_id})

    if user:
        print("✅ Found user in DB:", user)
    else:
        print("❌ No user found in MongoDB")

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


def send_alert_to_logged_in_user(subject: str, message: str, user_email=None, name=None):
    try:
        # Fallback to g.user if email not passed explicitly
        if not user_email:
            user_context = g.get("user")
            user_email = user_context["_id"] if user_context else None

        if not user_email:
            print("⚠️ No email found (user_email is None).")
            return

        print(f"📤 Email will be sent to: {user_email}")

        # Add name if available
        personalized_message = f"{message}\n\n👤 מיועד עבור: {name}" if name else message

        send_alert_email(
            to_email=user_email,
            subject=subject,
            message=personalized_message
        )
        print(f"📬 Alert email sent to {user_email}")

    except Exception as e:
        print(f"❌ Error sending user alert email: {e}")

def schedule_heating_email(heating_start_time: datetime, target_time: datetime, app, test_mode=False):
    now = datetime.now()

    if test_mode:
        delay_seconds = 5
        print("🧪 [TEST MODE ENABLED] Email will be sent in 5 seconds.")
    else:
        delay_seconds = (heating_start_time - now).total_seconds()

    subject = "🔥 BrightNest: Boiler Heating Started"
    message = f"הדוד שלך צריך להתחיל להתחמם עכשיו כדי להגיע לטמפרטורה הרצויה עד {target_time.strftime('%H:%M')}."

    user_context = g.get("user")
    print("🔐 Captured g.user for thread:", user_context)

    def job():
        with app.app_context():
            g.user = user_context
            print(f"📨 [Thread] Triggered at: {datetime.now().strftime('%H:%M:%S')}")
            print(f"🧠 g.user: {g.get('user')}")
            send_alert_to_logged_in_user(subject=subject, message=message)

    if delay_seconds <= 0:
        print("⚠️ Heating time already passed — sending email immediately.")
        with app.app_context():
            g.user = user_context
            print(f"📨 [Immediate] Triggered at: {datetime.now().strftime('%H:%M:%S')}")
            print(f"🧠 g.user: {g.get('user')}")
            send_alert_to_logged_in_user(subject=subject, message=message)
    else:
        print(f"⏱ Email scheduled in {delay_seconds:.1f} seconds (target: {target_time.strftime('%H:%M')})")
        threading.Timer(delay_seconds, job).start()

def get_user_email_from_token(token: str):
    try:
        decoded = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        user_email = decoded.get("email") or decoded.get("username")  # depending on your payload
        if not user_email:
            print("❌ Email not found in token payload.")
        return user_email
    except jwt.ExpiredSignatureError:
        print("❌ Token has expired.")
    except jwt.InvalidTokenError as e:
        print(f"❌ Invalid token: {e}")
    return None