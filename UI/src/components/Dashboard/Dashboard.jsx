import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import WeatherForecast from './WeatherForecast';
import BoilerStatus from './BoilerStatus';
import TemperatureChart from './TemperatureChart';

function Dashboard() {
  const { userSettings, weatherData, predictedBoilerTemp, toggleBoilerStatus, toggleTheme } = useContext(AppContext);

  return (
    <div className="app-wrapper container mx-auto px-6 sm:px-8 md:px-12 py-6">
      <h1 className="text-3xl font-semibold mb-8 text-center text-gray-800 dark:text-gray-100">לוח בקרה - דוד חכם</h1>

      <button 
        className="theme-toggle p-3 bg-gray-200 rounded-full dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
        onClick={toggleTheme}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">
        <div className="card p-6 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-xl font-medium mb-4 text-gray-800 dark:text-white text-right">סטטוס הדוד</h2>
          <BoilerStatus 
            isOn={userSettings.boilerStatus}
            predictedTemp={predictedBoilerTemp}
            toggleBoiler={toggleBoilerStatus}
          />
        </div>

        <div className="card p-6 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-xl font-medium mb-4 text-gray-800 dark:text-white text-right">תחזית מזג אוויר</h2>
          <WeatherForecast weatherData={weatherData} />
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