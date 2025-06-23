import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

function WeatherForecast({ selectedLocation }) {
  const [forecastData, setForecastData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(-1);
  const [selectedHourIndex, setSelectedHourIndex] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.chart-area')) {
        setSelectedHourIndex(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function fetchForecast() {
      if (!selectedLocation) {
        setForecastData({});
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/openmeteo/${selectedLocation.lat}/${selectedLocation.lon}`);
        const data = await response.json();
        console.log("📦 Forecast data:", data);

        if (Array.isArray(data.forecast)) {
          const now = new Date();

          const formattedData = data.forecast
            .map(item => {
              const dateObj = new Date(item.date);
              return {
                day: dateObj.toLocaleDateString('he-IL', { weekday: 'long' }),
                hour: dateObj.getHours(),
                temp: item.temperature_2m,
                icon: mapWeatherCodeToIcon(item.weather_code),
                dateObj: dateObj
              };
            })
            .filter(item => item.dateObj >= now);

          const groupedByDay = formattedData.reduce((acc, item) => {
            const key = item.dateObj.toDateString();
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          }, {});

          const limitedForecast = Object.fromEntries(
            Object.entries(groupedByDay).slice(0, 5)
          );
          setForecastData(limitedForecast);
          const firstDay = Object.keys(limitedForecast)[0];
          setSelectedDay(firstDay);
          setLastSelectedIndex(0);
        } else {
          setForecastData({});
          setSelectedDay(null);
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch forecast:", error);
        setLoading(false);
      }
    }

    setLoading(true);
    fetchForecast();
  }, [selectedLocation]);

  const mapWeatherCodeToIcon = (weatherCode) => {
    switch (weatherCode) {
      case 0:
        return 'Clear sky';
      case 1:
        return 'Mainly clear';
      case 2:
        return 'Partly cloudy';
      case 3:
        return 'Overcast';
      case 45:
        return 'Fog';
      case 48:
        return 'Depositing rime fog';
      case 51:
        return 'Light drizzle';
      case 53:
        return 'Moderate drizzle';
      case 55:
        return 'Dense drizzle';
      case 56:
        return 'Light freezing drizzle';
      case 57:
        return 'Dense freezing drizzle';
      case 61:
        return 'Slight rain';
      case 63:
        return 'Moderate rain';
      case 65:
        return 'Heavy rain';
      case 66:
        return 'Light freezing rain';
      case 67:
        return 'Heavy freezing rain';
      case 71:
        return 'Slight snow fall';
      case 73:
        return 'Moderate snow fall';
      case 75:
        return 'Heavy snow fall';
      case 77:
        return 'Snow grains';
      case 80:
        return 'Slight rain showers';
      case 81:
        return 'Moderate rain showers';
      case 82:
        return 'Violent rain showers';
      case 85:
        return 'Slight snow showers';
      case 86:
        return 'Heavy snow showers';
      case 95:
        return 'Thunderstorm';
      case 96:
        return 'Thunderstorm with slight hail';
      case 99:
        return 'Thunderstorm with heavy hail';
      default:
        console.warn("🌀 Unknown weather code:", weatherCode);
        return 'Clear sky'; //default
    }
  };
  const handleDaySelect = (key) => {
    setLastSelectedIndex(Object.keys(forecastData).indexOf(selectedDay));
    setSelectedDay(key);
    setSelectedHourIndex(null); // Reset hour selection on day change
  };

  if (!selectedLocation) {
    return (
      <div className="text-center text-gray-500 w-full py-10">
        אנא בחר מיקום להצגת תחזית מזג האוויר.
      </div>
    );
  }

  return (
    <div className="font-sans p-4 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white antialiased subpixel-antialiased [text-rendering:optimizeLegibility] [transform:translateZ(0)]" dir="rtl">
      {loading ? (
  <div className="text-center text-gray-500 w-full py-10">טוען תחזית מזג האוויר...</div>
) : (!forecastData || (typeof forecastData === 'object' && Object.keys(forecastData).length === 0)) ? (
  <div className="text-center text-gray-500 w-full py-10">לא נמצאה תחזית</div>
) : (
  
        <div className="space-y-6">
          {/* Daily buttons */}
          <div className="flex justify-center space-x-2 space-x-reverse mb-4 overflow-x-auto px-4">
            {Object.entries(forecastData).map(([key, entries], index) => {
              const dayName = entries[0]?.dateObj.toLocaleDateString('he-IL', { weekday: 'long' });
              const temps = entries.map(e => e.temp);
              const minTemp = Math.min(...temps);
              const maxTemp = Math.max(...temps);
              // Dynamically adjust the icon for the selected day based on selected hour (by click)
              let icon = entries[0]?.icon;
              if (key === selectedDay) {
                if (typeof selectedHourIndex !== "undefined" && selectedHourIndex !== null && entries[selectedHourIndex]) {
                  icon = entries[selectedHourIndex].icon;
                }
              }

              return (
                <div
                  key={`${index}-${selectedHourIndex}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  className="animate-fade-in-up"
                >
                  <button
                    onClick={() => handleDaySelect(key)}
                    className={`flex flex-col items-center px-2 py-2 min-h-[80px] rounded-lg border transition-all duration-500 ease-in-out hover:scale-105 hover:shadow focus:outline-none focus:ring-0 active:opacity-70 ${
                      key === selectedDay
                        ? 'scale-105 border-2 bg-yellow-100 dark:bg-yellow-300 py-4 min-h-[100px] mt-1 mb-1 shadow-md animate-pulse-glow !bg-yellow-100 !text-black focus:bg-yellow-100 active:bg-yellow-100 hover:bg-yellow-100'
                        : 'border-transparent bg-white/80 dark:bg-gray-400 hover:bg-white/90 dark:hover:bg-gray-500 focus:bg-white/90 active:bg-white/90'
                    }`}
                  >
                    <img
                      src={chooseIcon(icon)}
                      alt={icon}
                      className={`transition-opacity duration-500 ease-in-out ${
                        key === selectedDay ? 'w-8 h-8 animate-bounce opacity-100' : 'w-6 h-6 opacity-80'
                      } mb-1 mix-blend-multiply bg-transparent`}
                    />
                    <span className="text-sm font-semibold text-black">{dayName}</span>
                    <span className="text-xs text-gray-600">{Math.round(maxTemp)}° / {Math.round(minTemp)}°</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Temperature curve + hour cards */}
          {selectedDay && forecastData[selectedDay] && (
            <div className="overflow-hidden w-full">
              <div key={selectedDay} className={`transition-all duration-700 ease-out transform ${
                Object.keys(forecastData).indexOf(selectedDay) > lastSelectedIndex
                  ? 'animate-slide-fade-in-left'
                  : 'animate-slide-fade-in-right'
              }`}>
                <div className="chart-area relative w-full h-[260px] px-4" style={{ WebkitTransform: 'translateZ(0)', willChange: 'transform' }}>
                  <Line
                    style={{ width: '100%', height: '100%' }}
                    data={{
                      labels: forecastData[selectedDay].map((hour) => `${hour.hour.toString().padStart(2, '0')}:00`),
                      datasets: [
                        {
                          label: '°C',
                          data: forecastData[selectedDay].map((hour) => hour.temp),
                          borderColor: '#facc15',
                          backgroundColor: 'rgba(250, 204, 21, 0.4)',
                          tension: 0.4,
                          fill: true,
                          pointRadius: 3,
                          pointBackgroundColor: '#facc15',
                          borderWidth: 2
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
                        y: {
                          beginAtZero: false,
                          grid: { drawBorder: false, color: '#9ca3af' },
                          ticks: {
                            callback: val => `${parseFloat(val).toFixed(1)}°`,
                            color: '#9ca3af'
                          }
                        }
                      },
                      layout: {
                        padding: {
                          top: 10,
                          bottom: 10
                        }
                      },
                      onClick: (event, chartElement) => {
                        if (chartElement.length > 0) {
                          setSelectedHourIndex(chartElement[0].index);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function chooseIcon(condition) {
  switch (condition) {
    case 'Clear sky':
      return require('../../components/icons/sun.gif');
    case 'Mainly clear':
      return require('../../components/icons/sun.gif');
    case 'Partly cloudy':
      return require('../../components/icons/cloudy.gif');
    case 'Overcast':
      return require('../../components/icons/gif_Overcast.gif');
    case 'Fog':
    case 'Depositing rime fog':
      return require('../../components/icons/foggy.gif');
    case 'Light drizzle':
    case 'Moderate drizzle':
    case 'Dense drizzle':
      return require('../../components/icons/rain.gif');
    case 'Light freezing drizzle':
    case 'Dense freezing drizzle':
      return require('../../components/icons/rain.gif');
    case 'Slight rain':
    case 'Moderate rain':
    case 'Heavy rain':
      return require('../../components/icons/rain.gif');
    case 'Light freezing rain':
    case 'Heavy freezing rain':
      return require('../../components/icons/rain.gif');
    case 'Slight snow fall':
    case 'Moderate snow fall':
    case 'Heavy snow fall':
      return require('../../components/icons/weather.gif');
    case 'Snow grains':
      return require('../../components/icons/weather.gif');
    case 'Slight rain showers':
    case 'Moderate rain showers':
    case 'Violent rain showers':
      return require('../../components/icons/rain.gif');
    case 'Slight snow showers':
    case 'Heavy snow showers':
      return require('../../components/icons/weather.gif');
    case 'Thunderstorm':
    case 'Thunderstorm with slight hail':
    case 'Thunderstorm with heavy hail':
      return require('../../components/icons/storm.gif');
    default:
      console.warn("🌀 Unknown weather condition:", condition);
      return require('../../components/icons/icon_default_weather.png');
  }
}

export default WeatherForecast;