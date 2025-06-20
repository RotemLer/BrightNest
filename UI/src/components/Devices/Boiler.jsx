import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import HourWheel from '../common/HourWheel';
import { ThermometerSun, Clock, Pencil, Users } from 'lucide-react';
import EditBoilerModal from './EditBoilerModal';
import ShowerReminderModal from './ShowerReminder';


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
    const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/family`, {
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

      // המלצות הפעלה
      const recRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
    console.log("recommendations for boiler")
      const recData = recRes.ok ? await recRes.json() : [];
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
    const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/cool`, {
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
            <Pencil size={18} />  ערוך הגדרות דוד ומשתמשים
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
          onClick={() => {
            setHeatingMode('auto');
            localStorage.setItem('heating-mode', 'auto');
          }}
        >
          אוטומטי
        </button>

        <button
          className={`px-5 py-2 rounded-full font-medium transition duration-200 shadow-sm ${heatingMode === 'manual' ? 'bg-green-600 text-white' : 'bg-blue-600 border border-gray-300 hover:bg-teal-500'}`}
          onClick={() => {
            setHeatingMode('manual');
            localStorage.setItem('heating-mode', 'manual');
          }}
        >
          ידני
        </button>
        </div>
      </div>

    {hasChosenMode && heatingMode === 'manual' && (
        <>
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

          <div className="mb-10">
            <h2 className="text-xl font-bold mb-3 text-center flex justify-center items-center gap-2">
              <Clock /> שעות פעילות היום
            </h2>
            <div className="flex justify-center text-blue-800 text-lg font-semibold" dir="ltr">
              {getHourRange()}
            </div>
          </div>
        </>
      )}

      {hasChosenMode && heatingMode === 'auto' && recommendedBoilerHours.length > 0 && (
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
            <li key={index} className="bg-gray-100 p-3 rounded-md dark:bg-gray-700">
              <p className="text-gray-800 dark:text-white font-bold">👤 {member.name}</p>
              <p className="text-gray-600 dark:text-gray-300">🕒 שעה: {member.showerTime || 'לא הוגדר'}</p>
              <p className="text-gray-600 dark:text-gray-300">🌡️ טמפ' מועדפת: {member.preferredTemp || 'לא הוגדר'}°C</p>

              {(isInShowerWindow) && (
                <>
                  {showerDoneTimes[member.name] ? (
                    <p className="mt-2 text-sm text-gray-500">
                      ⏱️ מקלחת הסתיימה בשעה {showerDoneTimes[member.name]}
                    </p>
                  ) : (
                    <button
                      className="mt-2 px-4 py-1 bg-green-600 text-white rounded-full hover:bg-green-700 text-sm"
                      onClick={() => {
                        handleConfirm(member.name);
                        localStorage.setItem(`shower-shown-${member.name}-${today}`, 'true');
                      }}
                    >
                      ✔️ סיימתי להתקלח
                    </button>
                  )}
                </>
              )}
            </li>
          );
        })}

</ul>

        )}
      </div>
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