import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../../api/internalMonitoringApi';

function agingColor(days) {
  if (days >= 30) return { bar: 'bg-red-500',   text: 'text-red-700',   badge: 'bg-red-50 text-red-700 border-red-200'   };
  if (days >= 14) return { bar: 'bg-amber-400',  text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
  return               { bar: 'bg-blue-400',    text: 'text-blue-700',  badge: 'bg-blue-50 text-blue-700 border-blue-200'  };
}

const ActionAgingDashboard = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await internalMonitoringApi.getActionAging();
        setData(res.data?.data || null);
      } catch (err) {
        setError(err.message || 'Gagal memuat action aging.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Memuat Action Aging Dashboard...</div>;
  if (error)   return <div className="p-6 text-red-600 text-sm">{error}</div>;

  // data bisa berupa array action plans (dari repeat findings queue yang di-reuse)
  const actions = Array.isArray(data) ? data : (data?.items || []);
  const maxDays  = Math.max(...actions.map(a => Number(a.days_open || a.hari_tertahan || 0)), 1);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">⏳ Action Aging Dashboard</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Action plan yang sudah lama terbuka — {actions.length} item aktif
        </p>
      </div>

      {/* SLA Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { color: 'bg-blue-400',  label: '< 14 hari (Normal)' },
          { color: 'bg-amber-400', label: '14-29 hari (Perhatian)' },
          { color: 'bg-red-500',   label: '≥ 30 hari (Kritis)' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${l.color}`} />
            <span className="text-gray-600">{l.label}</span>
          </div>
        ))}
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500 text-sm font-medium">Tidak ada action plan yang tertunggak.</p>
          <p className="text-xs text-gray-400 mt-1">Semua action plan berjalan sesuai SLA.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {actions
              .slice()
              .sort((a, b) => Number(b.days_open || b.hari_tertahan || 0) - Number(a.days_open || a.hari_tertahan || 0))
              .map((action, i) => {
                const days  = Number(action.days_open || action.hari_tertahan || 0);
                const color = agingColor(days);
                const pct   = Math.min((days / maxDays) * 100, 100);
                return (
                  <div key={action.id || i} className="px-5 py-4">
                    <div className="flex items-start gap-4 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full border shrink-0 ${color.badge}`}>
                        {days}h
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {action.title || action.nama_laporan || `Action #${i+1}`}
                        </p>
                        {(action.nama_satker || action.unit_name) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            📍 {action.nama_satker || action.unit_name}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Aging bar */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden ml-14">
                      <div
                        className={`h-full rounded-full ${color.bar} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionAgingDashboard;
