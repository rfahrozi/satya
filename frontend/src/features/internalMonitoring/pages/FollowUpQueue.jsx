import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../api/internalMonitoringApi';
import { Link } from 'react-router-dom';

const FollowUpQueue = () => {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        setLoading(true);
        const res = await internalMonitoringApi.listFollowUpQueue(999); // Mock period
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
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'bg-orange-100 text-orange-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'CLOSED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Antrean Tindak Lanjut (Follow-ups)</h1>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {followUps.length === 0 ? (
            <li className="p-4 text-center text-gray-500">Tidak ada tindak lanjut aktif.</li>
          ) : (
            followUps.map((fu) => (
              <li key={fu.id}>
                <Link to={`/internal-monitoring/targets/${fu.monitoring_target_id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-blue-600 truncate">{fu.title}</p>
                      <p className="mt-1 text-xs text-gray-500 max-w-md truncate">{fu.description}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(fu.status)}`}>
                        {fu.status}
                      </span>
                      <p className="mt-2 text-xs text-gray-400">
                        Jatuh Tempo: {fu.due_at ? new Date(fu.due_at).toLocaleDateString('id-ID') : '-'}
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

export default FollowUpQueue;
