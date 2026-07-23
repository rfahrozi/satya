import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../api/internalMonitoringApi';
import StatusBadge from '../components/StatusBadge';
import { Link } from 'react-router-dom';

const ReviewQueue = () => {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePeriodId, setActivePeriodId] = useState(null);

  // State for Batch Verification
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const periodRes = await internalMonitoringApi.listPeriods({ status: 'OPEN' });
      const periods = periodRes.data?.data || [];
      const periodId = periods[0]?.id ?? null;
      setActivePeriodId(periodId);

      const res = await internalMonitoringApi.listReviewQueue(periodId);
      setTargets(res.data?.data || []);
      setSelectedIds(new Set()); // Reset selections
    } catch (err) {
      setError(err.message || 'Gagal memuat antrean review.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === targets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(targets.map(t => t.id)));
    }
  };

  const handleBatchVerify = async () => {
    if (selectedIds.size === 0) return;
    const note = window.prompt(`Anda akan memverifikasi ${selectedIds.size} dokumen secara massal. Berikan catatan verifikasi (opsional):`);
    if (note === null) return; // User cancelled

    try {
      setIsVerifying(true);
      await internalMonitoringApi.batchVerifyTargets(Array.from(selectedIds), note);
      alert('Berhasil memverifikasi dokumen secara massal!');
      fetchQueue();
    } catch (err) {
      alert('Gagal melakukan batch verify: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-slate-400">Memuat antrean...</div>;
  if (error)   return <div className="p-4 text-red-400">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Antrean Verifikasi (Review Queue)</h1>
          <p className="text-sm text-slate-400 mt-1">Daftar target yang menunggu persetujuan (Approval) atau verifikasi Anda.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBatchVerify}
              disabled={isVerifying}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/20 text-sm font-semibold transition-all"
            >
              {isVerifying ? 'Memproses...' : `✅ Verifikasi Terpilih (${selectedIds.size})`}
            </button>
          )}
          <button onClick={fetchQueue} className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="bg-slate-900 shadow-xl sm:rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-800/80">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    checked={targets.length > 0 && selectedIds.size === targets.length}
                    onChange={toggleAll}
                    className="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Item</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Unit / Posisi</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Jatuh Tempo</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-slate-900 divide-y divide-slate-700/50">
              {targets.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-sm text-slate-500">
                    Tidak ada antrean yang perlu direview saat ini.
                  </td>
                </tr>
              ) : (
                targets.map(target => (
                  <tr key={target.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {target.workflow_status === 'AWAITING_VERIFICATION' ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(target.id)}
                          onChange={() => toggleSelect(target.id)}
                          className="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                        />
                      ) : (
                        <span className="text-slate-600" title="Hanya status AWAITING_VERIFICATION yang bisa di-batch verify">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-200">{target.item_code}</div>
                      <div className="text-sm text-slate-400 line-clamp-2" title={target.monitoring_item_title}>
                        {target.monitoring_item_title || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{target.unit_name || target.position_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={target.workflow_status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {target.due_date ? new Date(target.due_date).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/internal-monitoring/targets/${target.id}`} className="text-blue-400 hover:text-blue-300 transition-colors">
                        Review Detail ↗
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReviewQueue;
