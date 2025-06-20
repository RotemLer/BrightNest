import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from "../../context/AppContext";
import { Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function MoneySavedGraph() {
  const { token } = useContext(AppContext);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSavings, setTotalSavings] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWeekSummary = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://127.0.0.1:5000/summaries/week", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          console.log("💰 Weekly money saved data:", json);
          setWeeklyData(json);

          // Calculate total savings
          const total = json.reduce((sum, day) => sum + (day.money_saved_ils ?? 0), 0);
          setTotalSavings(total);
        }
      } catch (error) {
        console.error("Error fetching weekly data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchWeekSummary();
    }
  }, [token]);

  const chartData = {
    labels: weeklyData.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
    }),
    datasets: [
      {
        label: 'חיסכון יומי (₪)',
        data: weeklyData.map(day => day.money_saved_ils ?? 0),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ],
  };

  const chartOptions = {
    plugins: {
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: context => `חיסכון: ₪${context.raw.toFixed(2)}`
        }
      },
      legend: {
        position: 'top',
        labels: {
          font: { size: 14, weight: 'bold' },
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false,
        },
        ticks: {
          callback: value => `₪${value}`,
          font: { size: 12 },
          color: '#6B7280'
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 12 },
          color: '#6B7280'
        }
      }
    },
    elements: {
      line: {
        borderWidth: 3,
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            💰 גרף חיסכון בשבוע האחרון
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            מעקב אחר החיסכון הכספי שלך לאורך השבוע
          </p>
        </div>

        {/* Statistics Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-2xl">💰</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">סה"כ חיסכון השבוע</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                ₪{totalSavings.toFixed(2)}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-2xl">📊</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">ממוצע יומי</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                ₪{weeklyData.length > 0 ? (totalSavings / weeklyData.length).toFixed(2) : '0.00'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-2xl">📈</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">ימים עם נתונים</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {weeklyData.length}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <button
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-blue-500 text-white font-semibold rounded-lg shadow-lg hover:from-orange-400 hover:to-blue-400 transform hover:scale-105 transition-all duration-200"
            onClick={() => navigate("/weekly-graph")}
          >
            <span className="text-xl">🔌</span>
            גרף צריכת חשמל
          </button>

          <button
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-lg shadow-lg hover:from-gray-600 hover:to-gray-700 transform hover:scale-105 transition-all duration-200"
            onClick={() => navigate("/dashbord")}
          >
            <span className="text-xl">🏠</span>
            חזרה לדף הבית
          </button>
        </div>

        {/* Chart Container */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          {weeklyData.length > 0 ? (
            <div className="h-[500px]">
              <Line data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-gray-400">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                אין נתונים זמינים
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                אין נתוני חיסכון שבועיים זמינים כרגע
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}