import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../api/internalMonitoringApi';
import StatusBadge from '../components/StatusBadge';
import { Link } from 'react-router-dom';

const MyTargets = () => {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        setLoading(true);
        // Usually we would pass current period_id, using a global state or selector
        const res = await internalMonitoringApi.listTargets({ role_scope: 'UNIT_PIC' });
        setTargets(res.data?.data || []);
      } catch (err) {
        setError(err.message || 'Gagal memuat daftar target.');
      } finally {
        setLoading(false);
      }
    };

    fetchTargets();
  }, []);

  if (loading) return <div className="p-4 text-center">Memuat data...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Target Monitoring Saya</h1>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {targets.length === 0 ? (
            <li className="p-4 text-center text-gray-500">Tidak ada target yang ditugaskan kepada Anda.</li>
          ) : (
            targets.map((target) => (
              <li key={target.id}>
                <Link to={`/internal-monitoring/targets/${target.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {target.monitoring_item_title || target.item_code}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <StatusBadge status={target.workflow_status} />
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Jatuh Tempo: {target.due_date ? new Date(target.due_date).toLocaleDateString('id-ID') : '-'}
                        </p>
                      </div>
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

export default MyTargets;
