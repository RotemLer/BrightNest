import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import HourWheel from '../common/HourWheel';

function Boiler() {
  const {
    userSettings,
    predictedBoilerTemp,
    toggleBoilerStatus,
    heatingMode,
    setHeatingMode,
    startHour,
    setStartHour,
    endHour,
    setEndHour,
    autoStart,
    autoEnd,
  } = useContext(AppContext);

  const targetTemp = 75;
  const currentTemp = predictedBoilerTemp;
  const progress = Math.min((currentTemp / targetTemp) * 100, 100);

  const getHourRange = () => {
    const start = heatingMode === 'auto' ? autoStart : startHour;
    const end = heatingMode === 'auto' ? autoEnd : endHour;
    return `${start}–${end}`;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">שליטה בדוד</h1>

      {/* סטטוס דוד */}
      <div className="mb-6 text-center">
        <p className="text-xl">
          סטטוס דוד: <span className={userSettings.boilerStatus ? 'text-green-600' : 'text-red-600'}>
            {userSettings.boilerStatus ? 'דולק' : 'כבוי'}
          </span>
        </p>
        <button
          onClick={toggleBoilerStatus}
          className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
        >
          {userSettings.boilerStatus ? 'כבה' : 'הדלק'} את הדוד
        </button>
      </div>

      {/* טמפרטורה */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2 text-center">טמפרטורה נוכחית</h2>
        <div className="relative w-40 h-40 mx-auto">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" stroke="#ddd" strokeWidth="10" fill="none" />
            <circle cx="50" cy="50" r="45" stroke="#3b82f6" strokeWidth="10" fill="none"
              strokeDasharray={`${progress * 2.83} ${283 - progress * 2.83}`}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
            {currentTemp}°C
          </div>
        </div>
        <p className="text-center mt-2 text-sm text-gray-600">יעד: {targetTemp}°C</p>
      </div>

      {/* מצב חימום */}
      <div className="mb-8 text-center">
        <h2 className="text-xl font-bold mb-3">מצב חימום</h2>
        <div className="flex justify-center gap-4">
          <button
            className={`px-5 py-2 rounded-full border transition font-medium 
              ${heatingMode === 'auto' ? 'bg-blue-500 text-white' : 'border-gray-300 hover:bg-gray-100'}`}
            onClick={() => setHeatingMode('auto')}
          >
            אוטומטי
          </button>
          <button
            className={`px-5 py-2 rounded-full border transition font-medium 
              ${heatingMode === 'manual' ? 'bg-blue-500 text-white' : 'border-gray-300 hover:bg-gray-100'}`}
            onClick={() => setHeatingMode('manual')}
          >
            ידני
          </button>
        </div>
      </div>

      {/* גלגלים לבחירת שעות */}
      {heatingMode === 'manual' && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-center">בחר טווח שעות להפעלה</h2>
          <div className="flex justify-center gap-8">
            <div>
              <p className="text-sm text-center mb-2">שעת סיום</p>
              <HourWheel selectedHour={endHour} onSelect={setEndHour} />
            </div>
            <div>
              <p className="text-sm text-center mb-2">שעת התחלה</p>
              <HourWheel selectedHour={startHour} onSelect={setStartHour} />
            </div>
          </div>
        </div>
      )}

      {/* תצוגת שעות פעילות */}
      <div className="mb-10">
        <h2 className="text-xl font-bold mb-3 text-center">שעות פעילות היום</h2>
        <div className="flex justify-center text-blue-800 text-lg font-semibold" dir="ltr">
          {getHourRange()}
        </div>
      </div>

      {/* פרטי מערכת */}
      <div className="text-sm text-gray-600 border-t pt-4 text-center">
        <p>מערכת: חשמל + סולארי | נפח: 80 ליטר</p>
      </div>
    </div>
  );
}

export default Boiler;
