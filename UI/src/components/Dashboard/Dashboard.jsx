import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import WeatherForecast from './WeatherForecast';
import { Plus, Moon, Sun } from 'lucide-react';
import EnergySavingsGraph from "./EnergySavingsGraph";

function Dashboard() {
  const {
    userSettings,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-300 via-gray-300/60 to-gray-400/40 dark:from-gray-900 dark:via-gray-700 dark:to-blue-950 transition-all duration-500 relative overflow-hidden">

      {/* Animated Geometric Patterns */}
      <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" width="80" height="80" patternUnits="userSpaceOnUse">
              <circle cx="40" cy="40" r="3" fill="currentColor" className="text-orange-400/40"/>
              <circle cx="0" cy="0" r="1.5" fill="currentColor" className="text-blue-400/30"/>
              <circle cx="80" cy="0" r="1.5" fill="currentColor" className="text-blue-400/30"/>
              <circle cx="0" cy="80" r="1.5" fill="currentColor" className="text-blue-400/30"/>
              <circle cx="80" cy="80" r="1.5" fill="currentColor" className="text-blue-400/30"/>
              <circle cx="20" cy="20" r="1" fill="currentColor" className="text-gray-400/20"/>
              <circle cx="60" cy="60" r="1" fill="currentColor" className="text-gray-400/20"/>
            </pattern>
            <pattern id="lines" width="120" height="120" patternUnits="userSpaceOnUse">
              <line x1="0" y1="60" x2="120" y2="60" stroke="currentColor" strokeWidth="0.5" className="text-gray-300/10"/>
              <line x1="60" y1="0" x2="60" y2="120" stroke="currentColor" strokeWidth="0.5" className="text-gray-300/10"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
          <rect width="100%" height="100%" fill="url(#lines)" />
        </svg>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.08] dark:opacity-[0.05]">
        <div className="absolute top-1/3 left-12 w-4 h-4 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0s', animationDuration: '3s'}}></div>
        <div className="absolute top-2/3 right-20 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '1s', animationDuration: '4s'}}></div>
        <div className="absolute bottom-1/3 left-1/4 w-5 h-5 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '2s', animationDuration: '3.5s'}}></div>
        <div className="absolute top-1/4 right-1/3 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '1.5s', animationDuration: '4.5s'}}></div>
      </div>
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-12 space-y-12 max-w-none relative z-10">

        {/* Header with Theme Toggle */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-gray-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🏠</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-950 to-blue-950 bg-clip-text text-transparent dark:text-white">
                לוח בקרה
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm">ניהול מכשירי הבית החכם</p>
            </div>
          </div>

          <button
            className="group relative p-3 bg-gray-200/60 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-xl dark:shadow-gray-900/30 hover:scale-105 transition-all duration-300 border border-gray-300/40 dark:border-gray-700/50"
            onClick={toggleTheme}
          >
            <div className="relative w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-orange-500 transition-colors">
              <Moon className="absolute inset-0 opacity-100 dark:opacity-0 transition-opacity duration-300" />
              <Sun className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-300" />
            </div>
          </button>
        </div>

        {/* Enhanced Devices Section */}
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-right text-gray-800 dark:text-gray-100 flex items-center gap-3">
              המכשירים שלי
            </h2>
            <button
              onClick={() => navigate('/devices/addDevice')}
              className="group flex items-center gap-2 bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-600 hover:to-blue-600 text-white text-sm font-medium px-6 py-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span>הוסף מכשיר</span>
            </button>
          </div>

          <div className="flex justify-center">
            <div className="flex flex-col gap-6 items-center w-full max-w-md">
              {devices.map(device => (
                <div
                  key={device.id}
                  className="w-full bg-gray-100/60 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-400/40 dark:border-gray-400/50 overflow-hidden group hover:scale-[1.02]"
                >
                  <Link to={device.path} className="block">
                    <div className="p-8 text-center relative">
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <div className="relative z-10">
                        <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                          {device.icon}
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                          {device.name}
                        </h3>

                        {/* Status indicator */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-200/80 dark:bg-gray-700 text-sm">
                          <div className={`w-2 h-2 rounded-full ${
                            userSettings.boilerStatus === '✅ פועל' 
                              ? 'bg-green-500 animate-pulse' 
                              : 'bg-gray-400'
                          }`}></div>
                          <span className="text-gray-600 dark:text-gray-300">
                            {userSettings.boilerStatus === '✅ פועל' ? 'פועל' : 'כבוי'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {device.id === 'boiler' && (
                    <div className="px-8 pb-8 space-y-6">
                      {/* Enhanced Toggle Switch */}
                      <div className="flex justify-center">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleBoilerStatus();
                          }}
                          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-500 shadow-lg hover:shadow-xl ${
                            userSettings.boilerStatus === '✅ פועל' 
                              ? 'bg-gradient-to-r from-green-600 to-green-500' 
                              : 'bg-gray-300 dark:bg-gray-600'
                          } overflow-hidden group`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300 group-hover:scale-110 ${
                              userSettings.boilerStatus === '✅ פועל' ? 'translate-x-1' : 'translate-x-9'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Enhanced Schedule Display */}
                      <div className="bg-gradient-to-r from-gray-50/80 to-blue-50/60 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 border border-gray-600/30 dark:border-gray-500">
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-blue-700 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">⏰</span>
                            </div>
                            <p className="font-bold text-gray-800 dark:text-white">שעות פעילות היום</p>
                          </div>

                          <div className="text-center">
                            <p className="text-2xl font-bold bg-gradient-to-r from-gray-950 to-blue-950 bg-clip-text text-transparent">
                              {boilerHours?.start && boilerHours?.end
                                ? `${boilerHours.end}–${boilerHours.start}`
                                : 'לא הוגדרו שעות'}
                            </p>
                          </div>

                          <div className="bg-gray-100/60 dark:bg-gray-800/70 rounded-xl p-3 text-center">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              מצב הפעלה: <span className="font-semibold text-orange-500">
                                {heatingMode === 'auto' ? 'אוטומטי לפי תחזית' : 'ידני (נקבע על־ידך)'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side-by-Side Weather and Energy Sections with Bigger Weather */}
        <div className="grid grid-cols-1 xl:grid-cols-10 gap-8">


          {/* Weather Forecast Section - Takes 2/3 of the width */}
          <div className="xl:col-span-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center flex items-center justify-center gap-3">
              תחזית מזג האוויר
            </h2>

            <div className="bg-gray-100/60 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-500/40 dark:border-gray-400/50 overflow-hidden">
              <div className="p-8">
                <div className="bg-gradient-to-r from-gray-50/80 to-blue-50/60 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 mb-8 border border-gray-500/30 dark:border-gray-600">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-blue-700 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">📍</span>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-800 dark:text-gray-950">מיקום:</p>
                      <p className="text-lg font-semibold bg-gradient-to-r from-gray-950 to-blue-950 bg-clip-text text-transparent">
                        {userSettings.location}
                      </p>
                    </div>
                  </div>
                </div>

                <WeatherForecast selectedLocation={{
                  display_name: userSettings.location,
                  lat: userSettings.lat,
                  lon: userSettings.lon,
                }} />
              </div>
            </div>
          </div>

          {/* Energy Savings Graph Section - Takes 1/3 of the width */}
          <div className="xl:col-span-4 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center flex items-center justify-center gap-3">
              חיסכון באנרגיה
            </h2>

            <div className="group bg-gray-100/60 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-xl transition-all duration-500 border border-gray-500/40 dark:border-gray-400/50 overflow-hidden hover:scale-[1.015] hover:shadow-[0_0_25px_rgba(255,160,0,0.4)] dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]">

              <div className="p-8">
                <EnergySavingsGraph />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Dashboard;