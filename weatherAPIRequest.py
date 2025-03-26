import requests
import csv

# API Key and Base URL
API_KEY = "4d1578f9cc74d1eaba5cfd7b256bc694"
API_URL = "https://api.openweathermap.org/data/2.5/forecast?units=metric&q="


def check_weather(city):
    """
    Fetches the weather data for a given city using OpenWeather API and saves it to a CSV file.
    """
    url = f"{API_URL}{city}&appid={API_KEY}"

    try:
        response = requests.get(url)
        if response.status_code == 404:
            return "City not found. Please enter a valid city name."
        elif response.status_code == 200:
            data = response.json()  # Convert response to JSON

            # Extract relevant weather information
            forecast_list = data.get("list", [])

            # Define CSV filename
            filename = f"{city}_weather.csv"

            # Save data to CSV file
            with open(filename, mode='w', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)
                # Write headers
                writer.writerow(["Datetime", "Temperature (°C)", "Weather", "Humidity (%)"])

                # Write weather data
                for forecast in forecast_list:
                    dt_txt = forecast["dt_txt"]
                    temp = forecast["main"]["temp"]
                    weather_desc = forecast["weather"][0]["description"]
                    humidity = forecast["main"]["humidity"]
                    writer.writerow([dt_txt, temp, weather_desc, humidity])

            return f"Weather data saved to {filename}"
        else:
            return f"Error: {response.status_code}"

    except requests.exceptions.RequestException as e:
        return f"API request failed: {e}"


# Example Usage
city_name = "tel aviv"
result = check_weather(city_name)
print(result)