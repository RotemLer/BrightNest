import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import HourWheel from '../common/HourWheel';
import { ThermometerSun, Clock, Pencil, Users } from 'lucide-react';
import EditBoilerModal from './EditBoilerModal';

import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);

// חילוץ שעת התחלה מהטקסט של הסטטוס
function getHeatingTimeFromStatus(status) {
  const match = status.match(/start heating at: (\d{2}:\d{2})/);
  return match ? match[1] : null;
}

// בדיקה אם עכשיו צריך להדליק את הדוד
function shouldBoilerBeOnNow(rec) {
  const heatingTimeStr = getHeatingTimeFromStatus(rec.Status);
  if (!heatingTimeStr) return false;

  const heatingStart = dayjs(rec.Time)
    .hour(Number(heatingTimeStr.split(":")[0]))
    .minute(Number(heatingTimeStr.split(":")[1]));

  const showerTime = dayjs(rec.Time);
  const now = dayjs();

  // אם עכשיו בטווח שבין זמן התחלה לזמן המקלחת
  return now.isSameOrAfter(heatingStart) && now.isSameOrBefore(showerTime);
}





function Boiler() {
  const {
    userSettings,
    setUserSettings,
    predictedBoilerTemp,
    setPredictedBoilerTemp,
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
            const todayStr = new Date().toISOString().split('T')[0];
            const isoDateTime = `${todayStr} ${m.showerTime.trim()}:00`;
            return {
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

          await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/schedule`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });
        }

        const recRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/recommendations`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const recData = await recRes.json();
        setRecommendedBoilerHours(recData);

        const activeRec = recData.find(rec => shouldBoilerBeOnNow(rec));
        if (activeRec && userSettings.boilerStatus !== '✅ פועל') {
          const duration = activeRec.HeatingMinutes;
          const startTemp = activeRec.ForecastTemp;

          // הפעלת הדוד בפועל
          await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/heat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              duration_minutes: duration,
              start_temperature: startTemp
            }),
          });

          // עדכון הסטטוס לממשק
          setUserSettings(prev => ({
            ...prev,
            boilerStatus:  '✅ פועל'
          }));
        }
      }
    } catch (err) {
      console.error("שגיאה בטעינת בני משפחה או המלצות:", err);
    }
  };

  const fetchForecastTemp = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/boiler/forecast", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const now = new Date();
        const closest = data.reduce((prev, curr) => {
          const prevTime = new Date(prev.time);
          const currTime = new Date(curr.time);
          return Math.abs(currTime - now) < Math.abs(prevTime - now) ? curr : prev;
        });

        const size = parseInt(userSettings.boilerSize);
        const solar = userSettings.withSolar ? "with" : "without";
        const tempKey = `boiler temp for ${size} L ${solar} solar system`;

        if (closest && closest[tempKey]) {
          setPredictedBoilerTemp(closest[tempKey]);
        } else {
          console.warn("⚠️ תחזית לא זמינה עבור:", tempKey);
        }
      }
    } catch (err) {
      console.error("❌ שגיאה בקבלת תחזית הדוד:", err);
    }
  };

  fetchUserSettings();
  fetchFamilyData();
  fetchForecastTemp();
}, [fetchUserSettings, userSettings, setPredictedBoilerTemp, setUserSettings]);

const handleToggleBoilerStatus = async () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  const turnOn = !userSettings.boilerStatus?.includes("פועל");

  try {
    const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ turn_on: turnOn }),
    });

    const data = await res.json();

    if (res.ok && data.status) {
      const newStatus = data.status === "on" ? '✅ פועל' : '⛔️ כבוי';
      setUserSettings(prev => ({
        ...prev,
        boilerStatus: newStatus
      }));
    }
    console.log("🔘 נלחץ כפתור הדוד");

  } catch (err) {
    console.error("❌ שגיאה בחיבור לשרת:", err);
  }
};



  const currentTemp = predictedBoilerTemp ? Math.round(predictedBoilerTemp) : 0;
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
        <button onClick={handleToggleBoilerStatus}>
          {userSettings.boilerStatus?.includes("פועל") ? 'כבה' : 'הדלק'} את הדוד
        </button>


          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2 rounded-full font-semibold
                       bg-[#00C851] hover:bg-[#009942]
                       dark:bg-[#00C851] dark:hover:bg-[#009942]
                       text-white transition"
          >
            <Pencil size={18} /> ערוך הגדרות דוד
          </button>
        </div>
      </div>

      {/* טמפרטורה נוכחית */}
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold mb-3 flex items-center justify-center gap-2">
            טמפרטורה חזויה של המים בדוד:
          </h2>

          <div className="flex items-center justify-center gap-2 text-2xl font-extrabold">
            <ThermometerSun />
            <span className={predictedBoilerTemp > 42 ? 'text-red-600' : 'text-blue-600'}>
              {Math.round(predictedBoilerTemp)}°C
            </span>
            <span>{predictedBoilerTemp > 42 ? '🔥' : '💧'}</span>
          </div>

          {predictedBoilerTemp > 42 && (
            <p className="text-sm text-red-500 mt-2">⚠️ המים עלולים להיות חמים מדי למקלחת לילדים</p>
          )}
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

      {/* שעות פעילות והמלצות */}
        <div className="mb-10 text-center">
          <h2 className="text-xl font-bold mb-3 flex justify-center items-center gap-2">
            ⏱️ מתי להפעיל את הדוד
          </h2>

          {heatingMode === 'manual' ? (
            <div className="text-sm text-gray-700 dark:text-gray-200">
              <p className="mb-2 font-semibold">נקבע על ידך:</p>
              <p className="text-blue-800 font-semibold text-lg" dir="ltr">
                {getHourRange()}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-2 font-semibold text-gray-600 dark:text-gray-300">המלצת המערכת:</p>
              {recommendedBoilerHours.length > 0 ? (
                <ul className="space-y-1">
                  {recommendedBoilerHours.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-gray-200">
                      🕒 {rec.Time} – {rec.Status}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">לא התקבלו המלצות להפעלה.</p>
              )}
            </>
          )}
        </div>



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