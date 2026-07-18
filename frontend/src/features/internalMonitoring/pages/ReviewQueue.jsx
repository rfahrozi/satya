import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../api/internalMonitoringApi';
import StatusBadge from '../components/StatusBadge';
import { Link } from 'react-router-dom';

const ReviewQueue = () => {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePeriodId, setActivePeriodId] = useState(null);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        setLoading(true);
        // Ambil periode aktif terlebih dahulu, lalu gunakan ID-nya
        const periodRes = await internalMonitoringApi.listPeriods({ status: 'OPEN' });
        const periods = periodRes.data?.data || [];
        const periodId = periods[0]?.id ?? null;
        setActivePeriodId(periodId);

        const res = await internalMonitoringApi.listReviewQueue(periodId);
        setTargets(res.data?.data || []);
      } catch (err) {
        setError(err.message || 'Gagal memuat antrean review.');
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
          <h1 className="text-2xl font-bold text-gray-900">Antrean Review Target</h1>
          {activePeriodId && (
            <p className="text-sm text-gray-500 mt-1">Periode aktif ID: {activePeriodId}</p>
          )}
          {!activePeriodId && (
            <p className="text-sm text-amber-600 mt-1">⚠ Tidak ada periode aktif — semua target ditampilkan</p>
          )}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {targets.length === 0 ? (
            <li className="p-8 text-center text-gray-500">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-medium">Antrean kosong. Semua target sudah ditinjau!</p>
            </li>
          ) : (
            targets.map((target) => (
              <li key={target.id}>
                <Link to={`/internal-monitoring/targets/${target.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {target.monitoring_item_title || target.item_code}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {target.unit_name || target.position_name || 'Unit/Posisi tidak diketahui'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={target.workflow_status} />
                      <p className="text-xs text-gray-400">
                        Jatuh Tempo: {target.due_date
                          ? new Date(target.due_date).toLocaleDateString('id-ID')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default ReviewQueue;
