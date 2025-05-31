import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import HourWheel from '../common/HourWheel';
import { ThermometerSun, Clock, Pencil, Users } from 'lucide-react';
import EditBoilerModal from './EditBoilerModal';

import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);

function getHeatingTimeFromStatus(status) {
  const match = status.match(/start heating at: (\d{2}:\d{2})/);
  return match ? match[1] : null;
}

function shouldBoilerBeOnNow(rec) {
  const heatingTimeStr = getHeatingTimeFromStatus(rec.Status);
  if (!heatingTimeStr) return false;

  const heatingStart = dayjs(rec.Time)
    .hour(Number(heatingTimeStr.split(":")[0]))
    .minute(Number(heatingTimeStr.split(":")[1]));

  const showerTime = dayjs(rec.Time);
  const now = dayjs();

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
    fetchUserSettings,
    fetchBoilerStatus
  } = useContext(AppContext);

  const [family, setFamily] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [recommendedBoilerHours, setRecommendedBoilerHours] = useState([]);

 useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) return;

  const now = Date.now();
  const lastBoilerFetch = localStorage.getItem('lastBoilerFetch');
  const oneHour = 1000 * 60 * 60;
  const shouldFetchByTime = !lastBoilerFetch || now - lastBoilerFetch > oneHour;

  // 🆕 תנאי – טען אם נתונים חסרים או ריקים
  const missingData =
    !userSettings.boilerSize ||
    !userSettings.boilerStatus ||
    predictedBoilerTemp === 0 ||
    family.length === 0;

  const shouldFetch = shouldFetchByTime || missingData;

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
          .map(m => ({
            datetime: `${new Date().toISOString().split('T')[0]} ${m.showerTime.trim()}:00`,
            preferredTemp: Number(m.preferredTemp || 38)
          }));

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

          localStorage.setItem('lastBoilerFetch', now.toString());
        }

        const recRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/recommendations`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const recData = await recRes.json();
        setRecommendedBoilerHours(recData);

        const activeRec = recData.find(rec => shouldBoilerBeOnNow(rec));
        if (activeRec && userSettings.boilerStatus !== '✅ פועל') {
          await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/heat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              duration: activeRec.HeatingMinutes,
              start_temp: activeRec.ForecastTemp
            }),
          });

          setUserSettings(prev => ({
            ...prev,
            boilerStatus: '✅ פועל'
          }));
        }
      }
    } catch (err) {
      console.error("❌ שגיאה בטעינת בני משפחה או המלצות:", err);
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
        const closest = data.reduce((prev, curr) =>
          Math.abs(new Date(curr.time) - now) < Math.abs(new Date(prev.time) - now) ? curr : prev
        );

        const size = parseInt(userSettings.boilerSize);
        const solar = userSettings.withSolar ? "with" : "without";
        const tempKey = `boiler temp for ${size} L ${solar} solar system`;

        if (closest[tempKey]) setPredictedBoilerTemp(closest[tempKey]);
      }
    } catch (err) {
      console.error("❌ שגיאה בקבלת תחזית הדוד:", err);
    }
  };

  fetchUserSettings();
  fetchBoilerStatus();
  if (shouldFetch) {
    fetchFamilyData();
    fetchForecastTemp();
  } else {
    console.log("⏱️ דילוג על שליפה – נתונים קיימים ועדכניים");
  }
}, [
  fetchUserSettings,
  fetchBoilerStatus,
  userSettings,
  setPredictedBoilerTemp,
  setUserSettings,
  predictedBoilerTemp,
  family.length
]);


  const getHourRange = () => (heatingMode === 'auto' ? `${autoStart}–${autoEnd}` : `${startHour}–${endHour}`);
  const getBoilerTypeText = () => userSettings.withSolar ? 'חשמל + סולארי' : 'חשמל בלבד';
  const getBoilerSizeText = () => userSettings.boilerSize ? `${parseInt(userSettings.boilerSize)} ליטר` : 'לא הוגדר';

  return (
    <div className="p-6 max-w-3xl mx-auto text-gray-800 dark:text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">שליטה בדוד</h1>

      <div className="mb-6 text-center">
        <p className="text-xl">
          סטטוס דוד:
          <span className={userSettings.boilerStatus === '✅ פועל' ? 'text-green-600' : 'text-red-600'}>
            {userSettings.boilerStatus}
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
            {userSettings.boilerStatus === '✅ פועל' ? 'כבה' : 'הדלק'} את הדוד
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2 border border-gray-300 hover:bg-teal-500 dark:hover:bg-gray-700 rounded-full text-sm"
          >
            <Pencil size={18} /> ערוך הגדרות דוד
          </button>
        </div>
      </div>

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

      {showModal && <EditBoilerModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

export default Boiler;