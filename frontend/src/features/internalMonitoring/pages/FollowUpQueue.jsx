import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../api/internalMonitoringApi';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  OPEN:                 { label: 'Terbuka',             cls: 'bg-orange-100 text-orange-800' },
  IN_PROGRESS:          { label: 'Sedang Dikerjakan',   cls: 'bg-blue-100 text-blue-800'    },
  AWAITING_VERIFICATION:{ label: 'Menunggu Verifikasi', cls: 'bg-purple-100 text-purple-800' },
  REOPENED:             { label: 'Dibuka Kembali',      cls: 'bg-yellow-100 text-yellow-800' },
  CLOSED:               { label: 'Selesai',             cls: 'bg-green-100 text-green-800'  },
  CANCELLED:            { label: 'Dibatalkan',          cls: 'bg-gray-100 text-gray-500'    },
};

const FollowUpQueue = () => {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activePeriodId, setActivePeriodId] = useState(null);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        setLoading(true);
        // Gunakan periode aktif, bukan hardcoded 999
        const periodRes = await internalMonitoringApi.listPeriods({ status: 'OPEN' });
        const periods   = periodRes.data?.data || [];
        const periodId  = periods[0]?.id ?? null;
        setActivePeriodId(periodId);

        const res = await internalMonitoringApi.listFollowUpQueue(periodId);
        setFollowUps(res.data?.data || []);
      } catch (err) {
        setError(err.message || 'Gagal memuat antrean tindak lanjut.');
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
  }, []);

  if (loading) return <div className="p-4 text-center">Memuat antrean...</div>;
  if (error)   return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Antrean Tindak Lanjut (Follow-ups)</h1>
          {activePeriodId && (
            <p className="text-sm text-gray-500 mt-1">Periode aktif ID: {activePeriodId}</p>
          )}
          {!activePeriodId && (
            <p className="text-sm text-amber-600 mt-1">⚠ Tidak ada periode aktif — semua follow-up ditampilkan</p>
          )}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {followUps.length === 0 ? (
            <li className="p-8 text-center text-gray-500">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-medium">Tidak ada tindak lanjut aktif.</p>
            </li>
          ) : (
            followUps.map((fu) => {
              const cfg = STATUS_CONFIG[fu.status] || { label: fu.status, cls: 'bg-gray-100 text-gray-700' };
              return (
                <li key={fu.id}>
                  <Link
                    to={`/internal-monitoring/targets/${fu.monitoring_target_id}`}
                    className="block hover:bg-gray-50"
                  >
                    <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="text-sm font-medium text-blue-600 truncate">{fu.title}</p>
                        <p className="mt-1 text-xs text-gray-500 truncate max-w-md">{fu.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                        <p className="text-xs text-gray-400">
                          Jatuh Tempo: {fu.due_at
                            ? new Date(fu.due_at).toLocaleDateString('id-ID')
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};

export default FollowUpQueue;
