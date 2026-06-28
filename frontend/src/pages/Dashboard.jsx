// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  Search,
  ShieldCheck,
  Clock,
  Activity,
  Inbox,
  RefreshCw,
  Timer,
  MailWarning,
  CheckCheck,
  Upload,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  Trophy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../lib/axios';
import HistoryModal from '../components/HistoryModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTHS = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// ─── Konstanta warna heatmap ──────────────────────────────────────────────────
const WARNA_CONFIG = {
  hijau:  { bg: 'bg-emerald-500',    border: 'border-emerald-400/40', text: 'text-emerald-300', label: 'Patuh'      },
  kuning: { bg: 'bg-amber-400',      border: 'border-amber-300/40',   text: 'text-amber-300',   label: 'Perhatian' },
  merah:  { bg: 'bg-red-500',        border: 'border-red-400/40',     text: 'text-red-300',     label: 'Rendah'     },
  abu:    { bg: 'bg-slate-700',      border: 'border-slate-600/40',   text: 'text-slate-500',   label: 'Kosong'  },
};

const BULAN_PENDEK = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

// ─── Komponen Sel Heatmap ─────────────────────────────────────────────────────
function HeatmapSel({ sel, isFuture, onClick }) {
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

// ─── Komponen Utama Heatmap ───────────────────────────────────────────────────
function HeatmapKepatuhan({ raw, isLoading, tahun, setTahun, now, onCellClick }) {
  const heatmapData = raw?.data ?? [];
  const stats       = raw?.stats ?? null;
  const bulanSkrg   = now.getMonth() + 1;
  const isThisYear  = parseInt(tahun) === now.getFullYear();

  const trendIcon = (rata) => {
    if (rata >= 80) return <TrendingUp size={12} className="text-emerald-400" />;
    if (rata >= 50) return <Minus size={12} className="text-amber-400" />;
    return <TrendingDown size={12} className="text-red-400" />;
  };

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-linear-to-br from-orange-500/20 to-red-500/5 border border-orange-500/20 rounded-xl shadow-inner">
            <Flame size={20} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Heatmap Kepatuhan</h2>
            <p className="text-xs text-slate-400 mt-0.5">Tren kinerja 12 bulan seluruh satker</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {stats && (
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
          )}

          <select
            aria-label="Pilih tahun heatmap"
            value={tahun}
            onChange={e => setTahun(e.target.value)}
            className="bg-slate-800 border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer transition-colors hover:bg-slate-700"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>Tahun {y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 mb-6 flex-wrap bg-slate-900/50 p-3 rounded-xl border border-white/5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kepatuhan:</span>
        {Object.entries(WARNA_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${cfg.bg}`} style={{ boxShadow: `0 0 8px ${cfg.bg.replace('bg-', '')}` }} />
            <span className="text-[11px] font-medium text-slate-300">{cfg.label}</span>
          </div>
        ))}
        <span className="text-[10px] text-slate-500 ml-auto hidden md:block italic">
          ≥80% patuh · 50-79% perhatian · &lt;50% rendah
        </span>
      </div>

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="flex gap-3 items-center">
              <div className="w-32 h-5 bg-slate-800 rounded-md" />
              <div className="flex-1 grid grid-cols-12 gap-1.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-slate-800 rounded-md" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : heatmapData.length === 0 ? (
        <div className="text-center py-10 bg-slate-900/50 rounded-xl border border-dashed border-white/10">
          <Flame size={32} className="mx-auto text-slate-600 mb-3" />
          <div className="text-sm text-slate-400">Tidak ada data tren untuk tahun {tahun}.</div>
        </div>
      ) : (
        <div className="space-y-2 relative z-10">
          {/* Header kolom bulan */}
          <div className="flex gap-3 items-center mb-2 pl-36">
            <div className="flex-1 grid grid-cols-12 gap-1.5">
              {BULAN_PENDEK.slice(1).map((b, i) => (
                <div
                  key={i}
                  className={`text-center text-[10px] font-bold tracking-wider ${
                    isThisYear && i + 1 === bulanSkrg
                      ? 'text-orange-400 bg-orange-400/10 py-1 rounded'
                      : i + 1 > bulanSkrg && isThisYear
                        ? 'text-slate-600'
                        : 'text-slate-400'
                  }`}
                >
                  {b}
                </div>
              ))}
            </div>
          </div>

          {/* Baris per satker */}
          {heatmapData.map(satker => (
            <div key={satker.satker_id} className="flex gap-3 items-center group/row hover:bg-slate-800/30 p-1.5 -ml-1.5 rounded-xl transition-colors">
              <div className="w-32 shrink-0 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-slate-200 truncate group-hover/row:text-white transition-colors">
                    {satker.nama_satker}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {trendIcon(satker.rata_tahunan)}
                    <span className={`text-[10px] font-bold ${WARNA_CONFIG[satker.warna_rata]?.text}`}>
                      {satker.rata_tahunan}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-12 gap-1.5">
                {satker.sel.map(sel => {
                  const isFuture = isThisYear && sel.bulan > bulanSkrg;
                  return (
                    <HeatmapSel
                      key={sel.bulan}
                      sel={sel}
                      isFuture={isFuture}
                      onClick={() => onCellClick && onCellClick(sel.bulan, satker.nama_satker)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value = 0, max = 1, label = '' }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  const colorClass = pct === 100 ? 'from-emerald-600 to-emerald-400' : pct >= 70 ? 'from-amber-500 to-amber-300' : 'from-red-600 to-red-400';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
        <div className={`bg-linear-to-r ${colorClass} h-full rounded-full`} style={{ width: `${pct}%`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>
      <div className="text-[11px] font-bold text-slate-300 w-9 text-right">{pct}%</div>
    </div>
  );
}

// ─── Komponen Row Accordion untuk Satker ──────────────────────────────────────
function SatkerRow({ satker, isAdmin, openHistory, handleDownloadPdf, handleDownloadExcel, openVerifyModal }) {
  const [isOpen, setIsOpen] = useState(false);
  const pct = parseInt(satker.statistik?.persentase_kepatuhan || 0);
  const headerBadge = pct === 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : pct >= 70 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';

  return (
    <div className={`bg-slate-900 border transition-all duration-300 rounded-2xl overflow-hidden ${isOpen ? 'border-slate-600 shadow-2xl shadow-black/50' : 'border-slate-700/50 hover:border-slate-600 hover:bg-slate-800'}`}>
      <div 
        className="flex items-center justify-between p-5 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-3 h-3 rounded-full ${headerBadge}`} />
          <div className="flex-1 pr-4">
            <div className="font-bold text-white text-base mb-1.5">{satker.nama_satker}</div>
            <ProgressBar
              value={satker.statistik?.total_upload || 0}
              max={satker.statistik?.total_wajib || 1}
              label={`Kepatuhan ${satker.nama_satker}`}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="font-black text-white text-xl">{satker.statistik?.persentase_kepatuhan != null ? `${parseInt(satker.statistik.persentase_kepatuhan)}%` : '-'}</div>
            <div className="text-[11px] text-slate-400 font-medium">Kepatuhan</div>
          </div>
          <div className="text-right hidden md:block">
            <div className="font-black text-emerald-400 text-xl">{satker.rata_rata_nilai ? parseFloat(satker.rata_rata_nilai).toFixed(1) : '-'}</div>
            <div className="text-[11px] text-slate-400 font-medium">Rata-rata Nilai</div>
          </div>
          <div className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-white/10 text-white' : 'text-slate-500'}`}>
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* Expanded Details - Styled Table */}
      {isOpen && (
        <div className="border-t border-slate-700/50 bg-slate-900 overflow-x-auto animate-in slide-in-from-top-2 duration-300">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400">Nama Laporan</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400">Ketepatan</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400">Status Verifikasi</th>
                <th className="px-5 py-4 text-center text-xs font-semibold text-slate-400">Nilai</th>
                {isAdmin && <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400">Aksi Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {satker.detail_laporan.map(l => {
                const uploaded = !!l.submission_id;
                return (
                  <tr key={l.report_type_id} className="hover:bg-white/2 transition-colors group/row">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        {uploaded ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" /> : <AlertCircle size={16} className="text-slate-600 mt-0.5 shrink-0" />}
                        <div>
                          <div className={`font-semibold ${uploaded ? 'text-slate-200 group-hover/row:text-white' : 'text-slate-500 italic'}`}>{l.nama_laporan}</div>
                          {l.is_wajib !== undefined && (
                            <span className={`inline-block mt-1 px-2 py-0.5 text-[9px] uppercase font-bold rounded-full ${l.is_wajib ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>
                              {l.is_wajib ? 'Wajib' : 'Opsional'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {l.status_ketepatan_waktu ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${l.status_ketepatan_waktu === 'Tepat Waktu' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {l.status_ketepatan_waktu}
                        </span>
                      ) : <span className="text-slate-600">-</span>}
                    </td>
                    <td className="px-5 py-4">
                      {uploaded ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${l.status_verifikasi === 'lengkap' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            l.status_verifikasi === 'revisi' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                          {String(l.status_verifikasi || '').replace('_', ' ').toUpperCase()}
                        </span>
                      ) : <span className="text-slate-600 italic text-[11px]">Belum diunggah</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {l.nilai_angka !== null && l.nilai_angka !== undefined ? (
                        <span className="font-black text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">{l.nilai_angka}</span>
                      ) : <span className="text-slate-600">-</span>}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-right">
                        {uploaded && (
                          <div className="inline-flex items-center gap-2 justify-end opacity-80 group-hover/row:opacity-100 transition-opacity">
                            <button
                              onClick={() => openHistory(l.submission_id)}
                              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition-colors"
                              title="Riwayat"
                            >
                              <History size={16} />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(l.submission_id)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/10"
                              title="Unduh PDF"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => handleDownloadExcel(l.submission_id)}
                              className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-colors border border-green-500/10"
                              title="Unduh Excel"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => openVerifyModal({ ...l, nama_satker: satker.nama_satker })}
                              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] shadow-lg shadow-blue-900/20 transition-all"
                            >
                              Verifikasi
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('satya_user') || 'null') || {};
  const isAdmin = ['ADMIN_PT', 'PANMUD_HUKUM_PT', 'STAFF_PANMUD_HUKUM_PT'].includes(user.role);

  const now = new Date();
  const [bulan, setBulan] = useState(String(now.getMonth() + 1));
  const [tahun, setTahun] = useState(String(now.getFullYear()));
  const [heatmapTahun, setHeatmapTahun] = useState(String(now.getFullYear()));
  const [search, setSearch] = useState('');

  // Verify modal state
  const [verifyModal, setVerifyModal] = useState({ open: false, data: null });
  const [statusVerif, setStatusVerif] = useState('');
  const [catatan, setCatatan] = useState('');
  const [score, setScore] = useState('');
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);

  // History modal state
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Current Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const openHistory = (submissionId) => { setSelectedHistoryId(submissionId); setIsHistoryModalOpen(true); };
  const closeHistory = () => { setIsHistoryModalOpen(false); setSelectedHistoryId(null); };

  const handleHeatmapCellClick = (clickedBulan, satkerName) => {
    setBulan(String(clickedBulan));
    if (satkerName) {
      setSearch(satkerName);
    }

    // Automatically scroll down to the "Rincian Satuan Kerja" section
    const detailsSection = document.getElementById("rincian-satuan-kerja");
    if (detailsSection) {
      detailsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const verifyModalRef = useFocusTrap(verifyModal.open);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!verifyModal.open) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') setVerifyModal({ open: false, data: null }); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [verifyModal.open]);

  // Queries
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', bulan, tahun],
    queryFn: async () => {
      const resp = await api.get(`/api/v1/reports/dashboard-agregat?bulan=${bulan}&tahun=${tahun}`);
      return resp?.data ?? resp;
    },
    staleTime: 1000 * 60,
  });

  const { data: adminStatsRaw } = useQuery({
    queryKey: ['admin-stats', bulan, tahun],
    queryFn: () => api.get(`/api/v1/reports/admin-stats?bulan=${bulan}&tahun=${tahun}`).then(r => r?.data?.data ?? r?.data ?? r),
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: queueRaw, refetch: refetchQueue } = useQuery({
    queryKey: ['queue-status'],
    queryFn: () => api.get('/api/v1/reports/queue-status').then(r => r?.data?.data ?? r?.data ?? r),
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  const { data: heatmapRaw, isLoading: heatmapLoading } = useQuery({
    queryKey: ['heatmap', heatmapTahun],
    queryFn: () => api.get(`/api/v1/reports/dashboard-heatmap?tahun=${heatmapTahun}`).then(r => r?.data ?? r),
    keepPreviousData: true,
  });

  const satkers = Array.isArray(dashboardData) ? dashboardData : (dashboardData?.data ?? []);
  const filtered = satkers.filter(s => s.nama_satker.toLowerCase().includes(search.toLowerCase()));
  const adminStats = adminStatsRaw ?? null;
  const queue = queueRaw ?? null;

  // Mutations
  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, catatanAdmin, scoreVal }) => {
      return api.patch(`/api/v1/reports/${id}/verify`, {
        status_verifikasi: status,
        catatan_admin: catatanAdmin || null,
        nilai_angka: scoreVal,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', bulan, tahun] });
    },
  });

  const handleDownloadPdf = async (submissionId) => {
    try {
      const res = await api.get(`/api/v1/reports/${submissionId}/download?type=pdf`);
      const url = res?.data?.url ?? res?.url ?? res?.data?.url ?? res?.url;
      if (url) window.open(url, '_blank');
      else setToast({ type: 'error', text: 'Tautan unduh PDF tidak tersedia.' });
    } catch (err) { setToast({ type: 'error', text: 'Gagal mengunduh file PDF.' }); }
  };

  const handleDownloadExcel = async (submissionId) => {
    try {
      const res = await api.get(`/api/v1/reports/${submissionId}/download?type=excel`);
      const url = res?.data?.url ?? res?.url ?? res?.data?.url ?? res?.url;
      if (url) window.open(url, '_blank');
      else setToast({ type: 'error', text: 'Tautan unduh Excel tidak tersedia.' });
    } catch (err) { setToast({ type: 'error', text: 'Gagal mengunduh file Excel.' }); }
  };

  const handleExportExcel = async () => {
    try {
      const res = await api.get(`/api/v1/reports/export-agregat?bulan=${bulan}&tahun=${tahun}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data || res]));
      const link = document.createElement('a'); link.href = url;
      link.setAttribute('download', `Rekapitulasi_${bulan}_${tahun}.xlsx`);
      document.body.appendChild(link); link.click(); link.remove();
    } catch (err) { setToast({ type: 'error', text: 'Gagal mengekspor Excel.' }); }
  };

  const handleExportPDF = () => {
    if (!satkers.length) return setToast({ type: 'error', text: 'Tidak ada data diekspor.' });
    try {
      const doc = new jsPDF();
      doc.text(`Rekapitulasi Kepatuhan Laporan - Bulan ${bulan} Tahun ${tahun}`, 14, 15);
      const tableData = [...satkers]
        .sort((a, b) => {
          const scoreA = parseFloat(a.rata_rata_nilai) || 0;
          const scoreB = parseFloat(b.rata_rata_nilai) || 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          const pctA = a.statistik?.total_wajib > 0 ? (a.statistik.total_upload / a.statistik.total_wajib) * 100 : 0;
          const pctB = b.statistik?.total_wajib > 0 ? (b.statistik.total_upload / b.statistik.total_wajib) * 100 : 0;
          return pctB - pctA;
        })
        .map((s, i) => [
          i + 1, s.nama_satker, s.statistik?.total_wajib || 0, s.statistik?.total_upload || 0,
          `${s.statistik?.total_wajib > 0 ? Math.round((s.statistik.total_upload / s.statistik.total_wajib) * 100) : 0}%`,
          s.rata_rata_nilai ? parseFloat(s.rata_rata_nilai).toFixed(1) : '-'
        ]);
      autoTable(doc, { startY: 20, head: [['No', 'Satuan Kerja', 'Wajib', 'Upload', 'Kepatuhan', 'Rata-rata Nilai']], body: tableData });
      doc.save(`Rekapitulasi_${bulan}_${tahun}.pdf`);
    } catch (err) { setToast({ type: 'error', text: 'Gagal mengekspor PDF.' }); }
  };

  const openVerifyModal = (laporan) => {
    setVerifyModal({ open: true, data: laporan });
    setStatusVerif(''); setCatatan(''); setFormError('');
    setScore(laporan.nilai_angka != null ? String(laporan.nilai_angka) : '');
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!statusVerif) return setFormError('Pilih status verifikasi.');
    if (statusVerif === 'revisi' && (!catatan || catatan.trim().length < 5)) return setFormError('Catatan revisi minimal 5 karakter.');
    try {
      await verifyMutation.mutateAsync({
        id: verifyModal.data.submission_id,
        status: statusVerif, catatanAdmin: catatan,
        scoreVal: score !== '' ? parseInt(score) : null,
      });
      setVerifyModal({ open: false, data: null });
      setToast({ type: 'success', text: 'Verifikasi tersimpan.' });
    } catch (err) { setFormError(err.message || 'Gagal menyimpan verifikasi.'); }
  };

  const relTime = (dateStr) => {
    if (!dateStr) return '-';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}d yang lalu`;
    if (diff < 3600) return `${Math.floor(diff/60)}m yang lalu`;
    if (diff < 86400) return `${Math.floor(diff/3600)}j yang lalu`;
    return `${Math.floor(diff/86400)} hari yang lalu`;
  };

  // Date formatters
  const dateFormat = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const timeFormat = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedDate = dateFormat.format(currentTime);
  const formattedTime = timeFormat.format(currentTime).replace(/\./g, ':');

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900 p-6 rounded-3xl border border-slate-700/50 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard Admin & Pimpinan</h1>
          <p className="text-sm text-slate-400">Rekapitulasi dan pemantauan kinerja Satuan Kerja wilayah.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={bulan} onChange={e => setBulan(e.target.value)} className="bg-slate-800/80 border border-white/10 px-4 py-2.5 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer">
            {MONTHS.slice(1).map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
          </select>
          <select value={tahun} onChange={e => setTahun(e.target.value)} className="bg-slate-800/80 border border-white/10 px-4 py-2.5 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer">
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <button onClick={handleExportPDF} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <Download size={16} /> <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <Download size={16} /> <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date/Time Banner */}
      <div className="bg-linear-to-r from-blue-600 via-teal-500/80 to-rose-500/80 rounded-2xl p-4 flex justify-between items-center shadow-lg border border-white/10">
        <div>
          <div className="text-white/80 text-sm font-medium mb-0.5">Hari ini,</div>
          <div className="text-white text-xl font-bold">{formattedDate}</div>
        </div>
        <div className="text-right">
          <div className="text-white text-4xl font-light tracking-tight">{formattedTime}</div>
          <div className="flex items-center justify-end gap-1.5 text-white/90 text-xs font-semibold mt-0.5">
            <Clock size={12} />
            <span>WIB</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Satuan Kerja', val: satkers.length, icon: ShieldCheck, color: 'text-blue-400', bg: 'bg-slate-900 border-slate-700/50' },
          { label: 'Laporan Wajib', val: satkers[0]?.statistik?.total_wajib ?? '-', icon: Inbox, color: 'text-purple-400', bg: 'bg-slate-900 border-slate-700/50' },
          { label: 'Total Unggahan', val: satkers.reduce((a, s) => a + parseInt(s.statistik?.total_upload || 0), 0), icon: Upload, color: 'text-emerald-400', bg: 'bg-slate-900 border-slate-700/50' },
          { label: 'Kepatuhan Rata-rata', val: `${satkers.length ? Math.round(satkers.reduce((a, s) => a + parseFloat(s.statistik?.persentase_kepatuhan || 0), 0) / satkers.length) : 0}%`, icon: Trophy, color: 'text-amber-400', bg: 'bg-slate-900 border-slate-700/50' }
        ].map((k, i) => (
          <div key={i} className={`relative overflow-hidden ${k.bg} border rounded-2xl p-6 shadow-lg group`}>
            <k.icon size={80} className={`absolute -bottom-4 -right-4 opacity-10 ${k.color} group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500`} />
            <div className="relative z-10">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{k.label}</div>
              <div className={`text-3xl font-black ${k.color}`}>{k.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ADMIN PANELS */}
      {isAdmin && adminStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. Antrian Verifikasi */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className="p-2 bg-amber-500/20 rounded-lg"><Inbox size={18} className="text-amber-400" /></div>
              <h3 className="text-sm font-bold text-white tracking-wide">Antrian Verifikasi</h3>
            </div>
            <div className="flex items-end gap-3 mb-4 relative z-10">
              <div className="text-5xl font-black text-amber-400 leading-none">{adminStats.antrian_verifikasi?.jumlah ?? 0}</div>
              <div className="text-xs text-slate-400 mb-1 font-medium">dokumen menunggu</div>
            </div>
            {adminStats.antrian_verifikasi?.items?.length > 0 ? (
              <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 relative z-10 custom-scrollbar">
                {adminStats.antrian_verifikasi.items.map(item => (
                  <li key={item.submission_id} className="bg-slate-800/80 border border-white/5 rounded-xl px-4 py-3 hover:bg-slate-800 transition-colors">
                    <div className="text-xs font-bold text-white mb-0.5">{item.nama_satker}</div>
                    <div className="text-[11px] text-amber-200/70 truncate">{item.nama_laporan}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-emerald-500 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <CheckCheck size={32} className="mb-2 opacity-50" />
                <span className="text-xs font-semibold">Semua laporan telah ditinjau</span>
              </div>
            )}
          </div>

          {/* 2. Ketepatan Waktu */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className="p-2 bg-blue-500/20 rounded-lg"><Timer size={18} className="text-blue-400" /></div>
              <h3 className="text-sm font-bold text-white tracking-wide">Ketepatan Waktu</h3>
            </div>
            {adminStats.ketepatan_waktu ? (() => {
              const tw = parseInt(adminStats.ketepatan_waktu.tepat_waktu || 0);
              const tl = parseInt(adminStats.ketepatan_waktu.terlambat || 0);
              const tot = tw + tl || 1;
              const pctTw = Math.round((tw / tot) * 100);
              return (
                <div className="relative z-10">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-semibold text-slate-400">Rasio Tepat Waktu</span>
                    <span className="text-2xl font-black text-emerald-400">{pctTw}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 mb-6 border border-white/5 overflow-hidden">
                    <div className="bg-linear-to-r from-emerald-600 to-emerald-400 h-full rounded-full" style={{ width: `${pctTw}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-black text-emerald-400 mb-1">{tw}</div>
                      <div className="text-[10px] font-bold text-emerald-500/70 uppercase">Tepat Waktu</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-black text-red-400 mb-1">{tl}</div>
                      <div className="text-[10px] font-bold text-red-500/70 uppercase">Terlambat</div>
                    </div>
                  </div>
                </div>
              );
            })() : <div className="text-sm text-slate-500 text-center py-10">Belum ada data periode ini</div>}
          </div>

          {/* 3. BullMQ Queue & Loop Revisi */}
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-purple-500/20 rounded-lg"><Activity size={16} className="text-purple-400" /></div>
                  <h3 className="text-[13px] font-bold text-white">Email Queue</h3>
                </div>
                <button title="Refresh" onClick={() => refetchQueue()} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg"><RefreshCw size={14} /></button>
              </div>
              {queue ? (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Wait', val: queue.waiting, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                    { label: 'Active', val: queue.active, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                    { label: 'Done', val: queue.completed, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'Fail', val: queue.failed, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl p-2 text-center border ${s.bg}`}>
                      <div className={`text-lg font-black ${s.color}`}>{s.val ?? 0}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-xs text-slate-500">Memuat...</div>}
            </div>

            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden flex-1">
               <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-red-500/20 rounded-lg"><Clock size={16} className="text-red-400" /></div>
                  <h3 className="text-[13px] font-bold text-white">Loop Revisi</h3>
                </div>
                <span className="bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-full">
                  {adminStats.loop_revisi?.jumlah ?? 0} Tertahan
                </span>
              </div>
              {adminStats.loop_revisi?.items?.length > 0 ? (
                <ul className="space-y-2 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                  {adminStats.loop_revisi.items.map(item => {
                    const hari = parseFloat(item.hari_tertahan || 0).toFixed(1);
                    return (
                      <li key={item.submission_id} className="flex justify-between items-center bg-slate-800/80 rounded-lg px-3 py-2 border border-white/5">
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-[11px] font-bold text-white truncate">{item.nama_satker}</div>
                          <div className="text-[9px] text-slate-400 truncate">{item.nama_laporan}</div>
                        </div>
                        <div className="text-[11px] font-black text-red-400 bg-red-500/10 px-2 py-1 rounded-md">{hari}h</div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg text-center border border-emerald-500/20">Aman, tidak ada revisi tertahan lama.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Section */}
      <HeatmapKepatuhan raw={heatmapRaw} isLoading={heatmapLoading} tahun={heatmapTahun} setTahun={setHeatmapTahun} now={now} onCellClick={handleHeatmapCellClick} />

      {/* Satker List / Grid */}
      <div id="rincian-satuan-kerja" className="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 shadow-xl scroll-mt-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl"><CheckCheck size={20} className="text-blue-400" /></div>
            <div>
              <h2 className="text-lg font-bold text-white">Rincian Satuan Kerja</h2>
              <p className="text-xs text-slate-400">Daftar laporan per satker periode {MONTHS[parseInt(bulan)]} {tahun}</p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari Satuan Kerja..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-white/10 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-white transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-slate-400 text-sm">Memuat data rincian satker...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-slate-800/30 rounded-2xl border border-dashed border-white/10">
            <Search size={40} className="mx-auto text-slate-600 mb-3" />
            <div className="text-slate-400 text-sm">Tidak ditemukan satker yang cocok dengan pencarian.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(satker => (
              <SatkerRow 
                key={satker.nama_satker} 
                satker={satker} 
                isAdmin={isAdmin}
                openHistory={openHistory}
                handleDownloadPdf={handleDownloadPdf}
                handleDownloadExcel={handleDownloadExcel}
                openVerifyModal={openVerifyModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {isAdmin && verifyModal.open && verifyModal.data && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setVerifyModal({ open: false, data: null })}>
          <div
            ref={verifyModalRef}
            role="dialog"
            className="bg-slate-900 w-full max-w-md rounded-3xl border border-white/10 p-7 shadow-2xl shadow-black animate-in zoom-in-95 duration-200 m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6 border-b border-white/5 pb-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <ShieldCheck size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-0.5 leading-tight">{verifyModal.data.nama_satker}</h3>
                  <p className="text-xs text-blue-400 font-medium">{verifyModal.data.nama_laporan}</p>
                </div>
              </div>
              <button onClick={() => setVerifyModal({ open: false, data: null })} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2 uppercase tracking-wider">Keputusan Verifikasi</label>
                <select 
                  value={statusVerif} 
                  onChange={(e) => setStatusVerif(e.target.value)} 
                  className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm text-white cursor-pointer"
                >
                  <option value="" disabled>-- Pilih Status --</option>
                  <option value="lengkap">✅ Lengkap & Valid</option>
                  <option value="revisi">❌ Perlu Revisi</option>
                </select>
              </div>

              {statusVerif === 'revisi' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-semibold text-slate-300 block mb-2 uppercase tracking-wider">Catatan Revisi <span className="text-red-400">*</span></label>
                  <textarea 
                    value={catatan} 
                    onChange={e => setCatatan(e.target.value)} 
                    rows={4} 
                    className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm text-white placeholder-slate-500 resize-none" 
                    placeholder="Jelaskan secara detail bagian mana yang perlu diperbaiki oleh satker..." 
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1"><MailWarning size={10}/> Catatan ini akan dikirim via email ke satker terkait.</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2 uppercase tracking-wider">Nilai Kinerja (Opsional)</label>
                <div className="relative">
                  <input 
                    type="number" min="0" max="100" 
                    value={score} 
                    onChange={e => setScore(e.target.value)} 
                    className="w-full p-3 pl-4 pr-12 bg-slate-800 border border-white/10 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm text-white placeholder-slate-500 font-bold" 
                    placeholder="0 - 100" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">/ 100</span>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400 font-medium">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setVerifyModal({ open: false, data: null })} className="px-5 py-2.5 bg-transparent hover:bg-white/5 rounded-xl text-sm font-medium text-slate-300 transition-colors">Batal</button>
                <button type="submit" disabled={verifyMutation.isLoading} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white text-sm font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
                  {verifyMutation.isLoading ? 'Menyimpan...' : 'Simpan Verifikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-200 px-5 py-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 ${toast.type === 'error' ? 'bg-slate-900 text-red-200 border-red-900/50' : 'bg-slate-900 text-emerald-200 border-emerald-900/50'}`}>
          {toast.type === 'error' ? <AlertCircle size={20} className="text-red-500" /> : <CheckCircle2 size={20} className="text-emerald-500" />}
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      {/* History modal */}
      {isHistoryModalOpen && selectedHistoryId && (
        <HistoryModal submissionId={selectedHistoryId} onClose={closeHistory} />
      )}
    </div>
  );
}