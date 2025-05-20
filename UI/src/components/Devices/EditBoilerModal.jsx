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
    const token = localStorage.getItem('token');
    if (!token) return;

    // עדכון ל־context
    updateSettings({ boilerSize, withSolar });

    // שמירת devices דרך /profile/update
    await saveSettingsToServer({
      devices: [{ size: boilerSize, withSolar }]
    });

    // שמירת family דרך /family/update
    try {
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
    }
  };

  const updateMember = (i, field, value) => {
    const updated = [...family];
    updated[i][field] = value;
    setFamily(updated);
  };

  const addMember = () => {
    setFamily([...family, { name: '', showerTime: '', preferredTemp: '' }]);
  };

  const removeMember = (i) => {
    setFamily(family.filter((_, index) => index !== i));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-2xl shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">עריכת הגדרות דוד ומשתמשים</h2>

        <label className="block text-sm mb-2">גודל הדוד:</label>
        <select
          value={boilerSize}
          onChange={(e) => setBoilerSize(e.target.value)}
          className="w-full p-2 rounded border dark:bg-gray-700 mb-4"
        >
          <option value="">בחר גודל</option>
          <option value="50L">50 ליטר</option>
          <option value="100L">100 ליטר</option>
          <option value="150L">150 ליטר</option>
        </select>

        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={withSolar}
            onChange={(e) => setWithSolar(e.target.checked)}
          />
          מערכת סולארית
        </label>

        <h3 className="text-lg font-semibold mt-6 mb-2">משתמשים בבית</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {family.map((member, index) => (
            <div key={index} className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
              <input
                type="text"
                placeholder="שם"
                value={member.name}
                onChange={(e) => updateMember(index, 'name', e.target.value)}
                className="w-full p-2 rounded border mb-2 dark:bg-gray-800"
              />
              <input
                type="time"
                value={member.showerTime}
                onChange={(e) => updateMember(index, 'showerTime', e.target.value)}
                className="w-full p-2 rounded border mb-2 dark:bg-gray-800"
              />
              <input
                type="number"
                placeholder="טמפרטורה מועדפת"
                value={member.preferredTemp}
                onChange={(e) => updateMember(index, 'preferredTemp', e.target.value)}
                className="w-full p-2 rounded border dark:bg-gray-800"
              />
              <button
                onClick={() => removeMember(index)}
                className="text-red-500 text-sm mt-2"
              >
                הסר
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 text-center">
          <button onClick={addMember} className="text-blue-600 hover:underline">➕ הוסף משתמש</button>
        </div>

        <div className="mt-6 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-400 hover:bg-red-400">ביטול</button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">שמור</button>
        </div>
      </div>
    </div>
  );
}

export default EditBoilerModal;