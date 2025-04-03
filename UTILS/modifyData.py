import pandas as pd
import random
from datetime import time

# File paths
input_file = "C:\\Studies\\final project\\generateDataSet\\home.csv"
output_file = "C:\\Studies\\final project\\generateDataSet\\Updated_With_Boiler_HomeC.csv.gz"

# Constants
BOILER_SIZES = [50, 100, 150]
SOLAR_TEMP_BONUS = 5
ENERGY_PER_DEGREE_PER_LITER = 1.16 / 1000  # kWh per liter per °C
HEATING_START = time(18, 0)
HEATING_END = time(21, 0)

# Init
chunk_size = 100000
updated_chunks = []
previous_temps = {size: {"with": None, "without": None} for size in BOILER_SIZES}

for chunk in pd.read_csv(input_file, chunksize=chunk_size, low_memory=False, on_bad_lines="warn"):
    chunk = chunk[chunk["time"].apply(lambda x: str(x).isdigit())]
    chunk["time"] = pd.to_datetime(chunk["time"].astype(float), unit="s", errors="coerce")

    if chunk["time"].notna().sum() == 0:
        print("⚠️ Skipped chunk due to invalid time format")
        continue

    chunk = chunk.dropna(subset=["time"])

    # Add new columns
    for size in BOILER_SIZES:
        chunk[f"boiler temp for {size} L with solar system"] = 0.0
        chunk[f"boiler temp for {size} L without solar system"] = 0.0
        chunk[f"energy consumption for {size}L boiler with solar system"] = 0.0
        chunk[f"energy consumption for {size}L boiler without solar system"] = 0.0

    for i in range(len(chunk)):
        row = chunk.iloc[i]
        ambient_temp = row["temperature"]
        solar_active = row.get("Solar [kW]", 0)
        cloud_cover = row["cloudCover"]
        current_time = row["time"].time()
        is_heating_time = HEATING_START <= current_time < HEATING_END
        is_night_cooling = time(0, 0) <= current_time < time(6, 0)

        for size in BOILER_SIZES:
            prev_without = previous_temps[size]["without"]
            prev_with = previous_temps[size]["with"]

            TARGET_TEMP = 60
            STABLE_RANGE = (55, 60)
            HEATING_RATE = (0.0025, 0.0035)  # °C per second
            COOLING_NIGHT = (0.005, 0.015)
            COOLING_DAY = (0.001, 0.005)


            def add_noise(base, level=0.3):
                return base + random.uniform(-level, level)


            # --- WITHOUT solar ---
            if prev_without is not None:
                if is_heating_time:
                    if prev_without < STABLE_RANGE[0]:
                        delta = TARGET_TEMP - prev_without
                        adjustment = random.uniform(*HEATING_RATE)
                        temp_without = prev_without + min(adjustment, delta)
                    else:
                        temp_without = add_noise(prev_without, 0.2)
                        temp_without = min(max(temp_without, STABLE_RANGE[0]), STABLE_RANGE[1])
                else:
                    cooling = random.uniform(*COOLING_NIGHT if is_night_cooling else COOLING_DAY)
                    temp_without = prev_without - cooling
                    temp_without = max(temp_without, 0.7 * ambient_temp)
            else:
                temp_without = 0.7 * ambient_temp + random.uniform(0, 2)

            # --- WITH solar ---
            solar_bonus = SOLAR_TEMP_BONUS * (1 - cloud_cover) if solar_active else 0
            if prev_with is not None:
                if is_heating_time:
                    if prev_with < STABLE_RANGE[0]:
                        delta = TARGET_TEMP - prev_with
                        adjustment = random.uniform(*HEATING_RATE)
                        temp_with = prev_with + min(adjustment, delta)
                    else:
                        temp_with = add_noise(prev_with + solar_bonus, 0.2)
                        temp_with = min(max(temp_with, STABLE_RANGE[0]), STABLE_RANGE[1])
                else:
                    cooling = random.uniform(*COOLING_NIGHT if is_night_cooling else COOLING_DAY)
                    temp_with = prev_with - cooling
                    temp_with = max(temp_with, 0.7 * ambient_temp + solar_bonus)
            else:
                temp_with = 0.7 * ambient_temp + random.uniform(0, 2) + solar_bonus

            # Save temperatures
            chunk.at[chunk.index[i], f"boiler temp for {size} L without solar system"] = round(temp_without, 2)
            chunk.at[chunk.index[i], f"boiler temp for {size} L with solar system"] = round(temp_with, 2)

            # Energy consumption only when temp increased during heating
            energy_without = 0.0
            energy_with = 0.0

            if is_heating_time and prev_without is not None:
                delta = max(0, temp_without - prev_without)
                energy_without = delta * size * ENERGY_PER_DEGREE_PER_LITER

            if is_heating_time and prev_with is not None:
                delta = max(0, temp_with - prev_with)
                energy_with = delta * size * ENERGY_PER_DEGREE_PER_LITER

            chunk.at[chunk.index[i], f"energy consumption for {size}L boiler without solar system"] = round(energy_without, 4)
            chunk.at[chunk.index[i], f"energy consumption for {size}L boiler with solar system"] = round(energy_with, 4)

            # Update previous temps across chunks
            previous_temps[size]["without"] = temp_without
            previous_temps[size]["with"] = temp_with

    updated_chunks.append(chunk)

# Combine and save
print("✅ Start running!")
if updated_chunks:
    updated_homec_df = pd.concat(updated_chunks, ignore_index=True)
    numeric_columns = updated_homec_df.select_dtypes(include=["number"]).columns
    updated_homec_df[numeric_columns] = updated_homec_df[numeric_columns].round(4)
    updated_homec_df.to_csv(output_file, index=False, compression="gzip", float_format="%.4f")
    print(f"✅ The updated dataset has been successfully saved as: {output_file}!")
else:
    print("❌ No valid data to save. Please check your input file.")
