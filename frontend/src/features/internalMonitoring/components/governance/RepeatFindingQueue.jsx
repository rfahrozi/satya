import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../../api/internalMonitoringApi';

const MATCH_SCORE_COLOR = (score) => {
  if (score >= 0.8) return 'text-red-600 bg-red-50 border-red-200';
  if (score >= 0.6) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-blue-600 bg-blue-50 border-blue-200';
};

const RepeatFindingQueue = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [detecting, setDetecting]   = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await internalMonitoringApi.getRepeatFindings();
      setCandidates(res.data?.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat antrian repeat finding.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDetect = async () => {
    try {
      setDetecting(true);
      await internalMonitoringApi.detectRepeatFindings();
      load();
    } catch (err) {
      alert('Gagal deteksi: ' + (err.response?.data?.message || err.message));
    } finally {
      setDetecting(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      setProcessingId(id);
      if (action === 'confirm')  await internalMonitoringApi.confirmRepeatFinding(id);
      if (action === 'reject')   await internalMonitoringApi.rejectRepeatFinding(id);
      load();
    } catch (err) {
      alert('Gagal: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Memuat Repeat Finding Queue...</div>;
  if (error)   return <div className="p-6 text-red-600 text-sm">{error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🔁 Repeat Finding Queue</h2>
          <p className="text-sm text-gray-500 mt-0.5">Temuan berulang yang terdeteksi sistem — konfirmasi atau tolak</p>
        </div>
        <button
          onClick={handleDetect}
          disabled={detecting}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-50"
        >
          {detecting ? '⏳ Mendeteksi...' : '🔍 Deteksi Ulang'}
        </button>
      </div>

      {candidates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500 text-sm font-medium">Tidak ada kandidat repeat finding.</p>
          <p className="text-xs text-gray-400 mt-1">Klik "Deteksi Ulang" untuk menjalankan analisis.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map(c => {
            const score    = parseFloat(c.match_score || 0);
            const scorePct = Math.round(score * 100);
            const colorCls = MATCH_SCORE_COLOR(score);
            const busy     = processingId === c.id;
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  {/* Match score badge */}
                  <div className={`px-3 py-2 rounded-xl border text-center shrink-0 ${colorCls}`}>
                    <div className="text-xl font-black leading-none">{scorePct}%</div>
                    <div className="text-[10px] font-medium mt-0.5">kesamaan</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                        <p className="text-[10px] font-bold text-red-500 uppercase mb-1">Temuan Baru</p>
                        <p className="text-sm font-medium text-gray-800">{c.finding_title || c.finding_code}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">Temuan Sebelumnya</p>
                        <p className="text-sm font-medium text-gray-800">{c.matched_title || c.matched_code}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(c.id, 'confirm')}
                        disabled={busy}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        ✓ Konfirmasi Berulang
                      </button>
                      <button
                        onClick={() => handleAction(c.id, 'reject')}
                        disabled={busy}
                        className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        ✗ Tolak
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RepeatFindingQueue;
