import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import HourWheel from '../common/HourWheel';
import { ThermometerSun, Clock, Pencil, Users } from 'lucide-react';
import EditBoilerModal from './EditBoilerModal';

function Boiler() {
  const {
    userSettings,
    predictedBoilerTemp,
    toggleBoilerStatus,
    heatingMode,
    setHeatingMode,
    startHour,
    setStartHour,
    endHour,
    setEndHour,
    autoStart,
    autoEnd,
    fetchUserSettings
  } = useContext(AppContext);

  const [family, setFamily] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [recommendedBoilerHours, setRecommendedBoilerHours] = useState([]);


  // ✅ טעינת נתונים ראשונית
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) return;

  const fetchFamilyData = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/family`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && data.family) {
        setFamily(data.family);

        const schedule = data.family
          .filter(m => m.showerTime)
          .map(m => {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const timeStr = m.showerTime.trim(); // לדוגמה: "18:30"
            const isoDateTime = `${todayStr} ${timeStr}:00`;  // "2025-05-23 18:30:00"

            console.log("📥 קיבלתי בקשה לחישוב:")
            console.log(todayStr)
            console.log(timeStr)
            console.log(isoDateTime)

            return {
              //name: m.name,
              datetime: isoDateTime,
              preferredTemp: Number(m.preferredTemp || 38)
            };
          });


        if (schedule.length > 0 && userSettings.boilerSize) {
          const body = {
            schedule,
            boilerSize: parseInt(userSettings.boilerSize),
            hasSolar: userSettings.withSolar || false
          };

          // שולחים את ההגדרות לשרת
          await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/schedule`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });
        }

        // ואחר כך שואלים את השרת מה השעות שהומלצו
        const recRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/recommendations`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const recData = await recRes.json();
        setRecommendedBoilerHours(recData); // כאן את שומרת את ההמלצות להצגה ב-UI
      }
    } catch (err) {
      console.error("שגיאה בטעינת בני משפחה או המלצות:", err);
    }
  };

  fetchUserSettings();
  fetchFamilyData();
}, [fetchUserSettings, userSettings]);




  const currentTemp = predictedBoilerTemp;
  const progress = Math.min((currentTemp / 75) * 100, 100);

  const getHourRange = () => {
    const start = heatingMode === 'auto' ? autoStart : startHour;
    const end = heatingMode === 'auto' ? autoEnd : endHour;
    return `${start}–${end}`;
  };

  const getBoilerTypeText = () => userSettings.withSolar ? 'חשמל + סולארי' : 'חשמל בלבד';

  const getBoilerSizeText = () => {
    if (!userSettings.boilerSize) return 'לא הוגדר';
    const match = userSettings.boilerSize.match(/\d+/);
    return match ? `${match[0]} ליטר` : userSettings.boilerSize;
  };

  
  
  return (
    <div className="p-6 max-w-3xl mx-auto text-gray-800 dark:text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">שליטה בדוד</h1>

      {/* סטטוס הדוד */}
      <div className="mb-6 text-center">
        <p className="text-xl">
          סטטוס דוד:
          <span className={userSettings.boilerStatus ? 'text-green-600' : 'text-red-600'}>
            {userSettings.boilerStatus ? ' ✅ פועל' : ' ⛔️ כבוי'}
          </span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          סוג: {getBoilerTypeText()} | נפח: {getBoilerSizeText()}
        </p>
        <div className="flex justify-center gap-4 mt-3">
          <button
            onClick={toggleBoilerStatus}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
          >
            {userSettings.boilerStatus ? 'כבה' : 'הדלק'} את הדוד
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2 border border-gray-300 hover:bg-teal-500 dark:hover:bg-gray-700 rounded-full text-sm"
          >
            <Pencil size={18} /> ערוך הגדרות דוד
          </button>
        </div>
      </div>

      {/* טמפרטורה נוכחית */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2 text-center flex items-center justify-center gap-2">
          <ThermometerSun /> טמפרטורה נוכחית
        </h2>
        <div className="relative w-40 h-40 mx-auto">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" stroke="#ddd" strokeWidth="10" fill="none" />
            <circle cx="50" cy="50" r="45" stroke="#3b82f6" strokeWidth="10" fill="none"
              strokeDasharray={`${progress * 2.83} ${283 - progress * 2.83}`}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
            {currentTemp}°C
          </div>
        </div>
      </div>

      {/* מצב חימום */}
      <div className="mb-8 text-center">
        <h2 className="text-xl font-bold mb-3">מצב חימום</h2>
        <div className="flex justify-center gap-4">
          <button
            className={`px-5 py-2 rounded-full font-medium transition duration-200 shadow-sm ${heatingMode === 'auto' ? 'bg-green-600 text-white' : 'bg-blue-600 border border-gray-300 hover:bg-teal-500'}`}
            onClick={() => setHeatingMode('auto')}
          >
            אוטומטי
          </button>
          <button
            className={`px-5 py-2 rounded-full font-medium transition duration-200 shadow-sm ${heatingMode === 'manual' ? 'bg-green-600 text-white' : 'bg-blue-600 border border-gray-300 hover:bg-teal-500'}`}
            onClick={() => setHeatingMode('manual')}
          >
            ידני
          </button>
        </div>
      </div>

      {/* שעות חימום ידני */}
      {heatingMode === 'manual' && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-center">בחר טווח שעות להפעלה</h2>
          <div className="flex justify-center gap-8">
            <div>
              <p className="text-sm text-center mb-2">שעת סיום</p>
              <HourWheel selectedHour={endHour} onSelect={setEndHour} />
            </div>
            <div>
              <p className="text-sm text-center mb-2">שעת התחלה</p>
              <HourWheel selectedHour={startHour} onSelect={setStartHour} />
            </div>
          </div>
        </div>
      )}

      {/* שעות פעילות */}
      <div className="mb-10">
        <h2 className="text-xl font-bold mb-3 text-center flex justify-center items-center gap-2">
          <Clock /> שעות פעילות היום
        </h2>
        <div className="flex justify-center text-blue-800 text-lg font-semibold" dir="ltr">
          {getHourRange()}
        </div>
      </div>

      {recommendedBoilerHours.length > 0 && (
      <div className="text-center mt-8">
        <h2 className="text-xl font-bold mb-3">⏱️ מתי להפעיל את הדוד</h2>
        <ul className="space-y-1">
          {recommendedBoilerHours.map((rec, index) => (
            <li key={index} className="text-sm text-gray-700 dark:text-gray-200">
              🕒 {rec.Time} – {rec.Status}
            </li>
          ))}
        </ul>
      </div>
    )}


      {/* בני משפחה */}
      <div className="mb-10">
        <h2 className="text-xl font-bold mb-4 text-center flex justify-center gap-2">
          <Users /> לוח זמנים מועדף
        </h2>
        {family.length === 0 ? (
          <p className="text-center text-gray-500">אין משתמשים עדיין.</p>
        ) : (
          <ul className="space-y-2">
            {family.map((member, index) => (
              <li key={index} className="bg-gray-100 p-3 rounded-md dark:bg-gray-700">
                <p className="text-gray-800 dark:text-white font-bold">👤 {member.name}</p>
                <p className="text-gray-600 dark:text-gray-300">🕒 שעה: {member.showerTime || 'לא הוגדר'}</p>
                <p className="text-gray-600 dark:text-gray-300">🌡️ טמפ' מועדפת: {member.preferredTemp || 'לא הוגדר'}°C</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* חלון עריכה */}
      {showModal && <EditBoilerModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

export default Boiler;