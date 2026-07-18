import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { internalMonitoringApi } from '../../api/internalMonitoringApi';

const STATUS_CONFIG = {
  DRAFT:     { label: 'Draft',      cls: 'bg-gray-100 text-gray-600'   },
  SUBMITTED: { label: 'Diajukan',   cls: 'bg-blue-100 text-blue-700'   },
  FINALIZED: { label: 'Final',      cls: 'bg-emerald-100 text-emerald-700' },
  AMENDED:   { label: 'Diamendemen',cls: 'bg-amber-100 text-amber-700' },
};

const ManagementReviewList = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await internalMonitoringApi.listManagementReviews();
      setReviews(res.data?.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar management review.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const title = prompt('Judul Management Review:');
    if (!title?.trim()) return;
    try {
      setCreating(true);
      await internalMonitoringApi.createManagementReview({ title, period_scope: new Date().getFullYear() });
      load();
    } catch (err) {
      alert('Gagal membuat review: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Memuat Management Reviews...</div>;
  if (error)   return <div className="p-6 text-red-600 text-sm">{error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🗂️ Management Review</h2>
          <p className="text-sm text-gray-500 mt-0.5">Sesi tinjauan manajemen — temuan, keputusan, tindak lanjut strategis</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          {creating ? 'Membuat...' : '+ Review Baru'}
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
          <div className="text-4xl mb-3">🗂️</div>
          <p className="text-gray-500 text-sm font-medium">Belum ada sesi Management Review.</p>
          <p className="text-xs text-gray-400 mt-1">Klik "+ Review Baru" untuk memulai sesi pertama.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Judul</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dibuat</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviews.map(r => {
                const cfg = STATUS_CONFIG[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.title}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${cfg.cls}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {r.status === 'DRAFT' && (
                          <button
                            onClick={async () => { await internalMonitoringApi.buildReviewPack(r.id); load(); }}
                            className="px-3 py-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                          >
                            Build Pack
                          </button>
                        )}
                        {(r.status === 'SUBMITTED' || r.status === 'DRAFT') && (
                          <button
                            onClick={async () => { await internalMonitoringApi.finalizeReview(r.id); load(); }}
                            className="px-3 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            Finalize
                          </button>
                        )}
                        <Link
                          to={`/internal-monitoring/management-reviews/${r.id}`}
                          className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          Detail →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManagementReviewList;
