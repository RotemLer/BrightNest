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
const [showerReminder, setShowerReminder] = useState({ visible: false, user: null });
const [showerReminders, setShowerReminders] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [recommendedBoilerHours, setRecommendedBoilerHours] = useState([]);
  const [showerDoneTimes, setShowerDoneTimes] = useState({});
  const [pendingPopupUser, setPendingPopupUser] = useState(null);

  useEffect(() => {
  console.log("🔍 pendingPopupUser =", pendingPopupUser);
  console.log("🔍 showerReminder =", showerReminder);
}, [pendingPopupUser, showerReminder]);




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

      // המלצות הפעלה
      const recRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const recData = await res.ok ? await recRes.json() : [];
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

  return () => {
    timers.forEach(clearTimeout);
  };
}, [
  fetchUserSettings,
  fetchBoilerStatus,
  userSettings,
  setPredictedBoilerTemp,
  setUserSettings,
  predictedBoilerTemp,
  family.length
]);

// useEffect(() => {
//   if (showerReminders.length === 0 || showerReminder.visible) return;
//
//   const nextUser = showerReminders[0];
//   setShowerReminder({ visible: true, user: nextUser });
// }, [showerReminders, showerReminder.visible]);




  const getHourRange = () => (heatingMode === 'auto' ? `${autoStart}–${autoEnd}` : `${startHour}–${endHour}`);
  const getBoilerTypeText = () => userSettings.withSolar ? 'חשמל + סולארי' : 'חשמל בלבד';
  const getBoilerSizeText = () => userSettings.boilerSize ? `${parseInt(userSettings.boilerSize)} ליטר` : 'לא הוגדר';

const handleConfirm = (userName) => {
  const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  console.log(`${userName} סיים מקלחת בשעה ${endTime}`);

  setShowerReminders(prev => prev.filter(name => name !== userName));
  setShowerReminder({ visible: false, user: null });

  // ✨ החלק שמעדכן את המסך
  setShowerDoneTimes(prev => ({
    ...prev,
    [userName]: endTime,
  }));
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
  {family.map((member, index) => {
    const today = new Date().toISOString().split('T')[0];
    const showerTimeStr = member.showerTime;
    const wasShownTodayKey = `shower-shown-${member.name}-${today}`;
    const wasShownToday = localStorage.getItem(wasShownTodayKey);

    let isInShowerWindow = false;
    if (showerTimeStr) {
      const showerStart = new Date(`${today}T${showerTimeStr}:00`);
      const showerEnd = new Date(showerStart.getTime() + 20 * 60 * 1000);
      const now = new Date();
      isInShowerWindow = now >= showerStart && now <= showerEnd;
    }

    return (
      <li key={index} className="bg-gray-100 p-3 rounded-md dark:bg-gray-700">
        <p className="text-gray-800 dark:text-white font-bold">👤 {member.name}</p>
        <p className="text-gray-600 dark:text-gray-300">🕒 שעה: {member.showerTime || 'לא הוגדר'}</p>
        <p className="text-gray-600 dark:text-gray-300">🌡️ טמפ' מועדפת: {member.preferredTemp || 'לא הוגדר'}°C</p>

{isInShowerWindow && (
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

      {pendingPopupUser && (
  <div className="fixed bottom-4 right-4 bg-white border border-gray-300 shadow-lg rounded-lg p-4 z-50 max-w-sm dark:bg-gray-800">
    <p className="text-sm text-gray-800 dark:text-white mb-2">
      האם {pendingPopupUser} סיים/ה את המקלחת?
    </p>
    <button
      className="bg-green-600 text-white px-4 py-1 rounded-full hover:bg-green-700 text-sm"
      onClick={() => {
        handleConfirm(pendingPopupUser);
        localStorage.setItem(`shower-shown-${pendingPopupUser}-${new Date().toISOString().split('T')[0]}`, 'true');
        setPendingPopupUser(null);
      }}
    >
      ✔️ סיימתי
    </button>
  </div>
)}


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