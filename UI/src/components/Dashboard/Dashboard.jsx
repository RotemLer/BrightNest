import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import WeatherForecast from './WeatherForecast';
//import TemperatureChart from './TemperatureChart';
import { Plus } from 'lucide-react';

function Dashboard() {
  const {
    userSettings,
    //weatherData,
  //predictedBoilerTemp,
    toggleBoilerStatus,
    toggleTheme,
    boilerHours,
    heatingMode,
  } = useContext(AppContext);

  const navigate = useNavigate();

  const devices = [
    { id: 'boiler', name: 'דוד חשמלי', icon: '💡', path: '/devices/boiler' },
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-right text-gray-800 dark:text-gray-100">המכשירים שלי</h2>
          <button
            onClick={() => navigate('/devices/addDevice')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="flex justify-center">
            <div className="flex flex-col gap-4 items-center w-full">
              {devices.map(device => (
                <div
                  key={device.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-center"
                >
                  <Link to={device.path}>
                    <div className="text-4xl mb-2">{device.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{device.name}</h3>
                  </Link>

                  {device.id === 'boiler' && (
                    <div className="mt-4 space-y-4">
                      {/* כפתור הדלקה */}
                      <div className="flex justify-center">
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
                              userSettings.boilerStatus ? 'translate-x-0' : 'translate-x-3.5'
                            }`}
                          />
                        </button>
                      </div>

                      {/* שעות פעילות */}
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <p className="font-semibold">שעות פעילות היום:</p>
                        <p className="text-blue-600 dark:text-blue-400">
                          {boilerHours?.start && boilerHours?.end
                            ? `${boilerHours.end}–${boilerHours.start}`
                            : 'לא הוגדרו שעות'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          מצב הפעלה: {heatingMode === 'auto' ? 'אוטומטי לפי תחזית' : 'ידני (נקבע על־ידך)'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
     </div>

      {/* תחזית מזג אוויר */}
      <div className="mt-6">
        <div className="card w-full max-w-full mx-auto p-6 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-xl font-medium mb-4 text-gray-800 dark:text-white text-center">weather forecast</h2>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md">
            <p className="font-medium text-right text-gray-800 dark:text-white">מיקום:</p>
            <p className="text-muted text-right">{userSettings.location}</p>
          </div>
          <WeatherForecast selectedLocation={{
            display_name: userSettings.location,
            lat: userSettings.lat,
            lon: userSettings.lon,
          }} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
