from flask import Blueprint, request, jsonify, current_app, g
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime, timedelta
from Backend.dailyStatsLogger import save_daily_summary
import jwt
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import jsonify, g

userApi = Blueprint('userApi', __name__)
CORS(userApi, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# חיבור למונגו
client = MongoClient("mongodb+srv://Rotem1234:12341234@smarthouseoptimizationd.thazr.mongodb.net/?retryWrites=true&w=majority&appName=SmartHouseOptimizationDB")
db = client["SmartHouseOptimizationDB"]
users_collection = db["users"]

# אימות טוקן
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"error": "Token is missing!"}), 401

        try:
            decoded = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            g.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token!"}), 401

        return f(*args, **kwargs)
    return decorated

# הרשמה
@userApi.route('/register', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    full_name = data.get('full_name')

    if not username or not password or not full_name:
        return jsonify({"error": "Username, full name, and password are required"}), 400

    if users_collection.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 409

    hashed_password = generate_password_hash(password)
    user_data = {
        "username": username,
        "password": hashed_password,
        "full_name": full_name,
        "preferences": {},
        "devices": [],
        "family": []
    }
    users_collection.insert_one(user_data)

    return jsonify({"message": "User created successfully!"}), 201

#התחברות
@userApi.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = users_collection.find_one({"username": username})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if check_password_hash(user["password"], password):
        payload = {
            "sub": user["username"],  # 🟢 חובה עבור flask_jwt_extended
            "user_id": str(user["_id"]),
            "username": user["username"],
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({"message": "Login successful!", "token": token}), 200

    return jsonify({"error": "Invalid password"}), 401
# שליפת פרופיל
@userApi.route('/profile', methods=['GET'])
@token_required
def get_profile():
    username = g.user['username']
    user = users_collection.find_one({"username": username}, {"_id": 0, "password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.setdefault("preferences", {})
    user.setdefault("devices", [])
    user.setdefault("family", [])

    return jsonify(user), 200

# עדכון פרופיל (preferences, devices, full_name)
@userApi.route('/profile/update', methods=['PUT'])
@token_required
def update_profile():
    username = g.user['username']
    data = request.get_json()

    updates = {}
    if "preferences" in data:
        updates["preferences"] = data["preferences"]
    if "devices" in data:
        updates["devices"] = data["devices"]
    if "full_name" in data:
        updates["full_name"] = data["full_name"]

    if not updates:
        return jsonify({"error": "No data to update"}), 400

    result = users_collection.update_one({"username": username}, {"$set": updates})
    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "Profile updated successfully"}), 200

# שליפת בני משפחה
@userApi.route('/family', methods=['GET'])
@token_required
def get_family():
    username = g.user['username']
    user = users_collection.find_one({"username": username}, {"_id": 0, "family": 1})
    if not user:
        return jsonify({"error": "User not found"}), 404
    user.setdefault("family", [])
    return jsonify(user), 200

# עדכון בני משפחה
@userApi.route('/family/update', methods=['PUT'])
@token_required
def update_family():
    username = g.user['username']
    data = request.get_json()
    family = data.get("family", [])
    result = users_collection.update_one({"username": username}, {"$set": {"family": family}})

    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    save_daily_summary(username, db, users_collection)
    return jsonify({"message": "Family updated successfully"}), 200


# ✅ שליפת device-data (devices + family)
@userApi.route('/device-data', methods=['GET'])
@token_required
def get_device_data():
    username = g.user['username']
    user = users_collection.find_one({"username": username}, {"_id": 0, "devices": 1, "family": 1})
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.setdefault("devices", [])
    user.setdefault("family", [])
    return jsonify(user), 200

# ✅ עדכון device-data (devices + family)
@userApi.route('/device-data/update', methods=['PUT'])
@token_required
def update_device_data():
    username = g.user['username']
    data = request.get_json()

    devices = data.get("devices", [])
    family = data.get("family", [])

    result = users_collection.update_one(
        {"username": username},
        {"$set": {
            "devices": devices,
            "family": family
        }}
    )

    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "Device data updated successfully"}), 200

# בדיקת טוקן
@userApi.route('/protected', methods=['GET'])
@token_required
def protected():
    return jsonify({"message": f"You accessed a protected route as {g.user['username']}!"})


from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity




# REPLACE the /summary/today route with this version:
@userApi.route('/summary/today', methods=['GET'])
@jwt_required()  # ✅ Use flask_jwt_extended instead of @token_required
def get_today_summary():
    from datetime import datetime

    today = datetime.now().strftime("%Y-%m-%d")
    username = get_jwt_identity()  # ✅ Get directly from JWT token

    print(f"🔍 Querying summary for user_id: {username} and date: {today}")

    summary = db["dailySummaries"].find_one({
        "user_id": username,
        "date": today
    }, {"_id": 0})

    print("📦 Found summary:", summary)

    if not summary:
        return jsonify({"message": "No summary for today"}), 204

    return jsonify(summary), 200

@userApi.route('/summaries/week', methods=['GET'])
@token_required
def get_weekly_summaries():
    from datetime import datetime, timedelta

    username = g.user.get("username")
    if not username:
        return jsonify({"error": "Missing username"}), 401

    today = datetime.now().date()
    week_ago = today - timedelta(days=6)

    summaries = list(db["dailySummaries"].find({
        "user_id": username,
        "date": {"$gte": week_ago.isoformat()}  # this works even if fewer than 7
    }, {"_id": 0}).sort("date", 1))

    print("🔍 Weekly summary query result:", summaries)

    return jsonify(summaries[-7:]), 200  # last 7 entries only, if you expect more

