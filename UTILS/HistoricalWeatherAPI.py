import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry

# Setup the Open-Meteo API client with cache and retry on error
cache_session = requests_cache.CachedSession('.cache', expire_after = -1)
retry_session = retry(cache_session, retries = 5, backoff_factor = 0.2)
openmeteo = openmeteo_requests.Client(session = retry_session)

# Weather code mapping to descriptive strings
weather_code_mapping = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}

# API request
url = "https://archive-api.open-meteo.com/v1/archive"
params = {
    "latitude": 32.0809,
    "longitude": 34.7806,
    "start_date": "2022-01-01",
    "end_date": "2024-12-31",
    "daily": "weather_code",
    "hourly": [
        "temperature_2m", "relative_humidity_2m", "dew_point_2m", "apparent_temperature",
        "precipitation", "cloud_cover", "wind_speed_10m", "is_day",
        "direct_radiation", "surface_pressure", "weather_code"
    ],
    "wind_speed_unit": "kn",
    "timeformat": "unixtime"
}

responses = openmeteo.weather_api(url, params=params)

# Process first location. Add loop if needed for multiple.
response = responses[0]
print(f"Coordinates {response.Latitude()}°N {response.Longitude()}°E")
print(f"Elevation {response.Elevation()} m asl")
print(f"Timezone {response.Timezone()}{response.TimezoneAbbreviation()}")
print(f"Timezone difference to GMT+0 {response.UtcOffsetSeconds()} s")

# Process hourly data
hourly = response.Hourly()
hourly_data = {
    "date": pd.date_range(
        start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
        end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
        freq=pd.Timedelta(seconds=hourly.Interval()),
        inclusive="left"
    ),
    "temperature_2m": hourly.Variables(0).ValuesAsNumpy(),
    "relative_humidity_2m": hourly.Variables(1).ValuesAsNumpy(),
    "dew_point_2m": hourly.Variables(2).ValuesAsNumpy(),
    "apparent_temperature": hourly.Variables(3).ValuesAsNumpy(),
    "precipitation": hourly.Variables(4).ValuesAsNumpy(),
    "cloud_cover": hourly.Variables(5).ValuesAsNumpy(),
    "wind_speed_10m": hourly.Variables(6).ValuesAsNumpy(),
    "is_day": hourly.Variables(7).ValuesAsNumpy(),
    "direct_radiation": hourly.Variables(8).ValuesAsNumpy(),
    "surface_pressure": hourly.Variables(9).ValuesAsNumpy(),
    "weather_code": hourly.Variables(10).ValuesAsNumpy()
}

hourly_dataframe = pd.DataFrame(data=hourly_data)

# Add description column
hourly_dataframe["weather_description"] = hourly_dataframe["weather_code"].map(weather_code_mapping)

print(hourly_dataframe)

# Process daily data
daily = response.Daily()
daily_data = {
    "date": pd.date_range(
        start=pd.to_datetime(daily.Time(), unit="s", utc=True),
        end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
        freq=pd.Timedelta(seconds=daily.Interval()),
        inclusive="left"
    ),
    "weather_code": daily.Variables(0).ValuesAsNumpy()
}

daily_dataframe = pd.DataFrame(data=daily_data)

# Add description column
daily_dataframe["weather_description"] = daily_dataframe["weather_code"].map(weather_code_mapping)

print(daily_dataframe)

# Save both to CSV
hourly_dataframe.to_csv("weather_hourly_2024.csv", index=False)
daily_dataframe.to_csv("weather_daily_2024.csv", index=False)

print("✅ Data saved to CSV files: weather_hourly_2024.csv and weather_daily_2024.csv")