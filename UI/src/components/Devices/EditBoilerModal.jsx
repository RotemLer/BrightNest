import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';

function EditBoilerModal({ onClose }) {
  const {
    userSettings,
    updateSettings,
    saveSettingsToServer,
  } = useContext(AppContext);

  const [boilerSize, setBoilerSize] = useState(userSettings.boilerSize || '');
  const [withSolar, setWithSolar] = useState(userSettings.withSolar || false);
  const [family, setFamily] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchFamily = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/family`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.family) setFamily(data.family);
      } catch (err) {
        console.error('שגיאה בטעינת בני משפחה:', err);
      }
    };

    fetchFamily();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // עדכון ל־context
      updateSettings({ boilerSize, withSolar });

      // שמירת devices דרך /profile/update
      await saveSettingsToServer({
        devices: [{ size: boilerSize, withSolar }]
      });

      // שמירת family דרך /family/update
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/family/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ family }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'שגיאה בשמירת בני משפחה');

      alert('✅ ההגדרות נשמרו בהצלחה');
      onClose();
    } catch (err) {
      console.error('שגיאה בשמירת בני משפחה:', err);
      alert('שגיאה בעת שמירת בני משפחה');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMember = (i, field, value) => {
    const updated = [...family];
    updated[i][field] = value;
    setFamily(updated);
  };

  const addMember = () => {
    setFamily([...family, { name: '', showerTime: '', preferredTemp: '' }]);
    setEditIndex(family.length); // Automatically edit the new member
  };

  const removeMember = (i) => {
    setFamily(family.filter((_, index) => index !== i));
    if (editIndex === i) setEditIndex(null);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">עריכת הגדרות דוד ומשתמשים</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {/* Device Settings */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">הגדרות דוד</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Boiler Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  גודל הדוד:
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  מערכת סולארית:
                </label>
                <div className="flex items-center p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
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
                    <span className="mr-auto text-green-600 dark:text-green-400 text-sm font-medium">
                      ☀️ פעיל
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Family Members */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">משתמשים בבית</h3>
              </div>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full font-medium">
                {family.length} משתמשים
              </span>
            </div>

            {family.length === 0 && (
              <div className="text-center py-8">
                <div className="p-3 bg-gray-200 dark:bg-gray-600 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">אין משתמשים רשומים</p>
              </div>
            )}

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {family.map((member, index) => (
                <div key={index} className="bg-white dark:bg-gray-600 p-4 rounded-lg border border-gray-200 dark:border-gray-500 shadow-sm">
                  {editIndex === index ? (
                    <div className="space-y-3">
                      <div className="grid md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="שם"
                          value={member.name}
                          onChange={(e) => updateMember(index, 'name', e.target.value)}
                          className="w-full p-2 rounded border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="time"
                          value={member.showerTime}
                          onChange={(e) => updateMember(index, 'showerTime', e.target.value)}
                          className="w-full p-2 rounded border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          placeholder="טמפ' (°C)"
                          value={member.preferredTemp}
                          onChange={(e) => updateMember(index, 'preferredTemp', e.target.value)}
                          className="w-full p-2 rounded border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="30"
                          max="60"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditIndex(null)}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          שמור
                        </button>
                        <button
                          onClick={() => removeMember(index)}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          הסר
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">👤</span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            {member.name || 'משתמש ללא שם'}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                          <span className="flex items-center gap-1">
                            <span className="text-orange-500">🕒</span>
                            {member.showerTime || 'לא הוגדר'}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-red-500">🌡️</span>
                            {member.preferredTemp ? `${member.preferredTemp}°C` : 'לא הוגדר'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditIndex(index)}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        ערוך
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Member Button */}
            <div className="mt-4 text-center">
              <button
                onClick={addMember}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium rounded-lg transition-all duration-300 flex items-center gap-2 mx-auto shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                הוסף משתמש
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-between gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  שומר...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  שמור הגדרות
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditBoilerModal;