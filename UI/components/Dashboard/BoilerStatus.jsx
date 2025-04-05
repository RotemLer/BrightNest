import React from 'react';

function BoilerStatus({ isOn, predictedTemp, toggleBoiler }) {
  // חישוב צבע הרקע בהתאם לטמפרטורה
  const getTempColorClass = () => {
    if (predictedTemp >= 45) return 'bg-red-100';
    if (predictedTemp >= 40) return 'bg-orange-100';
    if (predictedTemp >= 35) return 'bg-yellow-100';
    return 'bg-blue-100';
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`p-8 rounded-full mb-4 flex items-center justify-center ${isOn ? 'bg-green-100' : 'bg-gray-100'}`}>
        <div className={`p-12 rounded-full ${getTempColorClass()}`}>
          <p className="text-3xl font-bold">{predictedTemp}°C</p>
        </div>
      </div>

      <p className="text-lg mb-4">
        סטטוס הדוד: <span className={`font-bold ${isOn ? 'text-green-600' : 'text-red-600'}`}>
          {isOn ? 'פועל' : 'כבוי'}
        </span>
      </p>

      <button
        onClick={toggleBoiler}
        className={`px-6 py-2 rounded-md font-medium ${
          isOn 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        {isOn ? 'כבה דוד' : 'הפעל דוד'}
      </button>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-md w-full">
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