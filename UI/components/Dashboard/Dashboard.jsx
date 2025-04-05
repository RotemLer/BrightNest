import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import WeatherForecast from './WeatherForecast';
import BoilerStatus from './BoilerStatus';
import TemperatureChart from './TemperatureChart';

function Dashboard() {
  const { userSettings, weatherData, predictedBoilerTemp, toggleBoilerStatus } = useContext(AppContext);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">לוח בקרה - דוד חכם</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* סטטוס דוד ופקדים */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4">סטטוס הדוד</h2>
          <BoilerStatus 
            isOn={userSettings.boilerStatus}
            predictedTemp={predictedBoilerTemp}
            toggleBoiler={toggleBoilerStatus}
          />
        </div>

        {/* תחזית מזג אוויר */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4">תחזית מזג אוויר</h2>
          <WeatherForecast weatherData={weatherData} />
        </div>
      </div>

      {/* גרף טמפרטורות */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-semibold mb-4">טמפרטורה חזויה</h2>
        <TemperatureChart weatherData={weatherData} predictedBoilerTemp={predictedBoilerTemp} />
      </div>

      {/* סיכום הגדרות המשתמש */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-semibold mb-4">הגדרות נוכחיות</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="font-medium">מיקום:</p>
            <p>{userSettings.location}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="font-medium">משך מקלחת:</p>
            <p>{userSettings.showerDuration} דקות</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="font-medium">שעת מקלחת מועדפת:</p>
            <p>{userSettings.preferredShowerTime}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;