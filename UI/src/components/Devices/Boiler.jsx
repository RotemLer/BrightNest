import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';

function Boiler() {
  const { userSettings, predictedBoilerTemp, toggleBoilerStatus } = useContext(AppContext);

  const [heatingMode, setHeatingMode] = useState('auto');
  const [manualHours, setManualHours] = useState([]);

  const targetTemp = 75;
  const currentTemp = predictedBoilerTemp;
  const progress = Math.min((currentTemp / targetTemp) * 100, 100);

  const hours = [...Array(23).keys()].map(i => i + 1).concat(0);
  const autoHours = [19, 20, 21];

  const toggleManualHour = (hour) => {
    if (manualHours.includes(hour)) {
      setManualHours(manualHours.filter(h => h !== hour));
    } else {
      setManualHours([...manualHours, hour]);
    }
  };

  const isActiveHour = (hour) => {
    if (heatingMode === 'auto') {
      return autoHours.includes(hour);
    } else {
      return manualHours.includes(hour);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">שליטה בדוד</h1>

      {/* מציג אם הדוד דולק או כבוי */}
      <div className="mb-6">
        <p className="text-xl">סטטוס דוד: <span className={userSettings.boilerStatus ? 'text-green-600' : 'text-red-600'}>{userSettings.boilerStatus ? 'דולק' : 'כבוי'}</span></p>
        <button
          onClick={toggleBoilerStatus}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {userSettings.boilerStatus ? 'כבה' : 'הדלק'} את הדוד
        </button>
      </div>

      {/* שליטה בטמפרטורה בעיגול */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">טמפרטורה נוכחית</h2>
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
        <p className="text-center mt-2">יעד: {targetTemp}°C</p>
      </div>

      {/* מצבי חימום */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">מצב חימום</h2>
        <div className="flex gap-4 justify-center">
          <button
            className={`px-4 py-2 rounded border ${heatingMode === 'auto' ? 'bg-blue-500 text-white' : 'border-gray-300 hover:bg-gray-200'}`}
            onClick={() => setHeatingMode('auto')}
          >
            אוטומטי
          </button>
          <button
            className={`px-4 py-2 rounded border ${heatingMode === 'manual' ? 'bg-blue-500 text-white' : 'border-gray-300 hover:bg-gray-200'}`}
            onClick={() => setHeatingMode('manual')}
          >
            ידני
          </button>
        </div>
      </div>

      {/* בחירת שעות במצב ידני */}
      {heatingMode === 'manual' && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">בחר שעות להפעלת הדוד</h2>
          <div className="flex gap-1 overflow-x-auto py-2">
            {hours.map(hour => (
              <div
                key={hour}
                onClick={() => toggleManualHour(hour)}
                className={`w-8 h-8 text-xs text-center cursor-pointer rounded ${manualHours.includes(hour) ? 'bg-blue-400 text-white' : 'bg-gray-200'}`}
              >
                {hour}<br />{manualHours.includes(hour) ? '🔥' : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* לוח זמנים כללי לפי מצב */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">לוח זמנים להיום</h2>
        <div className="flex gap-1 items-center overflow-x-auto py-2">
          {hours.map(hour => (
            <div
              key={hour}
              className={`w-8 h-8 text-xs text-center rounded ${isActiveHour(hour) ? 'bg-blue-400 text-white' : 'bg-gray-200'}`}
            >
              {hour}<br />{isActiveHour(hour) ? '🔥' : ''}
            </div>
          ))}
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
