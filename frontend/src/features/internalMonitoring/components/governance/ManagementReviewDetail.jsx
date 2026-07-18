import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { internalMonitoringApi } from '../../api/internalMonitoringApi';

const ManagementReviewDetail = () => {
  const { id } = useParams();
  const [review, setReview]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [building, setBuilding] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const load = async () => {
    // Pakai listManagementReviews dan filter by id jika tidak ada endpoint detail spesifik
    try {
      setLoading(true);
      const res = await internalMonitoringApi.listManagementReviews();
      const all = res.data?.data || [];
      const found = all.find(r => String(r.id) === String(id));
      setReview(found || null);
    } catch (err) {
      setError(err.message || 'Gagal memuat detail management review.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Memuat detail review...</div>;
  if (error)   return <div className="p-6 text-red-600 text-sm">{error}</div>;
  if (!review) return (
    <div className="p-6 text-center">
      <p className="text-gray-500">Review tidak ditemukan.</p>
      <Link to="/internal-monitoring/management-reviews" className="text-blue-600 text-sm hover:underline mt-2 inline-block">← Kembali</Link>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <Link to="/internal-monitoring/management-reviews" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
        ← Kembali ke Daftar Review
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{review.title}</h2>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span>Status: <strong className="text-gray-700">{review.status}</strong></span>
              <span>Dibuat: {review.created_at ? new Date(review.created_at).toLocaleDateString('id-ID') : '-'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {review.status === 'DRAFT' && (
              <button
                disabled={building}
                onClick={async () => { setBuilding(true); await internalMonitoringApi.buildReviewPack(review.id); load(); setBuilding(false); }}
                className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {building ? 'Building...' : '📦 Build Pack'}
              </button>
            )}
            {['DRAFT','SUBMITTED'].includes(review.status) && (
              <button
                disabled={finalizing}
                onClick={async () => { setFinalizing(true); await internalMonitoringApi.finalizeReview(review.id); load(); setFinalizing(false); }}
                className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {finalizing ? 'Finalizing...' : '✅ Finalize'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Items / Agenda */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">Agenda & Item Review</h3>
        </div>
        {(!review.items || review.items.length === 0) ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            <div className="text-3xl mb-2">📋</div>
            <p>Belum ada item agenda. Build Pack untuk mengisi otomatis dari temuan aktif.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {review.items.map((item, i) => (
              <div key={item.id || i} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.title || `Item ${i+1}`}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                  </div>
                  {item.decision && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 shrink-0">
                      {item.decision}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info status */}
      {review.status === 'FINALIZED' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
          ✅ Management Review ini telah difinalisasi dan tidak dapat diubah lagi.
        </div>
      )}
    </div>
  );
};

export default ManagementReviewDetail;
