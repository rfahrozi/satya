import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../../api/internalMonitoringApi';

// ─── Warna sel matriks 5×5 (Likelihood × Impact) ─────────────────────────────
function cellColor(likelihood, impact, count) {
  if (count === 0) return 'bg-gray-100 text-gray-300';
  const score = likelihood * impact;
  if (score >= 15) return 'bg-red-500 text-white';
  if (score >= 8)  return 'bg-amber-400 text-white';
  if (score >= 4)  return 'bg-yellow-200 text-yellow-800';
  return 'bg-green-100 text-green-700';
}

function riskLevelLabel(l, i) {
  const s = l * i;
  if (s >= 15) return 'KRITIS';
  if (s >= 8)  return 'TINGGI';
  if (s >= 4)  return 'SEDANG';
  return 'RENDAH';
}

const LEVEL_LABELS = ['Sangat Rendah','Rendah','Sedang','Tinggi','Sangat Tinggi'];

const RiskHeatmap = () => {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [useResidual, setUseResidual] = useState(false);
  const [tooltip, setTooltip]     = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await internalMonitoringApi.getRiskHeatmap({ use_residual: useResidual ? 'true' : 'false' });
        setData(res.data?.data);
      } catch (err) {
        setError(err.message || 'Gagal memuat heatmap risiko.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [useResidual]);

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Memuat Risk Heatmap...</div>;
  if (error)   return <div className="p-6 text-red-600 text-sm">{error}</div>;

  const matrix = data?.matrix || Array.from({ length: 5 }, () => Array(5).fill(0));
  const total  = data?.total  || 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🗺️ Risk Heatmap</h2>
          <p className="text-sm text-gray-500 mt-0.5">Matrix Likelihood × Impact — {total} risiko aktif</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={useResidual} onChange={e => setUseResidual(e.target.checked)} className="w-4 h-4 accent-blue-600" />
          Risiko Residual
        </label>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { color: 'bg-red-500',    label: 'Kritis (≥15)'  },
          { color: 'bg-amber-400',  label: 'Tinggi (8-14)' },
          { color: 'bg-yellow-200', label: 'Sedang (4-7)'  },
          { color: 'bg-green-100',  label: 'Rendah (1-3)'  },
          { color: 'bg-gray-100',   label: 'Kosong'         },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded border border-gray-200 ${l.color}`} />
            <span className="text-gray-600">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div className="overflow-auto">
        <table className="border-collapse mx-auto">
          <thead>
            <tr>
              <th className="w-24 text-xs text-gray-400 text-right pr-2 pb-1">L ↓ / I →</th>
              {[1,2,3,4,5].map(i => (
                <th key={i} className="w-16 text-center text-xs font-semibold text-gray-500 pb-1">
                  I{i}<br/><span className="font-normal text-gray-400 text-[10px]">{LEVEL_LABELS[i-1]?.split(' ')[0]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[5,4,3,2,1].map(l => (
              <tr key={l}>
                <td className="text-xs font-semibold text-gray-500 text-right pr-2 py-1">
                  L{l}<br/><span className="font-normal text-gray-400 text-[10px]">{LEVEL_LABELS[l-1]?.split(' ')[0]}</span>
                </td>
                {[1,2,3,4,5].map(i => {
                  const count = matrix[l-1]?.[i-1] ?? 0;
                  const cc    = cellColor(l, i, count);
                  const active = tooltip?.l === l && tooltip?.i === i;
                  return (
                    <td key={i} className="p-0.5 relative">
                      <div
                        className={`w-16 h-14 rounded-lg flex flex-col items-center justify-center cursor-default transition-all duration-200 ${cc} ${active ? 'ring-2 ring-blue-400 scale-105' : 'hover:scale-105'}`}
                        onMouseEnter={() => setTooltip({ l, i, count })}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="text-lg font-black leading-none">{count}</span>
                        <span className="text-[9px] opacity-75 mt-0.5">{riskLevelLabel(l, i)}</span>
                      </div>
                      {active && count > 0 && (
                        <div className="absolute z-10 -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg pointer-events-none">
                          L{l} × I{i} = {l * i} · {count} risiko
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total === 0 && (
        <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl">
          <div className="text-3xl mb-2">✅</div>
          <p>Tidak ada risiko aktif saat ini.</p>
        </div>
      )}
    </div>
  );
};

export default RiskHeatmap;
