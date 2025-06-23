import pandas as pd
from datetime import datetime, timedelta
from sdv.single_table import TVAESynthesizer
from sdv.metadata import SingleTableMetadata

# Load the synthetic data (if you already have the file ready)
df = pd.read_csv("Smoothed_Temperature_Home_Data.csv")
df.columns = df.columns.str.strip()
df["time"] = pd.to_datetime(df["time"], format="%Y-%m-%d %H:%M:%S")

# Feature Engineering
df["hour"] = df["time"].dt.hour
df["dayofyear"] = df["time"].dt.dayofyear
df = df.drop(columns=["time", "time.1"], errors="ignore")

# create Metadata
metadata = SingleTableMetadata()
metadata.detect_from_dataframe(data=df)

# Defining categorical columns
discrete_columns = df.select_dtypes(include="object").columns.tolist()
for col in discrete_columns:
    metadata.update_column(column_name=col, sdtype="categorical")

# create model
model = TVAESynthesizer(
    metadata=metadata,
    enforce_min_max_values=True,
    enforce_rounding=True
)

# training
print("🔧 מאמן את TVAE על הדאטה...")
model.fit(df)

# sampling
synthetic = model.sample(8760)

# make sure that the hours and days are correct.
synthetic["hour"] = synthetic["hour"].round().clip(0, 23).astype(int)
synthetic["dayofyear"] = synthetic["dayofyear"].round().clip(1, 365).astype(int)

# ✨ Creating an accurate time sequence (by hour of the day and day of the year)
start_date = datetime(2024, 1, 1)
hourly_time_range = [start_date + timedelta(hours=i) for i in range(8760)]

# ✨ Sort the data in a logical order to match the time sequence
synthetic = synthetic.sort_values(["dayofyear", "hour"]).reset_index(drop=True)
synthetic["time"] = hourly_time_range

# Rearrange the columns
cols = ["time"] + [col for col in synthetic.columns if col != "time"]
synthetic = synthetic[cols]

# saving
synthetic.to_csv("synthetic_tvae_smoothed_fixed_time.csv", index=False)
print("✅ synthetic_tvae_smoothed_fixed_time.csv נוצר בהצלחה!")