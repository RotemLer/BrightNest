# === modelSaver.py ===
# Handles saving trained models, scalers, and optional metadata.
# Complies with your naming rules: k_ for constants, l_ for local vars

from tensorflow.keras.models import save_model
import joblib
import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo
import tensorflow as tf
import sys

# === Constants ===
k_model_dir = "../Loader_Saver/models"
k_scaler_dir = "../Loader_Saver/scalers"
k_metadata_dir = "../Loader_Saver/metadata"

# Ensure directories exist
os.makedirs(k_model_dir, exist_ok=True)
os.makedirs(k_scaler_dir, exist_ok=True)
os.makedirs(k_metadata_dir, exist_ok=True)

def save_model_and_scalers(l_model, l_input_scaler, l_output_scaler, l_model_name, l_metadata=None):
    """
    Save a Keras model and associated input/output scalers.

    Args:
        l_model: Trained Keras model
        l_input_scaler: Scaler used to scale input features
        l_output_scaler: Scaler used to scale target values
        l_model_name: Base name to use for saved files (no extension)
        l_metadata: Optional dict of metadata (version, date, comments, etc.)
    """
    # === Save model ===
    l_model_path = f"{k_model_dir}/{l_model_name}.h5"
    save_model(l_model, l_model_path)

    # === Save scalers ===
    joblib.dump(l_input_scaler, f"{k_scaler_dir}/{l_model_name}_input_scaler.pkl")
    joblib.dump(l_output_scaler, f"{k_scaler_dir}/{l_model_name}_output_scaler.pkl")

    # === Save metadata (optional) ===
    if l_metadata:
        l_metadata_path = f"{k_metadata_dir}/{l_model_name}_metadata.json"

        # Add standard fields automatically
        l_metadata["saved_at"] = datetime.now(ZoneInfo("Asia/Jerusalem")).isoformat()
        l_metadata["tensorflow_version"] = tf.__version__
        l_metadata["python_version"] = sys.version

        with open(l_metadata_path, "w") as f:
            json.dump(l_metadata, f, indent=4)

    print(f"✅ Model and scalers saved under name: {l_model_name}")