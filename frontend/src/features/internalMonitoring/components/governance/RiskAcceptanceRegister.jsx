import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../../api/internalMonitoringApi';

function isExpired(validUntil) {
  return validUntil && new Date(validUntil) < new Date();
}

const RiskAcceptanceRegister = () => {
  const [acceptances, setAcceptances] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [revoking, setRevoking]       = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await internalMonitoringApi.getRiskAcceptances();
      setAcceptances(res.data?.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat register penerimaan risiko.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (id) => {
    if (!confirm('Yakin ingin mencabut penerimaan risiko ini?')) return;
    try {
      setRevoking(id);
      await internalMonitoringApi.revokeRiskAcceptance(id);
      load();
    } catch (err) {
      alert('Gagal mencabut: ' + (err.response?.data?.message || err.message));
    } finally {
      setRevoking(null);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Memuat Risk Acceptance Register...</div>;
  if (error)   return <div className="p-6 text-red-600 text-sm">{error}</div>;

  const active  = acceptances.filter(a => a.status === 'ACTIVE' && !isExpired(a.valid_until));
  const expired = acceptances.filter(a => a.status === 'EXPIRED' || isExpired(a.valid_until));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">📜 Risk Acceptance Register</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Risiko yang secara formal diterima oleh Pimpinan — {active.length} aktif, {expired.length} kedaluwarsa
        </p>
      </div>

      {acceptances.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
          <div className="text-4xl mb-3">📜</div>
          <p className="text-gray-500 text-sm">Belum ada risiko yang diterima secara formal.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                <h3 className="text-sm font-bold text-amber-700">⚠ Aktif ({active.length})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {active.map(a => (
                  <div key={a.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{a.risk_title || a.risk_code}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>Kode: <strong>{a.risk_code}</strong></span>
                        {a.valid_until && (
                          <span className={isExpired(a.valid_until) ? 'text-red-500 font-semibold' : ''}>
                            Berlaku s.d. {new Date(a.valid_until).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </div>
                      {a.rationale && <p className="text-xs text-gray-400 mt-1 italic">{a.rationale}</p>}
                    </div>
                    <button
                      onClick={() => handleRevoke(a.id)}
                      disabled={revoking === a.id}
                      className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {revoking === a.id ? 'Mencabut...' : 'Cabut'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expired.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden opacity-70">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-500">⏰ Kedaluwarsa ({expired.length})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {expired.map(a => (
                  <div key={a.id} className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-600 line-through">{a.risk_title || a.risk_code}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Berakhir: {a.valid_until ? new Date(a.valid_until).toLocaleDateString('id-ID') : '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RiskAcceptanceRegister;
