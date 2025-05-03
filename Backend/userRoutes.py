import jwt
from functools import wraps
from flask import request, jsonify, current_app
from datetime import datetime, timedelta
from flask import Blueprint
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash

# Create Blueprint
userApi = Blueprint('userApi', __name__)

# Connect to MongoDB
client = MongoClient("mongodb+srv://Dan1234:12341234@smarthouseoptimizationd.thazr.mongodb.net/?retryWrites=true&w=majority&appName=SmartHouseOptimizationDB")
db = client["SmartHouseOptimizationDB"]
users_collection = db["users"]

# Token checker decorator
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
            request.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token!"}), 401

        return f(*args, **kwargs)
    return decorated

# Registration route
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
        "devices": []
    }

    users_collection.insert_one(user_data)

    return jsonify({"message": "User created successfully!"}), 201

# Login route
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
            "user_id": str(user["_id"]),
            "username": user["username"],
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm="HS256")

        return jsonify({"message": "Login successful!", "token": token}), 200
    else:
        return jsonify({"error": "Invalid password"}), 401



@userApi.route('/profile', methods=['GET'])
@token_required
def get_profile():
    username = request.user['username']  # Extract from JWT

    # Find the user, hide sensitive fields (_id, password)
    user = users_collection.find_one(
        {"username": username},
        {"_id": 0, "password": 0}
    )

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(user), 200


@userApi.route('/profile/update', methods=['PUT'])
@token_required
def update_profile():
    username = request.user['username']
    data = request.get_json()

    # Extract the fields we want to update
    preferences = {
        "boilerSize": data.get("boilerSize"),
        "boilerType": data.get("boilerType"),
        "showerTime": data.get("showerTime"),
        "showerCount": data.get("showerCount")
    }

    # Update the preferences field
    result = users_collection.update_one(
        {"username": username},
        {"$set": {"preferences": preferences}}
    )

    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "Profile updated successfully"}), 200

@userApi.route('/device-data', methods=['GET'])
@token_required
def get_device_data():
    username = request.user['username']

    user = users_collection.find_one(
        {"username": username},
        {"_id": 0, "devices": 1, "family": 1}
    )

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Ensure both fields exist
    if "devices" not in user:
        user["devices"] = []
    if "family" not in user:
        user["family"] = []

    return jsonify(user), 200


@userApi.route('/device-data/update', methods=['PUT'])
@token_required
def update_device_data():
    username = request.user['username']
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

    return jsonify({"message": "Device and family data updated successfully"}), 200



# Protected route
@userApi.route('/protected', methods=['GET'])
@token_required
def protected():
    return jsonify({"message": "You accessed a protected route!"})
