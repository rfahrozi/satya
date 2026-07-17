import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../api/internalMonitoringApi';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // In a real app, role would come from context/auth state
  const role = 'UNIT_PIC'; // mock role

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        // Defaulting to an example period_id
        let res;
        if (role === 'UNIT_PIC') {
          res = await internalMonitoringApi.getMyDashboard(999);
        } else if (role === 'PIMPINAN') {
          res = await internalMonitoringApi.getExecutiveDashboard(999);
        } else {
          res = await internalMonitoringApi.getOperationalDashboard(999);
        }
        setSummary(res.data?.data?.summary || res.data?.data);
      } catch (err) {
        setError(err.message || 'Gagal memuat dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [role]);

  if (loading) return <div className="p-4 text-center">Memuat dashboard...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Monitoring Internal</h1>
      
      {summary && role === 'UNIT_PIC' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard title="Total Target" value={summary.total} />
          <StatCard title="Belum Mulai" value={summary.notStarted} color="text-gray-500" />
          <StatCard title="Sedang Berjalan" value={summary.inProgress} color="text-blue-500" />
          <StatCard title="Menunggu Approval" value={summary.awaitingApproval} color="text-yellow-500" />
          <StatCard title="Verified" value={summary.verified} color="text-green-500" />
          <StatCard title="Overdue" value={summary.overdue} color="text-red-500" />
          <StatCard title="Open Follow-up" value={summary.openFollowUps} color="text-orange-500" />
        </div>
      )}

      {summary && role !== 'UNIT_PIC' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Compliance Rate" value={`${summary.complianceRate || 0}%`} />
          <StatCard title="Verified On Time" value={`${summary.verifiedOnTimeRate || 0}%`} />
          <StatCard title="Overdue Targets" value={summary.overdueCount || summary.overdue || 0} color="text-red-500" />
          <StatCard title="Open Follow-ups" value={summary.openFollowUpCount || summary.openFollowUps || 0} color="text-orange-500" />
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, color = 'text-gray-900' }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="px-4 py-5 sm:p-6">
      <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
      <dd className={`mt-1 text-3xl font-semibold ${color}`}>{value}</dd>
    </div>
  </div>
);

export default Dashboard;
