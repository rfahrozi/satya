import React from 'react';
import { Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function ComplianceSummary({ stats }) {
  if (!stats) return null;

  return (
    <div className="hidden sm:flex items-center gap-3">
      <div className="bg-slate-800/80 border border-white/5 rounded-xl px-4 py-2 flex flex-col items-center">
        <div className="font-black text-emerald-400 text-sm leading-none">{stats.persen_global}%</div>
        <div className="text-[10px] text-slate-400 font-medium mt-1">Rata-rata Global</div>
      </div>
      {stats.satker_merah > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 flex flex-col items-center">
          <div className="font-black text-red-400 text-sm leading-none">{stats.satker_merah}</div>
          <div className="text-[10px] text-red-300 font-medium mt-1">Satker Kritis</div>
        </div>
      )}
    </div>
  );
}
