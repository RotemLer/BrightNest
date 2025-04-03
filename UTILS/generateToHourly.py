import pandas as pd
from collections import Counter

# File paths
input_file = "C:\\Studies\\final project\\project\\generateDataSet\\Updated_HomeC.csv.gz"
output_file = "C:\\Studies\\final project\\project\\generateDataSet\\Hourly_HomeC.csv.gz"

# Columns
sum_columns = [col for col in pd.read_csv(input_file, nrows=1).columns if "kW" in col or "energy consumption" in col]
avg_columns = [
    "temperature", "humidity", "visibility", "apparentTemperature", "pressure",
    "windSpeed", "cloudCover", "windBearing", "precipIntensity", "dewPoint", "precipProbability",
    "boiler temp for 50 L with solar system", "boiler temp for 50 L without solar system",
    "boiler temp for 100 L with solar system", "boiler temp for 100 L without solar system",
    "boiler temp for 150 L with solar system", "boiler temp for 150 L without solar system"
]
mode_columns = ["icon", "summary"]

# Load full dataset (assuming it's manageable in memory now)
df = pd.read_csv(input_file, low_memory=False, compression='gzip', parse_dates=["time"])

# Sort by time just to be sure
df = df.sort_values(by="time").reset_index(drop=True)

# Add hour group
df["hour_group"] = df.index // 3600  # Every 3600 rows is a new hour

# Aggregation functions
agg_dict = {col: "sum" for col in sum_columns}
agg_dict.update({col: "mean" for col in avg_columns})
agg_dict.update({col: lambda x: Counter(x).most_common(1)[0][0] for col in mode_columns})
agg_dict["time"] = "first"  # Representative timestamp for each hour

# Perform aggregation
hourly_df = df.groupby("hour_group").agg(agg_dict).reset_index(drop=True)

# Round numeric columns
numeric_columns = hourly_df.select_dtypes(include=["number"]).columns
hourly_df[numeric_columns] = hourly_df[numeric_columns].round(4)

# Save to compressed CSV
hourly_df.to_csv(output_file, index=False, compression="gzip", float_format="%.4f")
print(f"✅ Hourly aggregated dataset saved to: {output_file}")
