# === modelLoader.py ===
# Handles loading models and their corresponding scalers
# Complies with your naming rules: k_ for constants, l_ for local vars

from tensorflow.keras.models import load_model
import joblib
import json
import os

# === Constants ===
k_model_dir = "../UTILS/models"
k_scaler_dir = "../UTILS/scalers"
k_metadata_dir = "../UTILS/metadata"

def load_model_and_scalers(l_model_name):
    """
    Load a Keras model along with its input and output scalers.

    Args:
        l_model_name: Base name used when the model and scalers were saved

    Returns:
        Tuple: (model, input_scaler, output_scaler, metadata_dict or None)
    """
    # === Load model ===
    l_model_path = f"{k_model_dir}/{l_model_name}.h5"
    l_model = load_model(l_model_path, compile=False)

    # === Load scalers ===
    l_input_scaler = joblib.load(f"{k_scaler_dir}/{l_model_name}_input_scaler.pkl")
    l_output_scaler = joblib.load(f"{k_scaler_dir}/{l_model_name}_output_scaler.pkl")

    # === Load metadata if available ===
    l_metadata_path = f"{k_metadata_dir}/{l_model_name}_metadata.json"
    l_metadata = None
    if os.path.exists(l_metadata_path):
        with open(l_metadata_path, "r") as f:
            l_metadata = json.load(f)

    print(f"📦 Loaded model and scalers for: {l_model_name}")
    return l_model, l_input_scaler, l_output_scaler, l_metadata
