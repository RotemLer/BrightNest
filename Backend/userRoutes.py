from flask import Blueprint, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
from Backend.dailyStatsLogger import save_daily_summary

# === Blueprint ===
userApi = Blueprint('userApi', __name__)
CORS(userApi, resources={r"/*": {"origins": [
    "http://localhost:3000",
    "https://brightnest-ui.onrender.com"
]}}, supports_credentials=True)

# === MongoDB Connection ===
client = MongoClient("mongodb+srv://Rotem1234:12341234@smarthouseoptimizationd.thazr.mongodb.net/?retryWrites=true&w=majority&appName=SmartHouseOptimizationDB")
db = client["SmartHouseOptimizationDB"]
users_collection = db["users"]

# === Routes ===

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

@userApi.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = users_collection.find_one({"username": username})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    access_token = create_access_token(identity=username)
    return jsonify({"message": "Login successful!", "token": access_token}), 200

@userApi.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    username = get_jwt_identity()
    user = users_collection.find_one({"username": username}, {"_id": 0, "password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.setdefault("preferences", {})
    user.setdefault("devices", [])
    user.setdefault("family", [])

    return jsonify(user), 200

@userApi.route('/profile/update', methods=['PUT'])
@jwt_required()
def update_profile():
    username = get_jwt_identity()
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

@userApi.route('/family', methods=['GET'])
@jwt_required()
def get_family():
    username = get_jwt_identity()
    user = users_collection.find_one({"username": username}, {"_id": 0, "family": 1})
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.setdefault("family", [])
    return jsonify(user), 200

@userApi.route('/family/update', methods=['PUT'])
@jwt_required()
def update_family():
    username = get_jwt_identity()
    data = request.get_json()
    family = data.get("family", [])

    result = users_collection.update_one({"username": username}, {"$set": {"family": family}})
    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    save_daily_summary(username, db, users_collection)
    return jsonify({"message": "Family updated successfully"}), 200

@userApi.route('/device-data', methods=['GET'])
@jwt_required()
def get_device_data():
    username = get_jwt_identity()
    user = users_collection.find_one({"username": username}, {"_id": 0, "devices": 1, "family": 1})
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.setdefault("devices", [])
    user.setdefault("family", [])
    return jsonify(user), 200

@userApi.route('/device-data/update', methods=['PUT'])
@jwt_required()
def update_device_data():
    username = get_jwt_identity()
    data = request.get_json()
    devices = data.get("devices", [])
    family = data.get("family", [])

    result = users_collection.update_one(
        {"username": username},
        {"$set": {"devices": devices, "family": family}}
    )

    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "Device data updated successfully"}), 200

@userApi.route('/summary/today', methods=['GET'])
@jwt_required()
def get_today_summary():
    today = datetime.now().strftime("%Y-%m-%d")
    username = get_jwt_identity()

    summary = db["dailySummaries"].find_one({
        "user_id": username,
        "date": today
    }, {"_id": 0})

    if not summary:
        return jsonify({"message": "No summary for today"}), 204

    return jsonify(summary), 200

@userApi.route('/summaries/week', methods=['GET'])
@jwt_required()
def get_weekly_summaries():
    today = datetime.now().date()
    week_ago = today - timedelta(days=6)
    username = get_jwt_identity()

    summaries = list(db["dailySummaries"].find({
        "user_id": username,
        "date": {"$gte": week_ago.isoformat()}
    }, {"_id": 0}).sort("date", 1))

    return jsonify(summaries[-7:]), 200