from DVCS.Boiler import Boiler  # Make sure this matches your actual file structure

def main():
    """
    Simulates boiler initialization, forecasting, and hourly feedback simulation based on schedule.
    """

    # === Initialize boiler ===
    boiler = Boiler(
        name="Smart Boiler",
        capacity_liters=50,
        has_solar=True
    )

    print(f"⚙️ Boiler initialized with power: {boiler.power_usage:.1f} kW")

    # === Turn on the boiler ===
    boiler.turn_on()

    # === Shower schedule ===
    shower_schedule = {
        "18:00": {"users": 1, "shower_temp": 40.0},
        "21:00": {"users": 1, "shower_temp": 51.0}
    }

    # === Simulate feedback loop ===
    print("\n🔁 Running hourly feedback loop simulation...")
    feedback_df = boiler.simulate_hourly_feedback_loop(
        schedule=shower_schedule,
        hours=24  # You can change this to simulate a full day or more
    )

    # === Turn off boiler ===
    boiler.turn_off()

    # === Print final state ===
    print("\n📦 Final boiler status:")
    print(boiler)


if __name__ == "__main__":
    main()
