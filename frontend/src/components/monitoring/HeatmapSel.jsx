import React, { useState } from 'react';

const WARNA_CONFIG = {
  hijau:  { bg: 'bg-emerald-500',    border: 'border-emerald-400/40', text: 'text-emerald-300', label: 'Patuh'      },
  kuning: { bg: 'bg-amber-400',      border: 'border-amber-300/40',   text: 'text-amber-300',   label: 'Perhatian' },
  merah:  { bg: 'bg-red-500',        border: 'border-red-400/40',     text: 'text-red-300',     label: 'Rendah'     },
  abu:    { bg: 'bg-slate-700',      border: 'border-slate-600/40',   text: 'text-slate-500',   label: 'Kosong'  },
};

const BULAN_PENDEK = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export function HeatmapSel({ sel, isFuture, onClick }) {
  const [tip, setTip] = useState(false);
  const warna = isFuture ? 'abu' : (sel?.warna ?? 'abu');
  const cfg   = WARNA_CONFIG[warna];
  const persen = sel?.persen ?? 0;
  const opacity = isFuture ? 'opacity-20' : '';

  return (
    <div
      className={`relative group ${!isFuture ? 'cursor-pointer' : ''}`}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
      onClick={!isFuture ? onClick : undefined}
    >
      <div
        className={`
          w-full aspect-square rounded-md border ${cfg.border} ${cfg.bg} ${opacity}
          flex items-center justify-center
          transition-all duration-300 hover:scale-110 hover:z-10 hover:shadow-[0_0_12px_rgba(0,0,0,0.5)]
        `}
        style={{ boxShadow: tip && !isFuture ? `0 0 10px var(--tw-shadow-color)` : 'none', shadowColor: cfg.bg }}
        aria-label={`${BULAN_PENDEK[sel?.bulan ?? 0]}: ${persen}%`}
      >
        <span className="text-[9px] font-bold text-white/90 select-none">
          {isFuture ? '' : `${persen}%`}
        </span>
      </div>

      {tip && !isFuture && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 shadow-2xl pointer-events-none whitespace-nowrap min-w-[140px]">
            <div className={`font-bold text-[13px] ${cfg.text} mb-1 flex items-center justify-between`}>
              {cfg.label}
              <span className="text-white text-[10px] bg-white/10 px-1.5 rounded">{BULAN_PENDEK[sel?.bulan ?? 0]}</span>
            </div>
            <div className="text-slate-300 text-[11px] mb-0.5"><strong>{persen}%</strong> kepatuhan</div>
            {sel?.total_upload != null && (
              <div className="text-slate-400 text-[10px]">{sel.total_upload} dari {sel.total_wajib} laporan terunggah</div>
            )}
            {sel?.persen_tepat_waktu != null && (
              <div className="text-slate-400 text-[10px]">{sel.persen_tepat_waktu}% selesai tepat waktu</div>
            )}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}

export { WARNA_CONFIG, BULAN_PENDEK };
