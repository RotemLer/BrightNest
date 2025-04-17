import React from 'react';
import iconRainy from '../../components/icons/icon_rainy.png';
import iconCloudy from '../../components/icons/icon_cloudy.png'; 
import iconSunny from '../../components/icons/icon_sunny.png';
import iconDefaultWeather from '../../components/icons/icon_default_weather.png';

function WeatherForecast({ forecast }) {
  const defaultForecast = [
    { day: 'יום ראשון', condition: 'rainy', temp: 18, icon: 'droplets' },
    { day: 'יום שני', condition: 'cloudy', temp: 22, icon: 'cloud' },
    { day: 'יום שלישי', condition: 'sunny', temp: 27, icon: 'sun' },
    { day: 'יום רביעי', condition: 'partly-cloudy', temp: 24, icon: 'cloud' }
  ];

  const weatherData = forecast || defaultForecast;

  const extractWeatherDesc = (fullString) => {
    if (typeof fullString !== 'string') return '';
    if (fullString.startsWith('weather_description_')) {
      return fullString.replace('weather_description_', '');
    }
    return fullString;
  };

  const iconMap = {
    'Clear sky': iconSunny,
    'Mainly clear': iconSunny,
    'Partly cloudy': iconCloudy,
    'Overcast': iconCloudy,
    'Slight rain': iconRainy,
    'Moderate rain': iconRainy,
    'Heavy rain': iconRainy,
  };

  const hebrewDescriptions = {
    'Clear sky': 'שמיים בהירים',
    'Mainly clear': 'ברובו בהיר',
    'Partly cloudy': 'מעונן חלקית',
    'Overcast': 'מעונן',
    'Slight rain': 'טפטוף קל',
    'Moderate rain': 'גשם בינוני',
    'Heavy rain': 'גשם כבד',
  };

  const getWeatherIcon = (iconStr) => {
    if (typeof iconStr !== 'string') {
      return (
        <div className="flex flex-col items-center">
          <img 
            src={iconDefaultWeather}
            alt="default" 
            className="w-16 h-16 object-contain" 
          />
          <span className="text-xs mt-1 text-gray-500">לא ידוע</span>
        </div>
      );
    }
  
    // ⬇️ הוסיפי כאן את ההדפסות לקונסול
    console.log('🧪 iconStr:', iconStr);
  
    const shortDesc = extractWeatherDesc(iconStr);
    console.log('🔍 shortDesc:', shortDesc);
  
    const iconToUse = iconMap[shortDesc] || iconDefaultWeather;
    const label = hebrewDescriptions[shortDesc] || shortDesc || 'לא זמין';
  
    return (
      <div className="flex flex-col items-center">
        <img 
          src={iconToUse} 
          alt={shortDesc} 
          className="w-16 h-16 object-contain" 
        />
        <span className="text-xs mt-1 text-gray-500">{label}</span>
      </div>
    );
  };
  

  const getWeatherColor = (condition) => {
    const desc = extractWeatherDesc(condition);
    switch(desc) {
      case 'Clear sky': return 'bg-yellow-100';
      case 'Partly cloudy':
      case 'Overcast': return 'bg-gray-100';
      case 'Slight rain':
      case 'Moderate rain':
      case 'Heavy rain': return 'bg-blue-100';
      default: return 'bg-gray-50';
    }
  };

  return (
    <div className="font-sans inline-block" dir="rtl">  
      <div className="flex space-x-4 space-x-reverse overflow-x-auto">
        {weatherData.slice(0, 4).map((day, index) => (
          <div
            key={index}
            className={`flex-shrink-0 w-32 h-60 border-4 border-black-800 rounded-lg ${getWeatherColor(day.condition)} flex flex-col items-center justify-between p-4`}
          >
            <div className="text-lg font-semibold text-gray-800">{day.day}</div>
            {day.hour !== undefined && (
              <div className="text-sm text-gray-500">{day.hour}:00</div>
            )}
            <div className="my-2 flex items-center justify-center h-24">
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
