import React, { useEffect, useState, useContext } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from 'react-router-dom';

// Enhanced custom tooltip with better styling
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
        <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span className="text-gray-700 dark:text-gray-300">
              צריכה בפועל: <strong>{payload[0].payload.actual_kWh} kWh</strong>
            </span>
          </p>
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
            <span className="text-gray-700 dark:text-gray-300">
              צריכה בסיסית: <strong>{payload[0].payload.baseline_kWh} kWh</strong>
            </span>
          </p>
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-green-600 dark:text-green-400 font-semibold">
              חיסכון: <strong>₪{payload[0].payload.money_saved_ils.toFixed(2)}</strong>
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Main enhanced component
export default function EnergySavingsGraph() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      console.warn("❌ No token found, skipping request.");
      setLoading(false);
      return;
    }
    console.log("📦 Token in context:", token);

    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://127.0.0.1:5000/summary/today", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 204) {
          setSummary(null);
          return;
        }

        const json = await res.json();
        console.log("✅ Today's Summary:", json);
        setSummary(json);
      } catch (err) {
        console.error("❌ Error fetching summary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [token]);

  if (loading) {
    return (
      <div className="w-full px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Header with gradient background */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
          נתוני חיסכון יומי
        </h2>
        <p className="text-gray-600 dark:text-gray-400">מעקב אחר הצריכה והחיסכון שלך</p>
      </div>

      {summary ? (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Actual Usage Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl shadow-md border border-blue-200 dark:border-blue-700">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl">⚡</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">צריכה בפועל</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.actual_kWh ?? 0} <span className="text-sm font-normal">kWh</span>
                </p>
              </div>
            </div>

            {/* Baseline Usage Card */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-xl shadow-md border border-orange-200 dark:border-orange-700">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl">🔌</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">צריכה ללא המערכת</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {summary.baseline_kWh ?? 0} <span className="text-sm font-normal">kWh</span>
                </p>
              </div>
            </div>

            {/* Savings Card */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl shadow-md border border-green-200 dark:border-green-700">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl">💰</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">חיסכון היום</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ₪{(summary.money_saved_ils ?? 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Button */}
          <div className="text-center">
            <button
              onClick={() => navigate("/graphs/money")}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-blue-500 text-white font-semibold rounded-lg shadow-lg hover:from-orange-400 hover:to-blue-400 transform hover:scale-105 transition-all duration-200"
            >
              <span className="text-lg">📊</span>
              עבור לגרף שבועי
            </button>
          </div>
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
            אין נתוני חיסכון להיום עדיין. בדוק שוב מאוחר יותר.
          </p>
        </div>
      )}
    </div>
  );
}