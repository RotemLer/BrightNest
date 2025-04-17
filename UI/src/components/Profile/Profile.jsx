import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import LocationPicker from '../Settings/LocationPicker';

function Profile() {
  const navigate = useNavigate();
  const { userName, setUserName } = useContext(AppContext);

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    location: '',
    password: '',
    confirmPassword: '',
  });

  const [showPasswordResetFields, setShowPasswordResetFields] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // ✅ טען את השם מהקונטקסט כשנכנסים לעמוד
  useEffect(() => {
    setUserData((prev) => ({
      ...prev,
      name: userName || '',
    }));
  }, [userName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLocationChange = (city) => {
    setUserData((prev) => ({ ...prev, location: city }));
  };

  const handleResetPasswordClick = () => {
    setShowPasswordResetFields((prev) => !prev);
  };

  const handleAppSettingsClick = () => {
    navigate('/settings');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (showPasswordResetFields && userData.password !== userData.confirmPassword) {
      alert('הסיסמאות לא תואמות');
      return;
    }

    // 🔄 עדכון השם בקונטקסט
    setUserName(userData.name);

    console.log('✅ נשמר:', userData);

    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto p-6 space-y-6 bg-white dark:bg-gray-900 shadow-md rounded-2xl"
    >
      <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
        {userData.name || 'הפרופיל שלי'}
      </h1>

      <div>
        <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">שם מלא</label>
        <input
          name="name"
          type="text"
          placeholder="הכנס שם"
          value={userData.name}
          onChange={handleChange}
          className="w-full p-3 border rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">כתובת מייל</label>
        <input
          name="email"
          type="email"
          placeholder="example@email.com"
          value={userData.email}
          onChange={handleChange}
          className="w-full p-3 border rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      <p
        onClick={handleResetPasswordClick}
        className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:underline text-start"
      >
        שנה סיסמה
      </p>

      {showPasswordResetFields && (
        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">סיסמה חדשה</label>
            <input
              name="password"
              type="password"
              value={userData.password}
              onChange={handleChange}
              className="w-full p-3 border rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">אימות סיסמה</label>
            <input
              name="confirmPassword"
              type="password"
              value={userData.confirmPassword}
              onChange={handleChange}
              className="w-full p-3 border rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">עיר</label>
        <LocationPicker
          selectedLocation={userData.location}
          onLocationSelect={handleLocationChange}
        />
      </div>

      <button
        type="button"
        onClick={handleAppSettingsClick}
        className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition"
      >
        הגדרות אפליקציה
      </button>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition"
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

export default Profile;
