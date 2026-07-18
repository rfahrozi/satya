import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../../api/internalMonitoringApi';

const ManagementReviewPack = ({ reviewId }) => {
  const [pack, setPack]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [building, setBuilding] = useState(false);

  const buildPack = async () => {
    if (!reviewId) return;
    try {
      setBuilding(true);
      setError(null);
      const res = await internalMonitoringApi.buildReviewPack(reviewId);
      setPack(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal build pack.');
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">📦 Management Review Pack</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Paket kompilasi otomatis: temuan aktif, risiko kritis, follow-up tertunggak
        </p>
      </div>

      {!reviewId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          ⚠ Buka halaman ini dari detail Management Review untuk memuat pack yang spesifik.
        </div>
      )}

      {reviewId && (
        <button
          onClick={buildPack}
          disabled={building}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          {building ? '⏳ Building Pack...' : '🔨 Build / Refresh Pack'}
        </button>
      )}

      {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4">{error}</div>}

      {pack ? (
        <div className="space-y-4">
          {/* Findings summary */}
          {pack.findings && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 mb-3">🔍 Temuan Aktif ({pack.findings.length})</h3>
              {pack.findings.length === 0 ? (
                <p className="text-xs text-gray-400">Tidak ada temuan aktif.</p>
              ) : (
                <ul className="space-y-2">
                  {pack.findings.slice(0, 10).map((f, i) => (
                    <li key={f.id || i} className="flex items-start gap-2 text-sm">
                      <span className="text-red-500 font-bold shrink-0">•</span>
                      <span className="text-gray-700">{f.title || f.finding_code}</span>
                    </li>
                  ))}
                  {pack.findings.length > 10 && <li className="text-xs text-gray-400">...dan {pack.findings.length - 10} temuan lainnya</li>}
                </ul>
              )}
            </div>
          )}

          {/* Overdue actions */}
          {pack.overdueActions && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 mb-3">⏰ Action Plans Terlambat ({pack.overdueActions.length})</h3>
              {pack.overdueActions.length === 0 ? (
                <p className="text-xs text-gray-400">Tidak ada action plan yang terlambat.</p>
              ) : (
                <ul className="space-y-2">
                  {pack.overdueActions.map((a, i) => (
                    <li key={a.id || i} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-500 font-bold shrink-0">•</span>
                      <span className="text-gray-700">{a.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="text-xs text-gray-400 text-center">
            Pack dibuat pada: {pack.generated_at ? new Date(pack.generated_at).toLocaleString('id-ID') : 'baru saja'}
          </div>
        </div>
      ) : !building && reviewId && (
        <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-400 text-sm">
          <div className="text-3xl mb-2">📦</div>
          <p>Klik "Build Pack" untuk mengkompilasi data terbaru ke dalam paket review.</p>
        </div>
      )}
    </div>
  );
};

export default ManagementReviewPack;
