import React from 'react';
import iconRainy from '../../components/icons/icon_rainy.png';
import iconCloudy from '../../components/icons/icon_cloudy.png'; 
import iconSunny from '../../components/icons/icon_sunny.png';
import iconDefaultWeather from '../../components/icons/icon_default_weather.png';

function WeatherForecast({ forecast }) {
  // Default forecast data if none provided
  const defaultForecast = [
    { day: 'יום ראשון', condition: 'rainy', temp: 18, icon: 'droplets' },
    { day: 'יום שני', condition: 'cloudy', temp: 22, icon: 'cloud' },
    { day: 'יום שלישי', condition: 'sunny', temp: 27, icon: 'sun' },
    { day: 'יום רביעי', condition: 'partly-cloudy', temp: 24, icon: 'cloud' }
  ];

  const weatherData = forecast || defaultForecast;

  // Weather icon mapping
  const getWeatherIcon = (icon) => {
    const iconMap = {
      'droplets': iconRainy,
      'cloud': iconCloudy,
      'sun': iconSunny,
      };
    
    if (iconMap[icon]) {
      return (
        <img 
          src={iconMap[icon]} 
          alt={icon} 
          className="w-16 h-16 object-contain" 
        />
      );
    }
    else{// Fallback icons if image not found
      return (
        <img 
          src={iconDefaultWeather}
          alt={icon} 
          className="w-16 h-16 object-contain" 
        />
      );
    }
  };
    

  // Styling based on weather condition
  const getWeatherColor = (condition) => {
    switch(condition) {
      case 'rainy': return 'bg-blue-100';
      case 'cloudy': return 'bg-gray-100';
      case 'sunny': return 'bg-yellow-100';
      case 'partly-cloudy': return 'bg-blue-50';
      default: return 'bg-gray-50';
    }
  };

  return (
    <div className="font-sans inline-block" dir="rtl">  
      <div className="flex space-x-4 space-x-reverse overflow-x-auto">
      {weatherData.slice(0, 4).map((day, index) => (
          <div
            key={index}
            className={`flex-shrink-0 w-32 h-52 border-4 border-black-800 rounded-lg ${getWeatherColor(day.condition)} flex flex-col items-center justify-between p-4`}
          >
            <div className="text-lg font-semibold text-gray-800">{day.day}</div>
            <div className="text-sm text-gray-500">{day.hour}:00</div>  {/* New line */}

            <div className="my-4 flex items-center justify-center h-20">
              {getWeatherIcon(day.icon)}
            </div>
            
            <div className="text-xl font-bold">{Math.round(day.temp)}°C</div>
            </div>
        ))}
      </div>
    </div>
  );
}



export default WeatherForecast;