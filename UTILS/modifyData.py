import pandas as pd
import random
from datetime import time

# File paths
input_file = "weather_hourly_2024.csv"
output_file = "Updated_With_Boiler_Hourly_Realistic_v4.csv.gz"

# Constants
BOILER_SIZES = [50, 100, 150]
ENERGY_PER_DEGREE_PER_LITER = 1.16 / 1000  # kWh per liter per °C
MAX_RADIATION = 1000  # radiation normalizations
HEATING_START = time(18, 0)
HEATING_END = time(21, 0)
MAX_TEMP_SOLAR = 60
MAX_TEMP_NO_SOLAR = 50

# Init
chunk_size = 100000
updated_chunks = []
previous_temps = {
    size: {"with": random.uniform(30, 35), "without": random.uniform(30, 35)}
    for size in BOILER_SIZES
}

for chunk in pd.read_csv(input_file, chunksize=chunk_size, low_memory=False, on_bad_lines="warn"):
    chunk["date"] = pd.to_datetime(chunk["date"], errors="coerce")
    chunk = chunk.dropna(subset=["date"])

    for size in BOILER_SIZES:
        chunk[f"boiler temp for {size} L with solar system"] = 0.0
        chunk[f"boiler temp for {size} L without solar system"] = 0.0
        chunk[f"energy consumption for {size}L boiler with solar system"] = 0.0
        chunk[f"energy consumption for {size}L boiler without solar system"] = 0.0

    for i in range(len(chunk)):
        row = chunk.iloc[i]
        ambient_temp = row["temperature_2m"]
        radiation = row.get("direct_radiation", 0)
        cloud_cover = row.get("cloud_cover", 0.0) / 100
        radiation_norm = min(radiation / MAX_RADIATION, 1.0)
        current_time = row["date"].time()
        is_heating_time = HEATING_START <= current_time < HEATING_END
        is_day = row.get("is_day", 0) == 1

        for size in BOILER_SIZES:
            prev_without = previous_temps[size]["without"]
            prev_with = previous_temps[size]["with"]

            def add_noise(base, level=0.3):
                return base + random.uniform(-level, level)

            # --- WITHOUT solar system ---
            min_temp_no_solar = 0.6 * ambient_temp
            temp_without = prev_without


            delta_env = ambient_temp - temp_without
            temp_without += 0.08 * delta_env + random.uniform(-0.1, 0.1)

            temp_without = max(min(add_noise(temp_without, 0.15), MAX_TEMP_NO_SOLAR), min_temp_no_solar)
            previous_temps[size]["without"] = temp_without

            # --- WITH solar system ---
            temp_with = prev_with
            size_modifier = 1 - (size - 50) / 200
            solar_gain = radiation_norm * (1 - cloud_cover) * size_modifier


            if is_day and radiation > 0:
                temp_with += solar_gain * 5
            else:
                delta_env = ambient_temp - temp_with
                temp_with += 0.08 * delta_env + random.uniform(-0.1, 0.1)

            if radiation > 0:
                temp_with = max(temp_with, temp_without + 0.5)

            temp_with = max(min(add_noise(temp_with, 0.15), MAX_TEMP_SOLAR), 0.6 * ambient_temp)
            previous_temps[size]["with"] = temp_with

            # Energy consumption
            energy_without = 0.0
            energy_with = 0.0

            chunk.at[chunk.index[i], f"boiler temp for {size} L without solar system"] = round(temp_without, 2)
            chunk.at[chunk.index[i], f"boiler temp for {size} L with solar system"] = round(temp_with, 2)
            chunk.at[chunk.index[i], f"energy consumption for {size}L boiler without solar system"] = round(energy_without, 4)
            chunk.at[chunk.index[i], f"energy consumption for {size}L boiler with solar system"] = round(energy_with, 4)

    updated_chunks.append(chunk)

# Save
print("✅ Start running!")
if updated_chunks:
    df_final = pd.concat(updated_chunks, ignore_index=True)
    numeric_columns = df_final.select_dtypes(include=["number"]).columns
    df_final[numeric_columns] = df_final[numeric_columns].round(4)
    df_final.to_csv(output_file, index=False, compression="gzip", float_format="%.4f")
    print(f"✅ The updated dataset has been saved to: {output_file}")
else:
    print("❌ No valid data to save.")