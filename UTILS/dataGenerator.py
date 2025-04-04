import pandas as pd
from datetime import datetime, timedelta
from sdv.single_table import TVAESynthesizer
from sdv.metadata import SingleTableMetadata

# טען את הדאטה הסינתטי (אם כבר יש לך את הקובץ מוכן)
df = pd.read_csv("Smoothed_Temperature_Home_Data.csv")
df.columns = df.columns.str.strip()
df["time"] = pd.to_datetime(df["time"], format="%Y-%m-%d %H:%M:%S")

# Feature Engineering
df["hour"] = df["time"].dt.hour
df["dayofyear"] = df["time"].dt.dayofyear
df = df.drop(columns=["time", "time.1"], errors="ignore")

# יצירת Metadata
metadata = SingleTableMetadata()
metadata.detect_from_dataframe(data=df)

# הגדרת עמודות קטגוריאליות
discrete_columns = df.select_dtypes(include="object").columns.tolist()
for col in discrete_columns:
    metadata.update_column(column_name=col, sdtype="categorical")

# יצירת המודל
model = TVAESynthesizer(
    metadata=metadata,
    enforce_min_max_values=True,
    enforce_rounding=True
)

# אימון
print("🔧 מאמן את TVAE על הדאטה...")
model.fit(df)

# דגימה
synthetic = model.sample(8760)

# נוודא שהשעות והימים תקינים
synthetic["hour"] = synthetic["hour"].round().clip(0, 23).astype(int)
synthetic["dayofyear"] = synthetic["dayofyear"].round().clip(1, 365).astype(int)

# ✨ יצירת רצף זמן מדויק (לפי סדר שעה ביממה ויום בשנה)
start_date = datetime(2024, 1, 1)
hourly_time_range = [start_date + timedelta(hours=i) for i in range(8760)]

# ✨ מיון הדאטה לפי סדר הגיוני כדי להתאים לרצף הזמן
synthetic = synthetic.sort_values(["dayofyear", "hour"]).reset_index(drop=True)
synthetic["time"] = hourly_time_range

# סידור מחדש של העמודות
cols = ["time"] + [col for col in synthetic.columns if col != "time"]
synthetic = synthetic[cols]

# שמירה
synthetic.to_csv("synthetic_tvae_smoothed_fixed_time.csv", index=False)
print("✅ synthetic_tvae_smoothed_fixed_time.csv נוצר בהצלחה!")