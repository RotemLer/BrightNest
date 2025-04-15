import React, { useState } from 'react';
import LocationPicker from './LocationPicker';

function UserSettings() {
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    location: '',
    birthdate: '',
  });

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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(userData); // פה תוכל לשלוח לשרת
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6 space-y-4 bg-white dark:bg-gray-900 shadow-md rounded-2xl">
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-gray-100">הגדרות משתמש</h2>

      <input
        name="name"
        placeholder="שם מלא"
        value={userData.name}
        onChange={handleChange}
        className="w-full p-3 border rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />

      <input
        name="email"
        type="email"
        placeholder="כתובת מייל"
        value={userData.email}
        onChange={handleChange}
        className="w-full p-3 border rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />

      <input
        name="password"
        type="password"
        placeholder="סיסמה"
        value={userData.password}
        onChange={handleChange}
        className="w-full p-3 border rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />

      <LocationPicker
        selectedLocation={userData.location}
        onLocationSelect={handleLocationChange}
      />

      <input
        type="date"
        placeholder="YYYY/MM/DD" 
        dir="ltr"
        className="w-full p-3 border rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />


      <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition">
        שמור שינויים
      </button>
    </form>
  );
}

export default UserSettings;
