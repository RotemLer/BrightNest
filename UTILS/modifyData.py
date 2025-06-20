import pandas as pd
import numpy as np
import random

# File paths
input_file = "weather_hourly_2024.csv"
output_file = "Updated_With_Boiler_Hourly_Realistic_v4.csv.gz"

# Constants
BOILER_SIZES = [50, 100, 150]
MAX_TEMP_LIMIT = 90
chunk_size = 100000

# Physical constants
WATER_DENSITY = 1  # kg/L
WATER_HEAT_CAPACITY = 4.18  # kJ/kg°C
SOLAR_EFFICIENCY = 0.60
COLLECTOR_AREA = 3.0  # m²
INSULATION_K = 0.035
INSULATION_THICKNESS = 0.05  # m
MIN_EFFECTIVE_RADIATION = 100
MAX_COOLING_PER_HOUR = 0.8

COLLECTOR_EFFICIENCY_PER_SIZE = {
    50: 1.0,
    100: 0.85,
    150: 0.75
}

# Starting boiler temperatures
previous_temps = {
    size: {"with": random.uniform(30, 35), "without": random.uniform(30, 35)}
    for size in BOILER_SIZES
}

# === Solar heating function ===
def compute_solar_heating(prev_temp, radiation, cloud_cover, hour, volume_liters, ambient_temp):
    if 6 <= hour <= 18 and radiation > MIN_EFFECTIVE_RADIATION:

        hour_weight = np.exp(-((hour - 13.5) ** 2) / 3.0)
        cloud_factor = (1 - cloud_cover) ** 1.2
        temp_loss_factor = max(0.3, 1 - ((prev_temp - 45) / 40))
        size_eff = COLLECTOR_EFFICIENCY_PER_SIZE.get(volume_liters, 0.8)


        ambient_factor = np.clip((ambient_temp - 5) / 15, 0.0, 1.0)

        radiation_factor = np.clip((radiation - 100) / 400, 0.0, 1.0)


        effective_radiation = (
            radiation * cloud_factor *
            SOLAR_EFFICIENCY * hour_weight *
            temp_loss_factor * size_eff *
            ambient_factor * radiation_factor * 1.15
        )


        energy_kWh = (effective_radiation / 1000) * COLLECTOR_AREA
        energy_kJ = energy_kWh * 3600
        mass = volume_liters * WATER_DENSITY
        delta_temp = energy_kJ / (mass * WATER_HEAT_CAPACITY)

        temp = prev_temp + delta_temp + np.random.normal(0, 0.05)
        return temp
    else:
        return prev_temp

# === Cooling function ===
def compute_physical_cooling(prev_temp, ambient_temp, volume_liters, hour, wind_speed):
    mass = volume_liters * WATER_DENSITY
    delta_T = prev_temp - ambient_temp
    if delta_T <= 0:
        return prev_temp

    surface_area = 1.1 + 0.01 * volume_liters
    insulation_variation = 1.0 + np.random.normal(0, 0.02)
    U_value = (INSULATION_K / INSULATION_THICKNESS) * insulation_variation
    Q_watts = U_value * surface_area * delta_T
    Q_kJ = Q_watts * 3600 / 1000
    delta_temp = Q_kJ / (mass * WATER_HEAT_CAPACITY)

    # השפעת שעה ביום
    if hour >= 21 or hour <= 5:
        hour_factor = 1.3
    elif 6 <= hour <= 9 or 18 <= hour <= 20:
        hour_factor = 0.7
    else:
        hour_factor = 0.3

    if 13 <= hour <= 16 and ambient_temp > 27:
        hour_factor *= 0.6

    # רוח ובידוד
    wind_factor = 1 + 0.05 * wind_speed
    insulation_factor = 1 - (volume_liters - 50) / 300

    delta_temp *= hour_factor * wind_factor * insulation_factor
    delta_temp = min(delta_temp, MAX_COOLING_PER_HOUR)

    return prev_temp - delta_temp + np.random.normal(0, 0.05)

# === Main loop ===
updated_chunks = []

for chunk in pd.read_csv(input_file, chunksize=chunk_size, low_memory=False, on_bad_lines="warn"):
    chunk["date"] = pd.to_datetime(chunk["date"], errors="coerce")
    chunk = chunk.dropna(subset=["date"])

    for size in BOILER_SIZES:
        chunk[f"boiler temp for {size} L with solar system"] = 0.0
        chunk[f"boiler temp for {size} L without solar system"] = 0.0

    for i in range(len(chunk)):
        row = chunk.iloc[i]
        hour = row["date"].hour
        ambient_temp = row["temperature_2m"]
        radiation = row.get("direct_radiation", 0)
        cloud_cover = row.get("cloud_cover", 0.0) / 100
        wind_speed = row.get("wind_speed_10m", 0)

        for size in BOILER_SIZES:
            prev_with = previous_temps[size]["with"]
            prev_without = previous_temps[size]["without"]

            temp_with = compute_solar_heating(prev_with, radiation, cloud_cover, hour, size, ambient_temp)
            temp_with = compute_physical_cooling(temp_with, ambient_temp, size, hour, wind_speed)

            temp_without = compute_physical_cooling(prev_without, ambient_temp, size, hour, wind_speed)


            temp_with = max(temp_with, temp_without + 1.5)
            min_temp = 0.6 * ambient_temp
            temp_with = np.clip(temp_with, min_temp, MAX_TEMP_LIMIT)
            temp_without = np.clip(temp_without, min_temp, MAX_TEMP_LIMIT)

            previous_temps[size]["with"] = temp_with
            previous_temps[size]["without"] = temp_without

            chunk.at[chunk.index[i], f"boiler temp for {size} L with solar system"] = round(temp_with, 2)
            chunk.at[chunk.index[i], f"boiler temp for {size} L without solar system"] = round(temp_without, 2)

    updated_chunks.append(chunk)

# === Save result ===
print("✅ Start running!")
if updated_chunks:
    df_final = pd.concat(updated_chunks, ignore_index=True)
    numeric_columns = df_final.select_dtypes(include=["number"]).columns
    df_final[numeric_columns] = df_final[numeric_columns].round(4)
    df_final.to_csv(output_file, index=False, compression="gzip", float_format="%.4f")
    print(f"✅ Dataset saved to: {output_file}")
else:
    print("❌ No valid data to save.")