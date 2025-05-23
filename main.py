from DVCS.Boiler import BoilerManager
from datetime import datetime

def main():
    print("🚿 Starting a simulation day of showers in the boiler")


    boiler = BoilerManager(
        name="Boiler_100L_NoSolar",
        capacity_liters=100,
        has_solar=True,
        power_usage=3.0  # kW
    )


    schedule = {
        datetime(2025, 5, 24, 6, 30): {"users": 2, "shower_temp": 39.0},
        datetime(2025, 5, 23, 21, 30): {"users": 1, "shower_temp": 38.0},
        datetime(2025, 5, 29, 7, 45): {"users": 1, "shower_temp": 40.0},
        datetime(2025, 5, 23, 18, 0): {"users": 3, "shower_temp": 41.0}
    }


    usage_df = boiler.simulate_day_usage_with_custom_temps(schedule)

    if usage_df is not None:
        print("\n📊 Simulation results:")
        print(usage_df.to_string(index=False))
    else:
        print("❌Simulation failed - not enough data.")

if __name__ == "__main__":
    main()
