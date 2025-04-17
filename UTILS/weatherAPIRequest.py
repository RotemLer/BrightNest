import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry
from datetime import datetime, timezone

def get_forecast_dataframe_for_model(lat, lon, hours_ahead=6):
    # === Setup API client
    cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
    retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
    openmeteo = openmeteo_requests.Client(session=retry_session)

    # === API parameters
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": [
            "temperature_2m", "relative_humidity_2m", "dew_point_2m", "apparent_temperature",
            "precipitation", "cloud_cover", "wind_speed_10m", "is_day"
        ],
        "minutely_15": ["direct_radiation"],
        "current": ["surface_pressure", "weather_code"],
        "timezone": "auto"
    }

    responses = openmeteo.weather_api(url, params=params)
    response = responses[0]

    # === Extract current values (static)
    current = response.Current()
    surface_pressure = current.Variables(0).Value()
    weather_code = current.Variables(1).Value()
    description = _map_weather_code_to_description(weather_code)

    # === Extract radiation and average to hourly
    minutely = response.Minutely15()
    rad_values = minutely.Variables(0).ValuesAsNumpy()
    rad_times = pd.date_range(
        start=pd.to_datetime(minutely.Time(), unit="s", utc=True),
        end=pd.to_datetime(minutely.TimeEnd(), unit="s", utc=True),
        freq=pd.Timedelta(seconds=minutely.Interval()),
        inclusive="left"
    )
    rad_df = pd.DataFrame({"date": rad_times, "direct_radiation": rad_values})
    rad_df = rad_df.resample("1h", on="date").mean().reset_index()

    # === Extract hourly weather data
    hourly = response.Hourly()
    times = pd.date_range(
        start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
        end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
        freq=pd.Timedelta(seconds=hourly.Interval()),
        inclusive="left"
    )

    df = pd.DataFrame({
        "date": times,
        "temperature_2m": hourly.Variables(0).ValuesAsNumpy(),
        "relative_humidity_2m": hourly.Variables(1).ValuesAsNumpy(),
        "dew_point_2m": hourly.Variables(2).ValuesAsNumpy(),
        "apparent_temperature": hourly.Variables(3).ValuesAsNumpy(),
        "precipitation": hourly.Variables(4).ValuesAsNumpy(),
        "cloud_cover": hourly.Variables(5).ValuesAsNumpy(),
        "wind_speed_10m": hourly.Variables(6).ValuesAsNumpy(),
        "is_day": hourly.Variables(7).ValuesAsNumpy(),
        "surface_pressure": surface_pressure,
        "weather_code": weather_code,
        "weather_description": description
    })

    df = pd.merge(df, rad_df, on="date", how="left")

    # === One-hot encode weather_description
    df = pd.get_dummies(df, columns=["weather_description"])

    # === Add missing one-hot columns
    required_weather_desc = [
        'weather_description_Clear sky',
        'weather_description_Dense drizzle',
        'weather_description_Heavy rain',
        'weather_description_Light drizzle',
        'weather_description_Mainly clear',
        'weather_description_Moderate drizzle',
        'weather_description_Moderate rain',
        'weather_description_Overcast',
        'weather_description_Partly cloudy',
        'weather_description_Slight rain'
    ]

    for col in required_weather_desc:
        if col not in df.columns:
            df[col] = 0.0

    # === Add energy consumption columns as 0.0
    energy_cols = [
        'energy consumption for 50L boiler with solar system',
        'energy consumption for 50L boiler without solar system',
        'energy consumption for 100L boiler with solar system',
        'energy consumption for 100L boiler without solar system',
        'energy consumption for 150L boiler with solar system',
        'energy consumption for 150L boiler without solar system'
    ]
    for col in energy_cols:
        df[col] = 0.0

    # === Final column order
    final_columns = [
        'temperature_2m', 'relative_humidity_2m', 'dew_point_2m', 'apparent_temperature',
        'precipitation', 'cloud_cover', 'wind_speed_10m', 'is_day', 'direct_radiation',
        'surface_pressure', 'weather_code'
    ] + energy_cols + required_weather_desc

    # === Filter from now and slice to 6 hours
    df = df.sort_values("date").reset_index(drop=True)
    df = df[df["date"] >= datetime.now(timezone.utc)].head(hours_ahead)

    forecast_df = df[["date"]].copy()
    X_input = df[final_columns].copy()

    return forecast_df, X_input


def _map_weather_code_to_description(code):
    """
    Map Open-Meteo weather_code to text description (simplified).
    """
    mapping = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Modדerate drizzle", 55: "Dense drizzle",
        61: "Light drizzle", 63: "Moderate rain", 65: "Heavy rain",
        80: "Slight rain", 81: "Moderate rain", 82: "Heavy rain", 95: "Thunderstorm"
    }
    return mapping.get(int(code), "Clear sky")