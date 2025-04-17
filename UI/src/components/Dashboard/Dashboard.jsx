import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import WeatherForecast from './WeatherForecast';
import TemperatureChart from './TemperatureChart';

function Dashboard() {
  const { userSettings, weatherData, predictedBoilerTemp, toggleBoilerStatus, toggleTheme } = useContext(AppContext);

  const devices = [
    { id: 'boiler', name: 'דוד חשמלי', icon: '💡', path: '/devices/boiler' },
    { id: 'ac', name: 'מזגן', icon: '❄️', path: '/devices/ac' },
    { id: 'irrigation', name: 'השקיה', icon: '💧', path: '/devices/irrigation' },
  ];

  return (
    <div className="app-wrapper container mx-auto px-6 sm:px-8 md:px-12 py-6">

      {/* night mode button */}
      <button 
        className="theme-toggle p-3 bg-gray-200 rounded-full dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
        onClick={toggleTheme}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      {/* devices */}
      <div className="mt-6">
        <h2 className="text-2xl font-bold mb-4 text-right text-gray-800 dark:text-gray-100">המכשירים שלי</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {devices.map(device => (
            <div key={device.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-center">
              <Link to={device.path}>
                <div className="text-4xl mb-2">{device.icon}</div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{device.name}</h3>
              </Link>
              {device.id === 'boiler' && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleBoilerStatus();
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                      userSettings.boilerStatus ? 'bg-green-500' : 'bg-gray-300'
                    } overflow-hidden`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                        userSettings.boilerStatus ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>

                </div>
              )}

            </div>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <div className="card w-full max-w-full mx-auto p-6 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-xl font-medium mb-4 text-gray-800 dark:text-white text-center">weather forecast</h2>
          <WeatherForecast forecast={weatherData} />
          </div>
      </div>


      <div className="mt-8 card p-6 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
        <h2 className="text-xl font-medium mb-4 text-gray-800 dark:text-white text-right">טמפרטורה חזויה</h2>
        <TemperatureChart weatherData={weatherData} predictedBoilerTemp={predictedBoilerTemp} />
      </div>

      <div className="mt-8 card p-6 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
        <h2 className="text-xl font-medium mb-4 text-gray-800 dark:text-white text-right">הגדרות נוכחיות</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md">
            <p className="font-medium text-right text-gray-800 dark:text-white">מיקום:</p>
            <p className="text-muted text-right">{userSettings.location}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md">
            <p className="font-medium text-right text-gray-800 dark:text-white">משך מקלחת:</p>
            <p className="text-muted text-right">{userSettings.showerDuration} דקות</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md">
            <p className="font-medium text-right text-gray-800 dark:text-white">שעת מקלחת מועדפת:</p>
            <p className="text-muted text-right">{userSettings.preferredShowerTime}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
