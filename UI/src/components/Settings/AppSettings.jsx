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
    <div className="min-h-screen bg-gradient-to-br from-gray-300 via-gray-300/60 to-gray-400/40 dark:from-gray-900 dark:via-gray-700 dark:to-blue-950 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-400 dark:bg-gray-800 rounded-full mb-4">
            <span className="text-2xl">⚙️</span>
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
            הגדרות אפליקציה
          </h1>
          <div className="w-16 h-0.5 bg-gray-300 dark:bg-gray-600 mx-auto rounded-full"></div>
        </div>

        {/* Main Settings */}
        <div className="space-y-6">

          {/* Notification Settings Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <span>🔔</span>
                הגדרות התראות
              </h2>
            </div>

            <div className="p-4 space-y-4">
              {/* Email Notifications Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📧</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">התראות למייל</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">קבל התראות חשובות במייל</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Email Report Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📊</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">דוח עלויות במייל</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">קבל דוח חודשי של עלויות החשמל</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailReport}
                    onChange={(e) => setEmailReport(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Account Management Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <span>👤</span>
                ניהול חשבון
              </h2>
            </div>

            <div className="p-4">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800 mb-4">
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <span>⚠️</span>
                  <span>פעולה זו לא ניתנת לביטול</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <span>🗑️</span>
                מחיקת חשבון
              </button>
            </div>
          </div>

          {/* App Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <span>📱</span>
                מידע אפליקציה
              </h2>
            </div>

            <div className="p-4">
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span>📋</span>
                  <span className="font-medium text-gray-900 dark:text-white">גרסת אפליקציה</span>
                </div>
                <span className="bg-gray-600 text-white px-2 py-1 rounded text-sm font-mono">
                  v{appVersion}
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            onClick={handleSave}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <span>💾</span>
            שמור שינויים
          </button>

          {/* Success Message */}
          {showConfirmation && (
            <div className="animate-in slide-in-from-bottom duration-500">
              <div className="bg-green-600 text-white p-4 rounded-lg text-center font-medium">
                <div className="flex items-center justify-center gap-2">
                  <span>✅</span>
                  <span>ההגדרות נשמרו בהצלחה!</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserSettings;