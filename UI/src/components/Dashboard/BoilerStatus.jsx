import React from 'react';

function BoilerStatus({ isOn, predictedTemp, toggleBoiler }) {
  // חישוב צבע הרקע בהתאם לטמפרטורה
  const getTempColorClass = () => {
    if (predictedTemp >= 45) return 'bg-red-500'; // אדום
    if (predictedTemp >= 40) return 'bg-orange-500'; // כתום
    if (predictedTemp >= 35) return 'bg-yellow-500'; // צהוב
    return 'bg-blue-500'; // כחול
  };

  return (
    <div className="card flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
      <div className={`p-8 rounded-full mb-4 flex items-center justify-center ${isOn ? 'bg-green-300' : 'bg-gray-300'}`}>
        <div className={`p-12 rounded-full ${getTempColorClass()} shadow-lg hover:shadow-2xl transition-all duration-300`}>
          <p className="text-3xl font-bold text-white">{predictedTemp}°C</p>
        </div>
      </div>

      <p className="text-lg mb-4">
        סטטוס הדוד: <span className={`font-bold ${isOn ? 'text-green-500' : 'text-red-500'}`}>
          {isOn ? 'פועל' : 'כבוי'}
        </span>
      </p>

      <button
        onClick={toggleBoiler}
        className={`button ${isOn ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'} py-2 px-6 rounded-xl transition-all duration-300`}
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