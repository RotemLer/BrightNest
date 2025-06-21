import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import LocationPicker from '../Settings/LocationPicker';

function Profile() {
  const navigate = useNavigate();
  const {
    userName,
    setUserName,
    updateSettings,
    saveSettingsToServer,
    userSettings
  } = useContext(AppContext);

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    location: '',
    lat: null,
    lon: null,
    password: '',
    confirmPassword: ''
  });

  const [showPasswordResetFields, setShowPasswordResetFields] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    setUserData((prev) => ({
      ...prev,
      name: userName || '',
      email: userSettings.email || '',  // מוצג אך לא נשלח
      location: userSettings.location || '',
      lat: userSettings.lat || null,
      lon: userSettings.lon || null
    }));
  }, [userName, userSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetPasswordClick = () => {
    setShowPasswordResetFields((prev) => !prev);
  };

  const handleAppSettingsClick = () => {
    navigate('/settings');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (showPasswordResetFields && userData.password !== userData.confirmPassword) {
      alert('הסיסמאות לא תואמות');
      return;
    }

    const preferences = {
      location: userData.location,
      lat: userData.lat,
      lon: userData.lon
    };

    updateSettings({ ...preferences, email: userData.email });  // רק ל־UI
    setUserName(userData.name);

    await saveSettingsToServer({
      full_name: userData.name,
      preferences
    });

    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-300 via-gray-300/60 to-gray-400/40 dark:from-gray-900 dark:via-gray-700 dark:to-blue-950 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-400 to-indigo-400 rounded-full mb-4 shadow-lg">
            <span className="text-3xl text-white">👤</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-blue-800 bg-clip-text text-transparent dark:bg-gradient-to-r dark:from-white dark:to-gray-200 dark:bg-clip-text dark:text-transparent mb-2">
            {userData.name || 'הפרופיל שלי'}
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-gray-800 to-blue-800 mx-auto rounded-full dark:bg-gradient-to-r dark:from-white dark:to-blue-300 mx-auto rounded-full"></div>
        </div>

        {/* Main Profile Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          {/* Card Header */}
          <div className="bg-gradient-to-r from-orange-500 to-blue-500 p-6 text-white">
            <h2 className="text-2xl font-bold text-center">פרטים אישיים</h2>
          </div>

          <div className="p-8 space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <span className="text-blue-900">👨‍💼</span>
                שם מלא
              </label>
              <input
                name="name"
                type="text"
                value={userData.name}
                onChange={handleChange}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-all duration-300"
                placeholder="הכנס שם מלא"
              />
            </div>

            {/* Email Field (Read-only) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <span className="text-blue-500">📧</span>
                כתובת מייל
              </label>
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  value={userData.email}
                  disabled
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-gray-400 text-sm">🔒</span>
                </div>
              </div>
            </div>

            {/* Password Reset Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-200">
              <button
                type="button"
                onClick={handleResetPasswordClick}
                className="flex items-center gap-2 text-white  dark:text-white hover:text-gray-200 dark:hover:text-white font-medium transition-colors duration-200"
              >
                <span className="text-lg">🔐</span>
                <span>{showPasswordResetFields ? 'ביטול שינוי סיסמה' : 'שנה סיסמה'}</span>
              </button>

              {showPasswordResetFields && (
                <div className="mt-4 space-y-4 animate-in slide-in-from-top duration-300">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      סיסמה חדשה
                    </label>
                    <input
                      name="password"
                      type="password"
                      value={userData.password}
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-all duration-300"
                      placeholder="הכנס סיסמה חדשה"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      אימות סיסמה
                    </label>
                    <input
                      name="confirmPassword"
                      type="password"
                      value={userData.confirmPassword}
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-all duration-300"
                      placeholder="הכנס סיסמה שוב"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Location Section */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <span className="text-green-500">📍</span>
                מיקום
              </label>
              {userData.location && !showLocationPicker ? (
                <div className="flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-lg">🌍</span>
                    <span className="font-medium text-gray-800 dark:text-white">{userData.location}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                  >
                    שנה מיקום
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <LocationPicker
                    selectedLocation={userData.location}
                    onLocationSelect={(place) => {
                      setUserData((prev) => ({
                        ...prev,
                        location: place.display_name,
                        lat: place.lat,
                        lon: place.lon
                      }));
                      setShowLocationPicker(false);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-6 space-y-4">
              <button
                type="button"
                onClick={handleAppSettingsClick}
                className="w-full py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                <span className="text-lg">⚙️</span>
                הגדרות אפליקציה
              </button>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-800 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                <span className="text-lg">💾</span>
                שמור שינויים
              </button>
            </div>

            {/* Success Message */}
            {showConfirmation && (
              <div className="animate-in slide-in-from-bottom duration-500">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl text-center font-semibold shadow-lg">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">✅</span>
                    <span>ההגדרות נשמרו בהצלחה!</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;