import React, { useState, useEffect } from 'react';

function AddDevice() {
  const [boilerSize, setBoilerSize] = useState('');
  const [withSolar, setWithSolar] = useState(false);
  const [family, setFamily] = useState([]);
  const [editIndex, setEditIndex] = useState(null);

  useEffect(() => {
    const fetchDeviceData = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/device-data`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.devices && data.devices.length > 0) {
          setBoilerSize(data.devices[0].size || '');
          setWithSolar(data.devices[0].withSolar || false);
        }

        if (data.family) {
          setFamily(data.family);
        }

      } catch (err) {
        console.error("❌ שגיאה בטעינת המידע:", err);
      }
    };

    fetchDeviceData();
  }, []);

  const handleChangeMember = (index, field, value) => {
    const updated = [...family];
    updated[index][field] = value;
    setFamily(updated);
  };

  const addMember = () => {
    setFamily([...family, { name: '', showerTime: '', preferredTemp: '' }]);
  };

  const removeMember = (index) => {
    const updated = family.filter((_, i) => i !== index);
    setFamily(updated);
  };

  const handleSaveToDB = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/device-data/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          devices: [{ size: boilerSize, withSolar }],
          family
        })
      });

      const result = await res.json();

      if (res.ok) {
        alert('✅ נשמר בהצלחה!');
      } else {
        console.error(result.error);
        alert('❌ שמירה נכשלה');
      }

    } catch (err) {
      console.error('❌ שגיאה בחיבור:', err);
      alert('שגיאת תקשורת עם השרת');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-300 via-gray-300/60 to-gray-400/40 dark:from-gray-900 dark:via-gray-700 dark:to-blue-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
            התקנים ומשתמשים
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto rounded-full"></div>
        </div>

        {/* Device Settings Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6 transform hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">הגדרות דוד חשמלי</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Boiler Size */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                גודל דוד
              </label>
              <select
                value={boilerSize}
                onChange={(e) => setBoilerSize(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">בחר גודל דוד</option>
                <option value="50L">50 ליטר</option>
                <option value="100L">100 ליטר</option>
                <option value="150L">150 ליטר</option>
                <option value="200L">200 ליטר</option>
              </select>
            </div>

            {/* Solar System */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                מערכת סולארית
              </label>
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={withSolar}
                  onChange={(e) => setWithSolar(e.target.checked)}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label className="mr-3 text-gray-700 dark:text-gray-300 cursor-pointer">
                  יש מערכת סולארית
                </label>
                {withSolar && (
                  <span className="mr-auto text-green-600 dark:text-green-400">
                    ☀️ פעיל
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Family Members Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 transform hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">משתמשי הבית</h2>
            </div>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full font-medium">
              {family.length} משתמשים
            </span>
          </div>

          {family.length === 0 && (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">לא נוספו משתמשים עדיין</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">הוסף את הראשון כדי להתחיל</p>
            </div>
          )}

          <div className="space-y-4">
            {family.map((member, index) => (
              <div key={index} className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200">
                {editIndex === index ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">שם</label>
                        <input
                          type="text"
                          placeholder="הכנס שם"
                          value={member.name}
                          onChange={(e) => handleChangeMember(index, 'name', e.target.value)}
                          className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">שעת מקלחת</label>
                        <input
                          type="time"
                          value={member.showerTime}
                          onChange={(e) => handleChangeMember(index, 'showerTime', e.target.value)}
                          className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">טמפרטורה מועדפת</label>
                        <input
                          type="number"
                          value={member.preferredTemp}
                          onChange={(e) => handleChangeMember(index, 'preferredTemp', e.target.value)}
                          className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="°C"
                          min="30"
                          max="60"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditIndex(null)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        שמור
                      </button>
                      <button
                        onClick={() => removeMember(index)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        הסר
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <span className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                          👤
                        </span>
                        {member.name || 'משתמש ללא שם'}
                      </h3>
                      <button
                        onClick={() => setEditIndex(index)}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        ערוך
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <span className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded">🕒</span>
                        <span className="font-medium">שעת מקלחת:</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {member.showerTime || 'לא הוגדר'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <span className="p-1 bg-red-100 dark:bg-red-900/30 rounded">🌡️</span>
                        <span className="font-medium">טמפרטורה:</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {member.preferredTemp ? `${member.preferredTemp}°C` : 'לא הוגדר'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Member Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={addMember}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              הוסף משתמש חדש
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8">
          <button
            onClick={handleSaveToDB}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            שמור למאגר
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddDevice;