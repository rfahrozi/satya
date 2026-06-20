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
} from 'lucide-react';
import api from '../lib/axios';
import HistoryModal from '../components/HistoryModal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const MONTHS = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];


// ─── Konstanta warna heatmap ──────────────────────────────────────────────────
const WARNA_CONFIG = {
  hijau:  { bg: 'bg-emerald-500',    border: 'border-emerald-400/40', text: 'text-emerald-300', label: 'Patuh'      },
  kuning: { bg: 'bg-amber-400',      border: 'border-amber-300/40',   text: 'text-amber-300',   label: 'Perlu Perhatian' },
  merah:  { bg: 'bg-red-500',        border: 'border-red-400/40',     text: 'text-red-300',     label: 'Rendah'     },
  abu:    { bg: 'bg-slate-700',      border: 'border-slate-600/40',   text: 'text-slate-500',   label: 'Belum Ada'  },
};

const BULAN_PENDEK = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

// ─── Komponen Sel Heatmap ─────────────────────────────────────────────────────
function HeatmapSel({ sel, isFuture }) {
  const [tip, setTip] = useState(null);
  const warna = isFuture ? 'abu' : (sel?.warna ?? 'abu');
  const cfg   = WARNA_CONFIG[warna];
  const persen = sel?.persen ?? 0;
  const opacity = isFuture ? 'opacity-20' : '';

  return (
    <div
      className={`relative group`}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      {/* Sel warna */}
      <div
        className={`
          w-full aspect-square rounded-md border ${cfg.border} ${cfg.bg} ${opacity}
          flex items-center justify-center cursor-default
          transition-all duration-150 hover:scale-110 hover:z-10 hover:shadow-lg
        `}
        aria-label={`${BULAN_PENDEK[sel?.bulan ?? 0]}: ${persen}%`}
      >
        <span className="text-[9px] font-bold text-white/80 select-none">
          {isFuture ? '' : `${persen}%`}
        </span>
      </div>

      {/* Tooltip */}
      {tip && !isFuture && (
        <div className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
          bg-slate-800 border border-white/10 rounded-lg px-3 py-2
          text-xs shadow-xl pointer-events-none whitespace-nowrap
        ">
          <div className={`font-bold ${cfg.text} mb-0.5`}>{cfg.label}</div>
          <div className="text-slate-300">{persen}% patuh</div>
          {sel?.total_upload != null && (
            <div className="text-slate-400">{sel.total_upload} / {sel.total_wajib} laporan</div>
          )}
          {sel?.persen_tepat_waktu != null && (
            <div className="text-slate-400">{sel.persen_tepat_waktu}% tepat waktu</div>
          )}
          {/* Triangle */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}

// ─── Komponen Utama Heatmap ───────────────────────────────────────────────────
function HeatmapKepatuhan({ raw, isLoading, tahun, setTahun, now }) {
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
    <div className="bg-slate-900 border border-white/6 rounded-2xl p-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-orange-500/15 rounded-lg">
            <Flame size={16} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Heatmap Kepatuhan</h2>
            <p className="text-[11px] text-slate-400">Tren 12 bulan × seluruh satker</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats global ringkas */}
          {stats && (
            <div className="hidden sm:flex items-center gap-3 text-[11px]">
              <div className="bg-slate-800 rounded-lg px-3 py-1.5 text-center">
                <div className="font-black text-white">{stats.persen_global}%</div>
                <div className="text-slate-400">Global</div>
              </div>
              {stats.satker_merah > 0 && (
                <div className="bg-red-950/60 border border-red-500/20 rounded-lg px-3 py-1.5 text-center">
                  <div className="font-black text-red-400">{stats.satker_merah}</div>
                  <div className="text-slate-400">Satker Kritis</div>
                </div>
              )}
            </div>
          )}

          {/* Selector tahun */}
          <select
            value={tahun}
            onChange={e => setTahun(e.target.value)}
            className="bg-slate-800 border border-white/8 px-3 py-1.5 rounded-lg text-xs text-slate-200"
            aria-label="Pilih tahun heatmap"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Kepatuhan:</span>
        {Object.entries(WARNA_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${cfg.bg}`} />
            <span className="text-[10px] text-slate-400">{cfg.label}</span>
          </div>
        ))}
        <span className="text-[10px] text-slate-600 ml-auto">
          ≥80% hijau · 50-79% kuning · 1-49% merah · 0% abu
        </span>
      </div>

      {/* ── Skeleton loading ── */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="flex gap-2 items-center">
              <div className="w-24 h-4 bg-slate-800 rounded" />
              <div className="flex-1 grid grid-cols-12 gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-slate-800 rounded-md" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Grid ── */}
      {!isLoading && (
        <>
          {/* Header kolom bulan */}
          <div className="flex gap-2 items-center mb-1.5 pl-28">
            <div className="flex-1 grid grid-cols-12 gap-1">
              {BULAN_PENDEK.slice(1).map((b, i) => (
                <div
                  key={i}
                  className={`text-center text-[9px] font-medium ${
                    isThisYear && i + 1 === bulanSkrg
                      ? 'text-orange-400'
                      : i + 1 > bulanSkrg && isThisYear
                        ? 'text-slate-700'
                        : 'text-slate-500'
                  }`}
                >
                  {b}
                </div>
              ))}
            </div>
          </div>

          {/* Baris per satker */}
          {heatmapData.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Tidak ada data satker untuk tahun {tahun}.
            </div>
          ) : (
            <div className="space-y-1.5">
              {heatmapData.map(satker => (
                <div key={satker.satker_id} className="flex gap-2 items-center group/row">

                  {/* Label satker */}
                  <div className="w-28 flex-shrink-0 flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-slate-300 truncate leading-tight">
                        {satker.nama_satker}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {trendIcon(satker.rata_tahunan)}
                        <span className={`text-[9px] font-bold ${WARNA_CONFIG[satker.warna_rata]?.text}`}>
                          {satker.rata_tahunan}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 12 sel */}
                  <div className="flex-1 grid grid-cols-12 gap-1">
                    {satker.sel.map(sel => {
                      const isFuture = isThisYear && sel.bulan > bulanSkrg;
                      return (
                        <HeatmapSel key={sel.bulan} sel={sel} isFuture={isFuture} />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer: mobile stats */}
          {stats && (
            <div className="flex sm:hidden items-center gap-3 mt-4 pt-3 border-t border-white/5 text-[11px]">
              <div className="bg-slate-800 rounded-lg px-3 py-1.5 text-center">
                <div className="font-black text-white">{stats.persen_global}%</div>
                <div className="text-slate-400">Global {tahun}</div>
              </div>
              {stats.satker_merah > 0 && (
                <div className="bg-red-950/60 border border-red-500/20 rounded-lg px-3 py-1.5 text-center">
                  <div className="font-black text-red-400">{stats.satker_merah}</div>
                  <div className="text-slate-400">Satker Kritis</div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProgressBar({ value = 0, max = 1, label = '' }) {

  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  const colorClass = pct === 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label}: ${pct}%` : `${pct}%`}
      >
        <div className={`${colorClass} h-full rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs font-semibold text-slate-300 w-10 text-right" aria-hidden="true">{pct}%</div>
    </div>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('satya_user') || 'null') || {};
  const isAdmin = user.role === 'ADMIN_PT';

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
  // In-page toast replaces window.alert()
  const [toast, setToast] = useState(null);

  // History modal state
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const openHistory = (submissionId) => {
    setSelectedHistoryId(submissionId);
    setIsHistoryModalOpen(true);
  };

  const closeHistory = () => {
    setIsHistoryModalOpen(false);
    setSelectedHistoryId(null);
  };

  // Focus trap for verify modal
  const verifyModalRef = useFocusTrap(verifyModal.open);

  // Auto-dismiss toast after 5 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Close modal on Escape
  useEffect(() => {
    if (!verifyModal.open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setVerifyModal({ open: false, data: null });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [verifyModal.open]);

  // Fetch the dashboard aggregation
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', bulan, tahun],
    queryFn: async () => {
      // api.get should return the backend payload according to your api wrapper
      // Backend returns: { success: true, data: [ ...satkers ] }
      const resp = await api.get(`/api/v1/reports/dashboard-agregat?bulan=${bulan}&tahun=${tahun}`);
      // If api wrapper already returns response.data, adapt accordingly:
      // const payload = resp?.data ?? resp;
      // return payload.data ?? payload;
      return resp?.data ?? resp;
    },
    keepPreviousData: true,
  });

  const satkers = Array.isArray(dashboardData) ? dashboardData : (dashboardData?.data ?? []);
  const filtered = satkers.filter(s => s.nama_satker.toLowerCase().includes(search.toLowerCase()));

  // Admin-only: fetch admin stats (antrian, revisi, ketepatan, aktivitas)
  const { data: adminStatsRaw } = useQuery({
    queryKey: ['admin-stats', bulan, tahun],
    queryFn: () => api.get(`/api/v1/reports/admin-stats?bulan=${bulan}&tahun=${tahun}`).then(r => r?.data?.data ?? r?.data ?? r),
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Admin-only: BullMQ queue status
  const { data: queueRaw, refetch: refetchQueue } = useQuery({
    queryKey: ['queue-status'],
    queryFn: () => api.get('/api/v1/reports/queue-status').then(r => r?.data?.data ?? r?.data ?? r),
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  const adminStats = adminStatsRaw ?? null;
  const queue = queueRaw ?? null;

  // Heatmap Kepatuhan — data tahunan 12 bulan × N satker
  const { data: heatmapRaw, isLoading: heatmapLoading } = useQuery({
    queryKey: ['heatmap', heatmapTahun],
    queryFn: () =>
      api.get(`/api/v1/reports/dashboard-heatmap?tahun=${heatmapTahun}`)
        .then(r => r?.data ?? r),
    keepPreviousData: true,
  });

  // Mutation: verify report
  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, catatanAdmin, scoreVal }) => {
      // expected backend payload: { status_verifikasi, catatan_admin }
      return api.patch(`/api/v1/reports/${id}/verify`, {
        status_verifikasi: status,
        catatan_admin: catatanAdmin || null,
        nilai_angka: scoreVal,
      });
    },
    onSuccess: () => {
      // Refresh dashboard aggregate
      queryClient.invalidateQueries({ queryKey: ['dashboard', bulan, tahun] });
    },
  });

  const handleDownload = async (submissionId) => {
    try {
      const res = await api.get(`/api/v1/reports/${submissionId}/download`);
      const url = res?.data?.url ?? res?.url ?? res?.data?.url ?? res?.url;
      if (url) window.open(url, '_blank');
      else setToast({ type: 'error', text: 'Tautan unduh tidak tersedia dari server.' });
    } catch (err) {
      setToast({ type: 'error', text: err.message || 'Gagal mengunduh file.' });
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await api.get(`/api/v1/reports/export-agregat?bulan=${bulan}&tahun=${tahun}`, { responseType: 'blob' });
      const blob = new Blob([res.data || res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rekapitulasi_Kepatuhan_${bulan}_${tahun}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ type: 'error', text: 'Gagal mengekspor laporan.' });
    }
  };

  const handleExportPDF = () => {
    if (!satkers || satkers.length === 0) {
      setToast({ type: 'error', text: 'Tidak ada data untuk diekspor.' });
      return;
    }

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
        .map((satker, index) => {
          const pct = satker.statistik?.total_wajib > 0 ? Math.round((satker.statistik.total_upload / satker.statistik.total_wajib) * 100) : 0;
          const score = satker.rata_rata_nilai ? parseFloat(satker.rata_rata_nilai).toFixed(1) : '-';
          return [
            index + 1,
            satker.nama_satker,
            satker.statistik?.total_wajib || 0,
            satker.statistik?.total_upload || 0,
            `${pct}%`,
            score
          ];
        });

      doc.autoTable({
        startY: 20,
        head: [['No', 'Satuan Kerja', 'Total Wajib', 'Total Upload', 'Persentase', 'Rata-rata Nilai']],
        body: tableData,
      });

      doc.save(`Rekapitulasi_Kepatuhan_${bulan}_${tahun}.pdf`);
    } catch (err) {
      setToast({ type: 'error', text: 'Gagal mengekspor PDF.' });
    }
  };

  const openVerifyModal = (laporan) => {
    setVerifyModal({ open: true, data: laporan });
    setStatusVerif('');
    setCatatan('');
    setScore(laporan.nilai_angka !== undefined && laporan.nilai_angka !== null ? String(laporan.nilai_angka) : '');
    setFormError('');
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!statusVerif) {
      setFormError('Pilih status verifikasi terlebih dahulu.');
      return;
    }
    // If status is revisi, catatan is required
    if (statusVerif === 'revisi' && (!catatan || catatan.trim().length < 5)) {
      setFormError('Catatan revisi minimal 5 karakter.');
      return;
    }
    try {
      await verifyMutation.mutateAsync({
        id: verifyModal.data.submission_id,
        status: statusVerif,
        catatanAdmin: catatan,
        scoreVal: score !== '' ? parseInt(score) : null,
      });
      // On success show confirmation and close modal shortly
      setVerifyModal({ open: false, data: null });
      setStatusVerif('');
      setCatatan('');
      setScore('');
      setToast({ type: 'success', text: 'Verifikasi tersimpan. Notifikasi akan dikirim oleh worker.' });
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan verifikasi.');
    }
  };

  // Helper: format relative time
  const relTime = (dateStr) => {
    if (!dateStr) return '-';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}d yang lalu`;
    if (diff < 3600) return `${Math.floor(diff/60)}m yang lalu`;
    if (diff < 86400) return `${Math.floor(diff/3600)}j yang lalu`;
    return `${Math.floor(diff/86400)} hari yang lalu`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard Monitoring</h1>
          <p className="text-sm text-slate-400">{MONTHS[parseInt(bulan)]} {tahun} — Agregat kepatuhan pelaporan</p>
        </div>

        <div className="flex items-center gap-2 pt-3 sm:pt-0">
          <label htmlFor="filter-bulan" className="sr-only">Filter Bulan</label>
          <select
            id="filter-bulan"
            value={bulan}
            onChange={e => setBulan(e.target.value)}
            className="bg-slate-800 border border-white/6 px-3 py-2 rounded-md text-sm"
          >
            {MONTHS.slice(1).map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
          </select>
          <label htmlFor="filter-tahun" className="sr-only">Filter Tahun</label>
          <select
            id="filter-tahun"
            value={tahun}
            onChange={e => setTahun(e.target.value)}
            className="bg-slate-800 border border-white/6 px-3 py-2 rounded-md text-sm"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Download size={16} /> Export PDF
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Download size={16} /> Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 p-4 rounded-xl border border-white/6 focus:outline-none focus:ring-2 focus:ring-blue-500" tabIndex={0} aria-label={`Total Satuan Kerja: ${satkers.length}`}>
          <div className="text-xs text-slate-400" aria-hidden="true">Satuan Kerja</div>
          <div className="text-2xl font-bold" aria-hidden="true">{satkers.length}</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-white/6 focus:outline-none focus:ring-2 focus:ring-blue-500" tabIndex={0} aria-label={`Jenis laporan wajib: ${satkers[0]?.statistik?.total_wajib ?? 0}`}>
          <div className="text-xs text-slate-400" aria-hidden="true">Jenis laporan (wajib)</div>
          <div className="text-2xl font-bold" aria-hidden="true">{satkers[0]?.statistik?.total_wajib ?? '-'}</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-white/6 focus:outline-none focus:ring-2 focus:ring-blue-500" tabIndex={0} aria-label={`Total laporan diunggah periode ini: ${satkers.reduce((a, s) => a + parseInt(s.statistik?.total_upload || 0), 0)}`}>
          <div className="text-xs text-slate-400" aria-hidden="true">Total Upload (periode)</div>
          <div className="text-2xl font-bold" aria-hidden="true">{satkers.reduce((a, s) => a + parseInt(s.statistik?.total_upload || 0), 0)}</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-white/6 focus:outline-none focus:ring-2 focus:ring-blue-500" tabIndex={0} aria-label={`Rata-rata kepatuhan: ${satkers.length ? Math.round(satkers.reduce((a, s) => a + parseFloat(s.statistik?.persentase_kepatuhan || 0), 0) / satkers.length) : 0} persen`}>
          <div className="text-xs text-slate-400" aria-hidden="true">Rata-rata kepatuhan</div>
          <div className="text-2xl font-bold" aria-hidden="true">
            {satkers.length ? Math.round(satkers.reduce((a, s) => a + parseFloat(s.statistik?.persentase_kepatuhan || 0), 0) / satkers.length) : 0}%
          </div>
        </div>
      </div>

      {/* ── LEADERBOARD (Top 5 Satker) ──────────────────────── */}
      {(user.role === 'PIMPINAN' || user.role === 'ADMIN_PT') && satkers && satkers.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-5 mt-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-amber-400" />
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Top 5 Satker (Berdasarkan Kinerja & Kepatuhan)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-xs text-slate-400 font-semibold">Peringkat</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-semibold">Satuan Kerja</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-center">Rata-rata Nilai</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-right">Kepatuhan (%)</th>
                </tr>
              </thead>
              <tbody>
                {[...satkers]
                  .sort((a, b) => {
                    const scoreA = parseFloat(a.rata_rata_nilai) || 0;
                    const scoreB = parseFloat(b.rata_rata_nilai) || 0;
                    if (scoreB !== scoreA) return scoreB - scoreA;
                    
                    const pctA = a.statistik?.total_wajib > 0 ? (a.statistik.total_upload / a.statistik.total_wajib) * 100 : 0;
                    const pctB = b.statistik?.total_wajib > 0 ? (b.statistik.total_upload / b.statistik.total_wajib) * 100 : 0;
                    return pctB - pctA;
                  })
                  .slice(0, 5)
                  .map((satker, idx) => {
                    const score = parseFloat(satker.rata_rata_nilai);
                    const pct = satker.statistik?.total_wajib > 0 ? Math.round((satker.statistik.total_upload / satker.statistik.total_wajib) * 100) : 0;
                    return (
                      <tr key={satker.nama_satker} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-white text-sm">{satker.nama_satker}</td>
                        <td className="px-4 py-3 text-center">
                          {score ? <span className="font-bold text-emerald-400">{score.toFixed(1)}</span> : <span className="text-slate-500">-</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-slate-300">{pct}%</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ADMIN PANELS ─────────────────────────────── */}
      {isAdmin && adminStats && (
        <>
          {/* Row 1: Antrian + Ketepatan Waktu + BullMQ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* 1. Antrian Verifikasi */}
            <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Inbox size={16} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Antrian Verifikasi</span>
              </div>
              <div className="text-4xl font-black text-white mb-1">{adminStats.antrian_verifikasi?.jumlah ?? 0}</div>
              <div className="text-xs text-slate-400 mb-3">laporan menunggu ditinjau</div>
              {adminStats.antrian_verifikasi?.items?.length > 0 ? (
                <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                  {adminStats.antrian_verifikasi.items.map(item => (
                    <li key={item.submission_id} className="text-xs bg-slate-800 rounded-lg px-3 py-2">
                      <div className="font-medium text-white truncate">{item.nama_satker}</div>
                      <div className="text-slate-400 truncate">{item.nama_laporan}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCheck size={14} /> Semua laporan sudah ditinjau
                </div>
              )}
            </div>

            {/* 2. Ketepatan Waktu */}
            <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Timer size={16} className="text-blue-400" />
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Ketepatan Waktu</span>
              </div>
              {adminStats.ketepatan_waktu ? (() => {
                const tw = parseInt(adminStats.ketepatan_waktu.tepat_waktu || 0);
                const tl = parseInt(adminStats.ketepatan_waktu.terlambat || 0);
                const tot = tw + tl || 1;
                const pctTw = Math.round((tw / tot) * 100);
                return (
                  <>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Tepat Waktu</span><span className="text-emerald-400 font-bold">{pctTw}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${pctTw}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center">
                        <div className="text-xl font-black text-emerald-400">{tw}</div>
                        <div className="text-[10px] text-slate-400">Tepat Waktu</div>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                        <div className="text-xl font-black text-red-400">{tl}</div>
                        <div className="text-[10px] text-slate-400">Terlambat</div>
                      </div>
                    </div>
                  </>
                );
              })() : <div className="text-xs text-slate-500">Belum ada data upload periode ini</div>}
            </div>

            {/* 3. BullMQ Queue Status */}
            <div className="bg-slate-900 border border-purple-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-purple-400" />
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Email Queue</span>
                </div>
                <button onClick={() => refetchQueue()} className="text-slate-500 hover:text-slate-300 transition-colors" title="Refresh">
                  <RefreshCw size={12} />
                </button>
              </div>
              {queue ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: 'Menunggu', val: queue.waiting, color: 'text-amber-400' },
                      { label: 'Aktif', val: queue.active, color: 'text-blue-400' },
                      { label: 'Selesai', val: queue.completed, color: 'text-emerald-400' },
                      { label: 'Gagal', val: queue.failed, color: 'text-red-400' },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-800 rounded-lg p-2 text-center">
                        <div className={`text-lg font-black ${s.color}`}>{s.val ?? 0}</div>
                        <div className="text-[10px] text-slate-400">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {queue.recent_failed?.length > 0 && (
                    <div className="bg-red-950/50 border border-red-500/20 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-red-400 font-semibold mb-1">
                        <MailWarning size={12} /> {queue.recent_failed.length} job gagal terbaru
                      </div>
                      {queue.recent_failed.slice(0, 2).map(j => (
                        <div key={j.id} className="text-[10px] text-slate-400 truncate">{j.name}: {j.failedReason}</div>
                      ))}
                    </div>
                  )}
                </>
              ) : <div className="text-xs text-slate-500">Memuat status queue...</div>}
            </div>
          </div>

          {/* Row 2: Loop Revisi + Log Aktivitas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* 4. Loop Revisi */}
            <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-red-400" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Loop Revisi</span>
                <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {adminStats.loop_revisi?.jumlah ?? 0} aktif
                </span>
              </div>
              {adminStats.loop_revisi?.items?.length > 0 ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {adminStats.loop_revisi.items.map(item => {
                    const hari = parseFloat(item.hari_tertahan || 0).toFixed(1);
                    const urgent = parseFloat(hari) > 3;
                    return (
                      <li key={item.submission_id} className={`rounded-lg px-3 py-2.5 border ${urgent ? 'bg-red-950/40 border-red-500/30' : 'bg-slate-800 border-white/5'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{item.nama_satker}</div>
                            <div className="text-[11px] text-slate-400 truncate">{item.nama_laporan}</div>
                            {item.catatan_admin && <div className="text-[10px] text-slate-500 italic mt-0.5 truncate">"{item.catatan_admin}"</div>}
                          </div>
                          <div className={`ml-2 text-right flex-shrink-0 text-xs font-black ${urgent ? 'text-red-400' : 'text-amber-400'}`}>
                            {hari}h
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCheck size={14} /> Tidak ada laporan dalam status revisi
                </div>
              )}
            </div>

            {/* 5. Log Aktivitas Terbaru */}
            <div className="bg-slate-900 border border-white/6 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aktivitas Terbaru</span>
              </div>
              {adminStats.aktivitas_terbaru?.length > 0 ? (
                <ul className="space-y-1.5 max-h-52 overflow-y-auto">
                  {adminStats.aktivitas_terbaru.map(act => {
                    const icon = act.tipe_aksi === 'upload' ? <Upload size={12} className="text-blue-400 flex-shrink-0" />
                      : act.tipe_aksi === 'verified_ok' ? <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                      : <AlertCircle size={12} className="text-amber-400 flex-shrink-0" />;
                    const label = act.tipe_aksi === 'upload' ? 'mengunggah'
                      : act.tipe_aksi === 'verified_ok' ? 'disetujui Admin ✓'
                      : 'diminta revisi oleh Admin';
                    return (
                      <li key={act.id} className="flex items-start gap-2 text-[11px] bg-slate-800/60 rounded-lg px-3 py-2">
                        {icon}
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-white">{act.nama_satker}</span>
                          <span className="text-slate-400"> {label} </span>
                          <span className="text-slate-300 italic truncate block">{act.nama_laporan}</span>
                        </div>
                        <div className="text-slate-500 flex-shrink-0 text-[10px]">{relTime(act.updated_at)}</div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-xs text-slate-500 text-center py-4">Belum ada aktivitas tercatat</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── HEATMAP KEPATUHAN ─────────────────────────────── */}
      <HeatmapKepatuhan
        raw={heatmapRaw}
        isLoading={heatmapLoading}
        tahun={heatmapTahun}
        setTahun={setHeatmapTahun}
        now={now}
      />

      {/* Search */}
      <div className="max-w-md relative">
        <label htmlFor="search-satker" className="sr-only">Cari Satuan Kerja</label>
        <Search className="absolute left-3 top-3 text-slate-500" aria-hidden="true" />
        <input
          id="search-satker"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari Satuan Kerja..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-white/6 rounded-lg"
        />
      </div>

      {/* Content list */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Memuat data dashboard…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400">Tidak ditemukan satker sesuai pencarian.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(satker => {
            const pct = parseInt(satker.statistik?.persentase_kepatuhan || 0);
            const headerBadge = pct === 100 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-red-400';
            return (
              <div key={satker.nama_satker} className="bg-slate-900 border border-white/6 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${headerBadge}`} aria-hidden="true" />
                    <div>
                      <div className="font-bold text-white">{satker.nama_satker}</div>
                      <ProgressBar
                        value={satker.statistik?.total_upload || 0}
                        max={satker.statistik?.total_wajib || 1}
                        label={`Kepatuhan ${satker.nama_satker}`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-xs text-slate-400 text-right">
                      <div className="font-bold text-white">{satker.statistik?.persentase_kepatuhan ?? '-'}%</div>
                      <div className="text-[11px]">Kepatuhan</div>
                    </div>
                  </div>
                </div>

                {/* Expanded table */}
                <div className="border-t border-white/6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs text-slate-400">Laporan</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs text-slate-400">Ketepatan</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs text-slate-400">Status Verifikasi</th>
                        <th scope="col" className="px-4 py-3 text-center text-xs text-slate-400">Nilai</th>
                        {isAdmin && <th scope="col" className="px-4 py-3 text-right text-xs text-slate-400">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {satker.detail_laporan.map(l => {
                        const uploaded = !!l.submission_id;
                        return (
                          <tr key={l.report_type_id} className="border-t border-white/6 hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                {uploaded ? <CheckCircle2 size={14} className="text-emerald-400 mt-0.5" /> : <AlertCircle size={14} className="text-slate-500 mt-0.5" />}
                                <div className={`${uploaded ? 'text-white font-medium' : 'text-slate-400 italic'}`}>{l.nama_laporan}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {l.status_ketepatan_waktu ? (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${l.status_ketepatan_waktu === 'Tepat Waktu' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                  {l.status_ketepatan_waktu}
                                </span>
                              ) : <span className="text-slate-500">-</span>}
                            </td>
                            <td className="px-4 py-3">
                              {uploaded ? (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${l.status_verifikasi === 'lengkap' ? 'bg-emerald-50 text-emerald-700' :
                                    l.status_verifikasi === 'revisi' ? 'bg-red-50 text-red-700' :
                                      'bg-amber-50 text-amber-700'
                                  }`}>
                                  {String(l.status_verifikasi || '').replace('_', ' ')}
                                </span>
                              ) : <span className="text-slate-500">Belum Upload</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {l.nilai_angka !== null && l.nilai_angka !== undefined ? (
                                <span className="font-bold text-emerald-400">{l.nilai_angka}</span>
                              ) : <span className="text-slate-500">-</span>}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3 text-right">
                                {uploaded && (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      onClick={() => openHistory(l.submission_id)}
                                      aria-label={`Riwayat laporan ${l.nama_laporan}`}
                                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400"
                                      title="Riwayat"
                                    >
                                      <History size={14} aria-hidden="true" />
                                    </button>
                                    <button
                                      onClick={() => handleDownload(l.submission_id)}
                                      aria-label={`Unduh laporan ${l.nama_laporan}`}
                                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                    >
                                      <Download size={14} aria-hidden="true" />
                                    </button>
                                    <button
                                      onClick={() => openVerifyModal({ ...l, nama_satker: satker.nama_satker })}
                                      aria-label={`Verifikasi laporan ${l.nama_laporan} dari ${satker.nama_satker}`}
                                      className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold"
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
              </div>
            );
          })}
        </div>
      )}

      {/* Verify modal (admin) */}
      {isAdmin && verifyModal.open && verifyModal.data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setVerifyModal({ open: false, data: null })}
        >
          <div
            ref={verifyModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-modal-title"
            className="bg-slate-900 w-full max-w-md rounded-2xl border border-white/6 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-blue-400" aria-hidden="true" />
                <div>
                  <div id="verify-modal-title" className="text-sm font-bold text-white">{verifyModal.data.nama_satker}</div>
                  <div className="text-xs text-slate-400">{verifyModal.data.nama_laporan}</div>
                </div>
              </div>
              <button
                onClick={() => setVerifyModal({ open: false, data: null })}
                aria-label="Tutup dialog verifikasi"
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Keputusan Verifikasi</label>
                <select value={statusVerif} onChange={(e) => setStatusVerif(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-white/6 rounded-md">
                  <option value="">-- Pilih status --</option>
                  <option value="lengkap">lengkap</option>
                  <option value="revisi">revisi</option>
                </select>
              </div>

              {statusVerif === 'revisi' && (
                <div className="mb-3">
                  <label className="text-xs text-slate-400 block mb-1">Catatan Revisi (akan dikirim via email)</label>
                  <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={4} className="w-full p-2.5 bg-slate-800 border border-white/6 rounded-md" placeholder="Jelaskan perbaikan yang dibutuhkan..." />
                </div>
              )}

              <div className="mb-3">
                <label className="text-xs text-slate-400 block mb-1">Nilai Kinerja (0 - 100)</label>
                <input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-white/6 rounded-md" placeholder="Contoh: 85" />
              </div>

              {formError && (
                <div role="alert" aria-live="assertive" className="text-sm text-red-400">{formError}</div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-white/6">
                <button type="button" onClick={() => setVerifyModal({ open: false, data: null })} className="px-3 py-2 bg-slate-800 rounded-md">Batal</button>
                <button type="submit" disabled={verifyMutation.isLoading} className="px-4 py-2 bg-blue-600 rounded-md text-white font-semibold">
                  {verifyMutation.isLoading ? 'Menyimpan...' : 'Simpan Verifikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-page toast (replaces window.alert) */}
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-6 right-6 z-[150] px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${
            toast.type === 'error'
              ? 'bg-red-950 text-red-200 border-red-700'
              : 'bg-emerald-950 text-emerald-200 border-emerald-700'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* History modal */}
      {isHistoryModalOpen && selectedHistoryId && (
        <HistoryModal
          submissionId={selectedHistoryId}
          onClose={closeHistory}
        />
      )}

    </div>
  );
}