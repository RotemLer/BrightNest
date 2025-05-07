from DVCS.Boiler import BoilerManager
from datetime import datetime

def main():
    print("🚿 התחלת סימולציית יום מקלחות בדוד")

    # === יצירת אובייקט של הדוד ===
    boiler = BoilerManager(
        name="Boiler_100L_NoSolar",
        capacity_liters=100,
        has_solar=True,
        power_usage=3.0  # kW
    )

    # === הגדרת לו״ז מקלחות עם תאריכים מלאים ידניים ===
    schedule = {
        datetime(2025, 5, 8, 6, 30): {"users": 2, "shower_temp": 39.0},
        datetime(2025, 5, 8, 7, 45): {"users": 1, "shower_temp": 40.0},
        datetime(2025, 5, 8, 18, 0): {"users": 3, "shower_temp": 41.0},
        datetime(2025, 5, 8, 21, 30): {"users": 1, "shower_temp": 38.0}
    }

    # === הרצת הסימולציה (כוללת חיזוי מודל) ===
    usage_df = boiler.simulate_day_usage_with_custom_temps(schedule)

    if usage_df is not None:
        print("\n📊 תוצאות הסימולציה:")
        print(usage_df.to_string(index=False))
    else:
        print("❌ הסימולציה נכשלה – ייתכן ואין מספיק נתונים.")

if __name__ == "__main__":
    main()