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
    <div className="p-6 max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md space-y-6">
      <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white">התקנים ומשתמשים</h1>

      <div className="space-y-4">
        <label className="block text-gray-700 dark:text-white">גודל דוד</label>
        <select
          value={boilerSize}
          onChange={(e) => setBoilerSize(e.target.value)}
          className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white"
        >
          <option value="">בחר גודל</option>
          <option value="50L">50 ליטר</option>
          <option value="100L">100 ליטר</option>
          <option value="150L">150 ליטר</option>
        </select>

        <label className="flex items-center gap-2 text-gray-700 dark:text-white">
          <input
            type="checkbox"
            checked={withSolar}
            onChange={(e) => setWithSolar(e.target.checked)}
          />
          <span>מערכת סולארית</span>
        </label>
      </div>

      <div className="space-y-4 mt-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">משתמשי הבית</h2>

        {family.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">לא נוספו משתמשים עדיין</p>
        )}

        {family.map((member, index) => (
          <div key={index} className="bg-gray-100 dark:bg-gray-700 p-4 rounded space-y-2">
            {editIndex === index ? (
              <>
                <input
                  type="text"
                  placeholder="שם"
                  value={member.name}
                  onChange={(e) => handleChangeMember(index, 'name', e.target.value)}
                  className="w-full p-2 rounded border dark:bg-gray-800 dark:text-white"
                />
                <input
                  type="time"
                  value={member.showerTime}
                  onChange={(e) => handleChangeMember(index, 'showerTime', e.target.value)}
                  className="w-full p-2 rounded border dark:bg-gray-800 dark:text-white"
                />
                <input
                  type="number"
                  value={member.preferredTemp}
                  onChange={(e) => handleChangeMember(index, 'preferredTemp', e.target.value)}
                  className="w-full p-2 rounded border dark:bg-gray-800 dark:text-white"
                  placeholder="טמפ' מועדפת (°C)"
                />

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setEditIndex(null)}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
                  >
                    שמור
                  </button>
                  <button
                    onClick={() => removeMember(index)}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                  >
                    הסר
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-900 dark:text-white font-semibold">👤 {member.name || '(אין שם)'}</p>
                <p className="text-gray-900 dark:text-white">🕒 שעה: {member.showerTime || 'לא הוגדר'}</p>
                <p className="text-gray-900 dark:text-white">🌡️ טמפ': {member.preferredTemp || 'לא הוגדר'}°C</p>

                <div className="flex justify-end">
                  <button
                    onClick={() => setEditIndex(index)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                  >
                    ערוך
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        <div className="flex justify-center mt-2">
          <button
            onClick={addMember}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium rounded"
          >
            ➕ הוסף משתמש חדש
          </button>
        </div>
      </div>

      <button
        onClick={handleSaveToDB}
        className="w-full py-2.5 mt-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded text-lg"
      >
        ✅ שמור למאגר
      </button>
    </div>
  );
}

export default AddDevice;