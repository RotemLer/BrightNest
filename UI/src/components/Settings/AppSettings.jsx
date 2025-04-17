import React, { useState } from 'react';

function UserSettings() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailReport, setEmailReport] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const appVersion = '1.0.3';

  const handleDeleteAccount = () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את החשבון?')) {
      console.log('החשבון נמחק');
      // שליחת בקשה לשרת למחיקת החשבון
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const settings = {
      pushNotifications,
      emailReport,
    };
    console.log('הגדרות נשמרו:', settings);

    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  return (
    <form
      onSubmit={handleSave}
      className="max-w-xl mx-auto p-8 space-y-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg"
    >
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">הגדרות אפליקציה</h2>

      <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
        <span>גרסת אפליקציה</span>
        <span className="font-mono text-sm">{appVersion}</span>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-gray-700 dark:text-gray-300 font-medium">
          התראות למייל
        </label>
        <input
          type="checkbox"
          checked={pushNotifications}
          onChange={(e) => setPushNotifications(e.target.checked)}
          className="w-5 h-5 accent-purple-500 me-3"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-gray-700 dark:text-gray-300 font-medium">
          שליחת דוח עלויות במייל
        </label>
        <input
          type="checkbox"
          checked={emailReport}
          onChange={(e) => setEmailReport(e.target.checked)}
          className="w-5 h-5 accent-purple-500 me-3"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition duration-200"
        >
          מחיקת חשבון
        </button>
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-teal-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition duration-200"
      >
        שמור שינויים
      </button>

      {showConfirmation && (
        <div className="text-center text-green-700 dark:text-green-400 font-medium bg-green-100 dark:bg-green-800 py-2 px-4 rounded-xl transition-all duration-300">
          ההגדרות נשמרו בהצלחה!
        </div>
      )}
    </form>
  );
}

export default UserSettings;
