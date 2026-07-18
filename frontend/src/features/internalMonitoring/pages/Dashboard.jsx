import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../api/internalMonitoringApi';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Baca role dari auth state yang sesungguhnya, bukan hardcoded
  const user = JSON.parse(localStorage.getItem('satya_user') || 'null');
  const role = user?.role || 'UNIT_PIC';

  // Tentukan apakah user adalah pimpinan/eksekutif berdasarkan role
  const isExecutive = ['KPT', 'WKPT', 'PIMPINAN'].includes(role);
  const isOperational = ['ADMIN_PT', 'VERIFIER', 'PANITERA_PT'].includes(role);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        let res;
        if (isExecutive) {
          res = await internalMonitoringApi.getExecutiveDashboard();
        } else if (isOperational) {
          res = await internalMonitoringApi.getOperationalDashboard();
        } else {
          res = await internalMonitoringApi.getMyDashboard();
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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Monitoring Internal</h1>
      <p className="text-sm text-gray-500 mb-6">
        {isExecutive ? 'Ringkasan eksekutif seluruh unit Pengadilan Tinggi' :
         isOperational ? 'Tampilan operasional — semua target dalam periode aktif' :
         'Target monitoring yang ditugaskan kepada Anda'}
      </p>

      {/* View Pimpinan / Eksekutif */}
      {summary && isExecutive && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Compliance Rate"     value={`${summary.complianceRate ?? 0}%`}        color="text-emerald-600" />
          <StatCard title="Verified Tepat Waktu" value={`${summary.verifiedOnTimeRate ?? 0}%`}   color="text-blue-600"    />
          <StatCard title="Overdue"             value={summary.overdueCount ?? summary.overdue ?? 0}  color="text-red-500"     />
          <StatCard title="Follow-up Terbuka"   value={summary.openFollowUpCount ?? summary.openFollowUps ?? 0} color="text-orange-500"  />
        </div>
      )}

      {/* View Operasional (Admin / Verifier) */}
      {summary && isOperational && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Compliance Rate"     value={`${summary.complianceRate ?? 0}%`}        color="text-emerald-600" />
          <StatCard title="Verified Tepat Waktu" value={`${summary.verifiedOnTimeRate ?? 0}%`}   color="text-blue-600"    />
          <StatCard title="Overdue"             value={summary.overdueCount ?? summary.overdue ?? 0}  color="text-red-500"     />
          <StatCard title="Follow-up Terbuka"   value={summary.openFollowUpCount ?? summary.openFollowUps ?? 0} color="text-orange-500"  />
        </div>
      )}

      {/* View Unit PIC — tampilkan target personal */}
      {summary && !isExecutive && !isOperational && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Target"         value={summary.total ?? 0}              />
          <StatCard title="Belum Mulai"          value={summary.notStarted ?? 0}         color="text-gray-500"    />
          <StatCard title="Sedang Berjalan"      value={summary.inProgress ?? 0}         color="text-blue-500"    />
          <StatCard title="Menunggu Approval"    value={summary.awaitingApproval ?? 0}   color="text-yellow-500"  />
          <StatCard title="Verified"             value={summary.verified ?? 0}           color="text-green-500"   />
          <StatCard title="Overdue"              value={summary.overdue ?? 0}            color="text-red-500"     />
          <StatCard title="Follow-up Terbuka"    value={summary.openFollowUps ?? 0}      color="text-orange-500"  />
        </div>
      )}

      {/* Shortcut navigasi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/satya/internal-monitoring/targets"
           className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-md transition-all">
          <div className="text-lg font-semibold text-gray-800 mb-1">📋 Target Saya</div>
          <div className="text-sm text-gray-500">Lihat semua checklist yang ditugaskan kepada Anda</div>
        </a>
        {(isExecutive || isOperational) && (
          <a href="/satya/internal-monitoring/review-queue"
             className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-md transition-all">
            <div className="text-lg font-semibold text-gray-800 mb-1">🔍 Antrian Review</div>
            <div className="text-sm text-gray-500">Target yang menunggu approval atau verifikasi</div>
          </a>
        )}
        <a href="/satya/internal-monitoring/follow-ups"
           className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-md transition-all">
          <div className="text-lg font-semibold text-gray-800 mb-1">📌 Follow-up Aktif</div>
          <div className="text-sm text-gray-500">Tindak lanjut yang perlu diselesaikan</div>
        </a>
      </div>
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
