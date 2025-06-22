import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import HourWheel from '../common/HourWheel';
import { ThermometerSun, Clock, Pencil, Users } from 'lucide-react';
import EditBoilerModal from './EditBoilerModal';
import ShowerReminderModal from './ShowerReminder';




import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);

const isProduction = process.env.NODE_ENV === 'production';
const baseUrl = isProduction
  ? process.env.REACT_APP_API_URL
  : 'http://127.0.0.1:5000';

if (isProduction && !baseUrl) {
  throw new Error("❌ Environment variable REACT_APP_API_URL is missing in production!");
}

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
    heatingMode=null,
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

const hasChosenMode = heatingMode !== null;


  const [family, setFamily] = useState([]);
const [showerReminder, setShowerReminder] = useState({ visible: false, user: null });
const [showerReminders, setShowerReminders] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [recommendedBoilerHours, setRecommendedBoilerHours] = useState([]);
  const [showerDoneTimes, setShowerDoneTimes] = useState({});

  useEffect(() => {
  const today = new Date().toISOString().split('T')[0];
  const doneTimes = {};

  family.forEach(member => {
    const key = `shower-done-${member.name}-${today}`;
    const time = localStorage.getItem(key);
    if (time) {
      doneTimes[member.name] = time;
    }
  });

  setShowerDoneTimes(doneTimes);
}, [family]);


  const [pendingPopupUser, setPendingPopupUser] = useState(null);


  useEffect(() => {
  console.log("🔍 pendingPopupUser =", pendingPopupUser);
  console.log("🔍 showerReminder =", showerReminder);
}, [pendingPopupUser, showerReminder]);


useEffect(() => {
  const interval = setInterval(() => {
    if (heatingMode !== 'manual') return;

    const now = new Date();
    const currentHourMin = now.toTimeString().slice(0, 5); // "HH:MM"

    const isInRange = (() => {
      if (!startHour || !endHour) return false;

      if (startHour <= endHour) {
        // טווח רגיל
        return currentHourMin >= startHour && currentHourMin <= endHour;
      } else {
        // טווח שחוצה חצות
        return currentHourMin >= startHour || currentHourMin <= endHour;
      }
    })();

    if (isInRange && userSettings.boilerStatus !== '✅ פועל') {
      console.log("🔥 מצב ידני: מדליק דוד");
      toggleBoilerStatus();
    }

    if (!isInRange && userSettings.boilerStatus === '✅ פועל') {
      console.log("🧊 מצב ידני: מכבה דוד");
      toggleBoilerStatus();
    }
  }, 60 * 1000); // כל דקה

  return () => clearInterval(interval);
}, [heatingMode, startHour, endHour, userSettings.boilerStatus]);


useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) return;

  const now = Date.now();
  const lastBoilerFetch = localStorage.getItem('lastBoilerFetch');
  const oneHour = 1000 * 60 * 60;
  const shouldFetchByTime = !lastBoilerFetch || now - lastBoilerFetch > oneHour;

  const missingData =
    !userSettings.boilerSize ||
    !userSettings.boilerStatus ||
    predictedBoilerTemp === 0 ||
    family.length === 0;

  const shouldFetch = shouldFetchByTime || missingData;

  const timers = [];


const fetchFamilyData = async () => {
  try {
    const res = await fetch(`${baseUrl}/family`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await res.json();
    console.log("📦 נתוני משפחה מהשרת:", data);

    if (res.ok && data.family) {
      setFamily(data.family);

      const schedule = data.family
        .filter(m => m.showerTime)
        .map(m => ({
          datetime: `${new Date().toISOString().split('T')[0]} ${m.showerTime.trim()}:00`,
          preferredTemp: Number(m.preferredTemp || 38)
        }));

      data.family.forEach(member => {
        const showerTime = member.showerTime;
        if (!showerTime || typeof showerTime !== 'string') return;

        const now = new Date();
        const today = new Date().toISOString().split('T')[0];
        const showerStart = new Date(`${today}T${showerTime}:00`);
        const showerEnd = new Date(showerStart.getTime() + 20 * 60 * 1000);
        const shownTodayKey = `shower-shown-${member.name}-${today}`;
        const wasShownToday = localStorage.getItem(shownTodayKey);

        // אם עדיין לא לחצו - נרשום לתזכורת
        if (!wasShownToday) {
          setShowerReminders(prev => [...prev, member.name]);
          localStorage.setItem(shownTodayKey, 'true');
        }

        if (now >= showerStart && now <= showerEnd) {
          // בתוך חלון מקלחת
          console.log(`🟢 עכשיו בתוך חלון מקלחת של ${member.name} – הצגת פופאפ`);
          setShowerReminders(prev => [...prev, member.name]);

          const msUntilAutoClose = showerEnd - now;



          const autoClose = setTimeout(() => {
            setShowerReminder({ visible: false, user: null });
            console.log(`⏱️ פופאפ נסגר אוטומטית (חלון זמן נגמר) למשתמש ${member.name}`);
          }, msUntilAutoClose);
          timers.push(autoClose);

          const popupFallback = setTimeout(() => {
            const wasClicked = localStorage.getItem(shownTodayKey);
            if (!wasClicked) {
              console.log(`🟡 חלון נגמר – מציג פופאפ שקט עבור ${member.name}`);
              setPendingPopupUser(member.name);
            }
          }, msUntilAutoClose);
          timers.push(popupFallback);

        } else if (now < showerStart) {
          // לפני מקלחת – תזמון פופאפ עתידי
          const msUntilPopup = showerStart - now;
          console.log(`⌛ תיזמון עתידי לפופאפ של ${member.name} בעוד ${msUntilPopup}ms`);

          const timeout = setTimeout(() => {
            setShowerReminders(prev => [...prev, member.name]);

            const autoClose = setTimeout(() => {
              setShowerReminder({ visible: false, user: null });
              console.log(`⏱️ פופאפ עתידי נסגר אוטומטית למשתמש ${member.name}`);
            }, 20 * 60 * 1000);

            timers.push(autoClose);
          }, msUntilPopup);

          timers.push(timeout);

        } else {
          // אחרי מקלחת – לבדוק אם עדיין לא נלחץ
          console.log(`⏰ נכנסנו אחרי זמן המקלחת של ${member.name} – בודק אם להציג פופאפ`);
          const wasClicked = localStorage.getItem(shownTodayKey);
          if (!wasClicked) {
            console.log(`🟡 מציג פופאפ שקט מיידית עבור ${member.name}`);
            setPendingPopupUser(member.name);
          }
        }
      });

      // שליחת לוח זמנים לשרת
      if (schedule.length > 0 && userSettings.boilerSize) {
        const body = {
          schedule,
          boilerSize: parseInt(userSettings.boilerSize),
          hasSolar: userSettings.withSolar || false,
          lat: userSettings.lat,
          lon: userSettings.lon,
        };

        await fetch(`${baseUrl}/boiler/schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        localStorage.setItem('lastBoilerFetch', now.toString());
      }

      // המלצות הפעלה
      const recRes = await fetch(`${baseUrl}/boiler/recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
    console.log("recommendations for boiler")
      const recData = recRes.ok ? await recRes.json() : [];
      setRecommendedBoilerHours(recData);

      const activeRec = recData.find(rec => shouldBoilerBeOnNow(rec));
      if (activeRec && userSettings.boilerStatus !== '✅ פועל') {
        await fetch(`${baseUrl}/boiler/heat`, {
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
   const res = await fetch(`${baseUrl}/boiler/forecast`, {
  headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    const size = parseInt(userSettings.boilerSize);
    const solar = userSettings.withSolar ? "with" : "without";
    const tempKey = `boiler temp for ${size} L ${solar} solar system`;
    const locationKey = userSettings.location ? `boiler-temp-${userSettings.location}` : null;

    // ✅ טמפ' אמיתית מתוך סקיילר (מדידה אחרי מקלחת)
    if (Array.isArray(data) && data.length === 1 && data[0][tempKey]) {
      const realTemp = data[0][tempKey];
      console.log("🟢 טמפ' אמיתית מהסקיילר:", realTemp);

      setPredictedBoilerTemp(realTemp);
      localStorage.setItem("real_temp_from_scale", "true");

      if (locationKey) {
        localStorage.setItem(locationKey, realTemp.toString());
      }

      return;
    }

    // 🔵 fallback – תחזית רגילה מהמודל
    if (Array.isArray(data) && data.length > 0) {
      const now = new Date();
      const closest = data.reduce((prev, curr) =>
        Math.abs(new Date(curr.time) - now) < Math.abs(new Date(prev.time) - now) ? curr : prev
      );

      if (closest[tempKey]) {
        console.log("🔵 תחזית מז\"א לפי מודל:", closest[tempKey]);
        setPredictedBoilerTemp(closest[tempKey]);
        localStorage.setItem("real_temp_from_scale", "false");

        if (locationKey) {
          localStorage.setItem(locationKey, closest[tempKey].toString());
        }
      }
    }
  } catch (err) {
    console.error("❌ שגיאה בקבלת תחזית הדוד:", err);
  }
};


const previousLocation = localStorage.getItem("last_forecast_location");
const currentLocation = userSettings.location;
const locationKey = currentLocation ? `boiler-temp-${currentLocation}` : null;
const alreadyHasForecast = locationKey && localStorage.getItem(locationKey);
const locationChanged = previousLocation && currentLocation && previousLocation !== currentLocation;

if (locationChanged) {
  console.log(`📍 מיקום השתנה מ־${previousLocation} ל־${currentLocation} – מאפס תחזית קודמת`);
  localStorage.removeItem(`boiler-temp-${previousLocation}`);
  localStorage.setItem("last_forecast_location", currentLocation);
}
if (!previousLocation && currentLocation) {
  localStorage.setItem("last_forecast_location", currentLocation);
}

fetchUserSettings();
fetchBoilerStatus();



if (shouldFetch || locationChanged || !alreadyHasForecast) {
  fetchFamilyData();
  fetchForecastTemp();
} else {
  const temp = parseFloat(localStorage.getItem(locationKey));
  console.log(`💾 טמפ׳ מה־localStorage למיקום ${currentLocation}: ${temp}°C`);
  setPredictedBoilerTemp(temp);
  console.log("⏱️ דילוג על שליפה – נתונים קיימים ועדכניים");
}

// 🕒 בדיקה אם צריך להפעיל או לכבות את הדוד לפי מצב ידני
if (heatingMode === 'manual' && startHour && endHour && userSettings.boilerStatus) {
  const now = new Date();
  const currentHourMin = now.toTimeString().slice(0, 5); // HH:MM

  const isInRange = (() => {
    if (startHour <= endHour) {
      return currentHourMin >= startHour && currentHourMin <= endHour;
    } else {
      // טווח שעובר חצות
      return currentHourMin >= startHour || currentHourMin <= endHour;
    }
  })();

  console.log("⌛ השעה כעת:", currentHourMin);
  console.log("🕘 טווח ידני:", startHour, "-", endHour);
  console.log("🧠 בתוך טווח?", isInRange);
  console.log("📟 סטטוס נוכחי:", userSettings.boilerStatus);

  if (isInRange && userSettings.boilerStatus !== '✅ פועל') {
    console.log("🔥 מדליק דוד לפי מצב ידני");
    toggleBoilerStatus();
  }

  if (!isInRange && userSettings.boilerStatus === '✅ פועל') {
    console.log("🧊 מכבה דוד לפי מצב ידני");
    toggleBoilerStatus();
  }
}


  return () => {
    timers.forEach(clearTimeout);
  };
}, [
  fetchUserSettings,
  fetchBoilerStatus,
  userSettings,
  heatingMode,
  startHour,
  endHour,
  toggleBoilerStatus,
  setPredictedBoilerTemp,
  setUserSettings,
  predictedBoilerTemp,
  family.length
]);

  const getHourRange = () => (heatingMode === 'auto' ? `${autoStart}–${autoEnd}` : `${startHour}–${endHour}`);
  const getBoilerTypeText = () => userSettings.withSolar ? 'חשמל + סולארי' : 'חשמל בלבד';
  const getBoilerSizeText = () => userSettings.boilerSize ? `${parseInt(userSettings.boilerSize)} ליטר` : 'לא הוגדר';

const handleConfirm = async (userName) => {
  const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  console.log(`${userName} סיים מקלחת בשעה ${endTime}`);

  setShowerReminders(prev => prev.filter(name => name !== userName));
  setShowerReminder({ visible: false, user: null });

  setShowerDoneTimes(prev => ({
    ...prev,
    [userName]: endTime,
  }));

    // ✅ שמירה גם ב־localStorage
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(`shower-done-${userName}-${today}`, endTime);


  // 🔢 שלב 1: כמות האנשים שהתקלחו (אפשר לשפר אם מתקלחים יחד)
  const numUsers = 1;

  // 📦 שלב 2: נפח הדוד מתוך ההגדרות
  const boilerSize = parseInt(userSettings.boilerSize || "100");

  // 💧 שלב 3: חישוב כמות מים חמים שהשתמשו בהם
  const litersPerUser = 40;
  const usedLiters = numUsers * litersPerUser;

  // 🧊 שלב 4: שליחת בקשה לצינון
  try {
      const location = JSON.parse(localStorage.getItem("location")) || {};
    const lat = location.lat || 31.25;
    const lon = location.lon || 34.79;
    const token = localStorage.getItem('token');
    const res = await fetch(`${baseUrl}/boiler/cool`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        used_liters: usedLiters,
        cold_temp: 22,  // או לפי מז"א בעתיד
        lat: lat,
        lon: lon
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`🧊 טמפ' אחרי מקלחת: ${data.new_temperature}°C`);
      // setPredictedBoilerTemp(data.new_temperature); ← אם רוצים לעדכן במסך
    } else {
      console.error("❌ שגיאה בצינון:", data.error);
    }
  } catch (err) {
    console.error("❌ שגיאה בשליחת בקשה לצינון:", err);
  }
};



const handleCancel = (userName) => {
  console.log(`${userName} עדיין במקלחת`);
  setShowerReminders(prev => prev.filter(name => name !== userName));
  setShowerReminder({ visible: false, user: null });
};



return (
    <div className="min-h-screen bg-gradient-to-br from-gray-300 via-gray-300/60 to-gray-400/40 dark:from-gray-900 dark:via-gray-700 dark:to-blue-950 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            שליטה בדוד
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto rounded-full"></div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Boiler Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
              <h2 className="text-2xl font-bold mb-4 text-center">סטטוס הדוד</h2>
              <div className="text-center">
                <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-xl font-bold ${
                  userSettings.boilerStatus === '✅ פועל' 
                    ? 'bg-green-500 bg-opacity-20 border-2 border-green-300' 
                    : 'bg-red-500 bg-opacity-20 border-2 border-red-300'
                }`}>
                  <span className="text-2xl">
                    {userSettings.boilerStatus === '✅ פועל' ? '🔥' : '💤'}
                  </span>
                  {userSettings.boilerStatus}
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  סוג: {getBoilerTypeText()}
                </span>
                <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  נפח: {getBoilerSizeText()}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={toggleBoilerStatus}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                    userSettings.boilerStatus === '✅ פועל'
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
                      : 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {userSettings.boilerStatus === '✅ פועל' ? '⏹️' : '▶️'}
                    {userSettings.boilerStatus === '✅ פועל' ? 'כבה' : 'הדלק'} את הדוד
                  </span>
                </button>

                <button
                  onClick={() => setShowModal(true)}
                  className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Pencil size={18} />
                    ערוך הגדרות
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Temperature Prediction Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 text-center text-gray-800 dark:text-white flex items-center justify-center gap-2">
                <ThermometerSun className="text-orange-500" />
                טמפרטורה חזויה
              </h2>

              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full border-8 ${
                  predictedBoilerTemp > 42 
                    ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                    : 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${
                      predictedBoilerTemp > 42 ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {Math.round(predictedBoilerTemp)}°C
                    </div>
                    <div className="text-2xl">
                      {predictedBoilerTemp > 42 ? '🔥' : '💧'}
                    </div>
                  </div>
                </div>

                {predictedBoilerTemp > 42 && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      ⚠️ המים עלולים להיות חמים מדי למקלחת לילדים
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Heating Mode Card */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">מצב חימום</h2>
            <div className="flex justify-center gap-4">
              <button
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg ${
                  heatingMode === 'auto' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-200' 
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => {
                  setHeatingMode('auto');
                  localStorage.setItem('heating-mode', 'auto');
                }}
              >
                <span className="flex items-center gap-2">
                  🤖 אוטומטי
                </span>
              </button>

              <button
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg ${
                  heatingMode === 'manual' 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-200' 
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => {
                  setHeatingMode('manual');
                  localStorage.setItem('heating-mode', 'manual');
                }}
              >
                <span className="flex items-center gap-2">
                  ✋ ידני
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Manual Mode Settings */}
        {hasChosenMode && heatingMode === 'manual' && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 text-center text-gray-800 dark:text-white">
                ⏰ בחר טווח שעות להפעלה
              </h2>
              <div className="flex justify-center gap-12 mb-8">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">שעת התחלה</p>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 p-4 rounded-xl">
                    <HourWheel selectedHour={startHour} onSelect={setStartHour} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">שעת סיום</p>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 p-4 rounded-xl">
                    <HourWheel selectedHour={endHour} onSelect={setEndHour} />
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex justify-center items-center gap-2">
                  <Clock className="text-blue-500" />
                  שעות פעילות היום
                </h3>
                <div className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg" dir="ltr">
                  {getHourRange()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auto Mode Recommendations */}
        {hasChosenMode && heatingMode === 'auto' && recommendedBoilerHours.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 text-center text-gray-800 dark:text-white">
                ⏱️ מתי להפעיל את הדוד
              </h2>
              <div className="grid gap-3">
                {recommendedBoilerHours.map((rec, index) => (
                  <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
                      <span className="text-green-600 text-xl">🕒</span>
                      <span className="font-semibold">{rec.Time}</span>
                      <span className="text-gray-600 dark:text-gray-400">–</span>
                      <span>{rec.Status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Family Schedule Card */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white flex justify-center gap-2">
              <Users className="text-blue-500" />
              לוח זמנים מועדף
            </h2>

            {family.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">אין משתמשים עדיין</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">הוסף משתמשים כדי לנהל לוח זמנים</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {family.map((member, index) => {
                  const today = new Date().toISOString().split('T')[0];
                  const showerTimeStr = member.showerTime;
                  const wasShownTodayKey = `shower-shown-${member.name}-${today}`;
                  const wasShownToday = localStorage.getItem(wasShownTodayKey);

                  const popupShownOnTimeKey = `popup-shown-on-time-${member.name}-${today}`;
                  const wasPopupShownOnTime = localStorage.getItem(popupShownOnTimeKey);

                  let isInShowerWindow = false;
                  if (showerTimeStr) {
                    const showerStart = new Date(`${today}T${showerTimeStr}:00`);
                    const showerEnd = new Date(showerStart.getTime() + 20 * 60 * 1000);
                    const now = new Date();
                    isInShowerWindow = now >= showerStart && now <= showerEnd;
                  }

                  const shouldShowLateConfirmButton =
                    !wasPopupShownOnTime &&
                    !showerDoneTimes[member.name] &&
                    !isInShowerWindow;

                  return (
                    <div key={index} className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                      isInShowerWindow 
                        ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 shadow-lg' 
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                    }`}>
                      {isInShowerWindow && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                      )}

                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                              <span className="text-2xl">👤</span>
                              {member.name}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                <span className="text-blue-500">🕒</span>
                                <span className="text-sm font-medium">
                                  {member.showerTime || 'לא הוגדר'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                <span className="text-red-500">🌡️</span>
                                <span className="text-sm font-medium">
                                  {member.preferredTemp || 'לא הוגדר'}°C
                                </span>
                              </div>
                            </div>
                          </div>

                          {isInShowerWindow && (
                            <div className="flex flex-col items-center">
                              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                פעיל עכשיו
                              </span>
                            </div>
                          )}
                        </div>

                        {isInShowerWindow && (
                          <>
                            {showerDoneTimes[member.name] ? (
                              <div className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg p-3">
                                <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
                                  <span>✅</span>
                                  מקלחת הסתיימה בשעה {showerDoneTimes[member.name]}
                                </p>
                              </div>
                            ) : (
                              <button
                                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                                onClick={() => {
                                  handleConfirm(member.name);
                                  localStorage.setItem(`shower-shown-${member.name}-${today}`, 'true');
                                }}
                              >
                                <span className="flex items-center justify-center gap-2">
                                  ✔️ סיימתי להתקלח
                                </span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && <EditBoilerModal onClose={() => setShowModal(false)} />}
      <ShowerReminderModal
        visible={showerReminder.visible}
        userName={showerReminder.user}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default Boiler;