import React from 'react';

function BoilerStatus({ isOn, predictedTemp, toggleBoiler }) {
  const getTempColorClass = () => {
    if (predictedTemp >= 45) return 'bg-gradient-to-br from-red-500 to-red-700';
    if (predictedTemp >= 40) return 'bg-gradient-to-br from-orange-500 to-orange-700';
    if (predictedTemp >= 35) return 'bg-gradient-to-br from-yellow-500 to-yellow-700';
    return 'bg-gradient-to-br from-blue-500 to-blue-700';
  };

  return (
    <div className="card flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className={`p-8 rounded-full mb-4 flex items-center justify-center ${isOn ? 'bg-green-200' : 'bg-gray-300'}`}>
        <div className={`p-12 rounded-full ${getTempColorClass()} shadow-md hover:shadow-xl transition-all duration-300`}>
          <p className="text-3xl font-bold text-white">{predictedTemp}°C</p>
        </div>
      </div>

      <p className="text-lg mb-4 text-center">
        סטטוס הדוד: <span className={`font-bold ${isOn ? 'text-green-500' : 'text-red-500'}`}>
          {isOn ? 'פועל' : 'כבוי'}
        </span>
      </p>

      <button
        onClick={toggleBoiler}
        className={`py-2 px-6 rounded-xl text-white font-semibold transition-all duration-300 ${isOn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
      >
        {isOn ? 'כבה דוד' : 'הפעל דוד'}
      </button>

      <div className="mt-4 bg-slate-100 dark:bg-slate-800 text-right p-4 rounded-xl w-full text-sm">
        <p className="font-medium">המלצת מערכת:</p>
        {predictedTemp < 38 ? (
          <p>מומלץ להפעיל את הדוד כעת לקראת המקלחת המתוכננת.</p>
        ) : (
          <p>טמפרטורת המים מספקת, אין צורך להפעיל את הדוד.</p>
        )}
      </div>
    </div>
  );
}

export default BoilerStatus;