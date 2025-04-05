from Loader_Saver.modelSaver import save_model_and_scalers

def save_default_model(l_model, scaler_x, scaler_y,l_model_name, X_train, weather_features):
    l_metadata = {
        "version": "v1.0",
        "trained_on": "Hourly_HomeC.csv",
        "training_rows": len(X_train),
        "epochs": 20,
        "batch_size": 32,
        "sequence_length": 60,
        "input_features": weather_features,
        "target_feature": "boiler temp for 150 L with solar system",
        "mae": 85.32,  # You can later pass these as args
        "error_percent": 6.41,
        "notes": "Baseline test model"
    }

    save_model_and_scalers(
        l_model=l_model,
        l_input_scaler=scaler_x,
        l_output_scaler=scaler_y,
        l_model_name=l_model_name,
        l_metadata=l_metadata
    )

    print("Model saved successfully")
