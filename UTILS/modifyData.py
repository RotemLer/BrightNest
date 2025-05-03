import pandas as pd
import numpy as np
import random

# File paths
input_file = "weather_hourly_2024.csv"
output_file = "Updated_With_Boiler_Hourly_Realistic_v4.csv.gz"

# Constants
BOILER_SIZES = [50, 100, 150]
ENERGY_PER_DEGREE_PER_LITER = 1.16 / 1000
MAX_RADIATION = 1000
MAX_TEMP_SOLAR = 60
MAX_TEMP_NO_SOLAR = 50
BASE_COOLING_RATE = 0.02
MIN_EFFECTIVE_RADIATION = 100
chunk_size = 100000

# Starting temperatures
previous_temps = {
    size: {"with": random.uniform(30, 35), "without": random.uniform(30, 35)}
    for size in BOILER_SIZES
}

updated_chunks = []

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
        hour = row["date"].hour
        is_day = row.get("is_day", 0) == 1

        # ✅ חימום סולארי רק משעה 08:00, שיא ב-13:30
        if hour < 8:
            hour_weight = 0
        else:
            hour_weight = np.exp(-((hour - 13.5) ** 2) / 1.5)

        solar_factor = hour_weight

        for size in BOILER_SIZES:
            prev_without = previous_temps[size]["without"]
            prev_with = previous_temps[size]["with"]

            def add_noise(base, level=0.3):
                return base + random.uniform(-level, level)

            # ❄️ WITHOUT solar system — קירור קשיח בלילה
            min_temp_no_solar = 0.6 * ambient_temp
            if 0 <= hour <= 6:
                temp_without = prev_without - 0.25 + random.uniform(-0.05, 0.05)
            else:
                delta_env = prev_without - ambient_temp
                cooling_rate_no_solar = BASE_COOLING_RATE + (0.5 / size)
                temp_without = prev_without - cooling_rate_no_solar * delta_env + random.uniform(-0.05, 0.05)

            temp_without = max(min(add_noise(temp_without, 0.15), MAX_TEMP_NO_SOLAR), min_temp_no_solar)
            previous_temps[size]["without"] = temp_without

            # ☀️ WITH solar system — חימום חזק, החל מ-08:00
            temp_with = prev_with
            size_modifier = 1 - (size - 50) / 200

            if is_day and radiation > MIN_EFFECTIVE_RADIATION:
                solar_gain = radiation_norm * (1 - cloud_cover) * size_modifier * solar_factor
                temp_with += solar_gain * 10  # ✅ חיזוק האפקט
            else:
                delta_env = temp_with - ambient_temp
                cooling_rate = BASE_COOLING_RATE + (0.5 / size)

                if 10 <= hour <= 14 and radiation > 200:
                    cooling_rate *= 0.5
                elif 0 <= hour <= 6:
                    cooling_rate *= 1.3
                elif 16 <= hour <= 18 and radiation > 30:
                    cooling_rate *= 0.4
                elif radiation > 50:
                    cooling_rate *= 0.6

                temp_with -= cooling_rate * delta_env + random.uniform(-0.05, 0.05)

            if radiation > 0:
                temp_with = max(temp_with, temp_without + 0.5)

            temp_with = max(min(add_noise(temp_with, 0.15), MAX_TEMP_SOLAR), 0.6 * ambient_temp)
            previous_temps[size]["with"] = temp_with

            # שמירה ל-DataFrame
            chunk.at[chunk.index[i], f"boiler temp for {size} L without solar system"] = round(temp_without, 2)
            chunk.at[chunk.index[i], f"boiler temp for {size} L with solar system"] = round(temp_with, 2)
            chunk.at[chunk.index[i], f"energy consumption for {size}L boiler without solar system"] = 0.0
            chunk.at[chunk.index[i], f"energy consumption for {size}L boiler with solar system"] = 0.0

    updated_chunks.append(chunk)

# שמירה לקובץ
print("✅ Start running!")
if updated_chunks:
    df_final = pd.concat(updated_chunks, ignore_index=True)
    numeric_columns = df_final.select_dtypes(include=["number"]).columns
    df_final[numeric_columns] = df_final[numeric_columns].round(4)
    df_final.to_csv(output_file, index=False, compression="gzip", float_format="%.4f")
    print(f"✅ The updated dataset has been saved to: {output_file}")
else:
    print("❌ No valid data to save.")