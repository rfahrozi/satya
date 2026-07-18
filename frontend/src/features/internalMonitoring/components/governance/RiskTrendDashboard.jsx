import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../../api/internalMonitoringApi';

const BAR_COLORS = ['bg-blue-500','bg-emerald-500','bg-amber-400','bg-red-400','bg-purple-400','bg-teal-500'];

const RiskTrendDashboard = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [months, setMonths]   = useState(6);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await internalMonitoringApi.getRiskTrends({ months });
        setData(res.data?.data);
      } catch (err) {
        setError(err.message || 'Gagal memuat tren risiko.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [months]);

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Memuat Risk Trends...</div>;
  if (error)   return <div className="p-6 text-red-600 text-sm">{error}</div>;

  const monthly = data?.monthly || [];
  const byLevel = data?.byLevel || {};
  const maxNew  = Math.max(...monthly.map(m => m.new_risks), 1);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">📈 Risk Trend Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Tren risiko baru dan tertutup per bulan</p>
        </div>
        <select
          value={months}
          onChange={e => setMonths(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value={3}>3 Bulan</option>
          <option value={6}>6 Bulan</option>
          <option value={12}>12 Bulan</option>
        </select>
      </div>

      {/* Breakdown per level */}
      {Object.keys(byLevel).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Distribusi Risiko Aktif per Level</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(byLevel).map(([level, count], i) => (
              <div key={level} className="text-center bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className={`text-2xl font-black ${['CRITICAL','HIGH'].includes(level) ? 'text-red-600' : ['MEDIUM'].includes(level) ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {count}
                </div>
                <div className="text-xs text-gray-500 mt-1 font-medium">{level}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar chart tren bulanan */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Tren Risiko Baru vs Tertutup</h3>
        {monthly.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <div className="text-3xl mb-2">📊</div>
            <p>Belum ada data tren. Risiko akan muncul setelah diidentifikasi dan dicatat.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Legend */}
            <div className="flex gap-4 text-xs text-gray-500 mb-2">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /><span>Risiko Baru</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span>Tertutup</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><span>Net (Baru−Tutup)</span></div>
            </div>

            {monthly.map((m, i) => (
              <div key={m.month} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600 font-medium">
                  <span>{m.month}</span>
                  <span className="flex gap-3">
                    <span className="text-blue-600">+{m.new_risks}</span>
                    <span className="text-emerald-600">−{m.closed_risks}</span>
                    <span className={m.net > 0 ? 'text-red-500' : 'text-emerald-600'}>net: {m.net > 0 ? '+' : ''}{m.net}</span>
                  </span>
                </div>
                <div className="flex gap-1 h-5">
                  {/* New risks bar */}
                  <div
                    className="bg-blue-500 rounded h-full transition-all duration-700"
                    style={{ width: `${(m.new_risks / maxNew) * 60}%`, minWidth: m.new_risks > 0 ? '4px' : '0' }}
                  />
                  {/* Closed risks bar */}
                  <div
                    className="bg-emerald-500 rounded h-full transition-all duration-700"
                    style={{ width: `${(m.closed_risks / maxNew) * 60}%`, minWidth: m.closed_risks > 0 ? '4px' : '0' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskTrendDashboard;
