import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { internalMonitoringApi } from '../api/internalMonitoringApi';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

function complianceColor(pct) {
  if (pct >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  if (pct >= 50) return { bar: 'bg-amber-400',   text: 'text-amber-400',   badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  return               { bar: 'bg-red-500',      text: 'text-red-400',     badge: 'bg-red-500/20 text-red-400 border-red-500/30' };
}

// Konfigurasi tampilan per assessment category sesuai PDF
const ASSESSMENT_META = [
  {
    code: 'AMPUH',
    label: 'AMPUH',
    desc: 'Akreditasi Penjaminan Mutu',
    icon: '🏆',
    total_pdf: 70,
    prefix: 'AMP-',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    badgeBg: 'bg-amber-500/20 text-amber-400',
  },
  {
    code: 'PMPZI',
    label: 'PMPZI',
    desc: 'Pembangunan Zona Integritas',
    icon: '🛡️',
    total_pdf: 134,
    prefix: 'PZ-',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    badgeBg: 'bg-blue-500/20 text-blue-400',
  },
  {
    code: 'AKIP',
    label: 'AKIP',
    desc: 'Akuntabilitas Kinerja (SAKIP)',
    icon: '📊',
    total_pdf: 79,
    prefix: 'AKIP-',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    badgeBg: 'bg-purple-500/20 text-purple-400',
  },
  {
    code: 'REGULASI',
    label: 'REG',
    desc: 'Tambahan Regulasi Badilum',
    icon: '📜',
    total_pdf: 12,
    prefix: 'REG-',
    border: 'border-slate-700',
    bg: 'bg-slate-800/50',
    badgeBg: 'bg-slate-800 text-slate-300',
  },
];

// ─── Sub-komponen ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, colorClass = 'text-blue-400' }) {
  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      <div className="flex items-center gap-3 mb-3 relative z-10">
        <div className="p-2 bg-slate-800 rounded-lg">{icon}</div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      </div>
      <div className={`text-4xl font-black ${colorClass} tracking-tight relative z-10`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1.5 relative z-10">{sub}</div>}
    </div>
  );
}

// Card ringkasan per assessment category (AMPUH/PMPZI/AKIP/REG)
function AssessmentCard({ meta, stats }) {
  const verified = stats?.verified ?? 0;
  const total    = stats?.total    ?? 0;
  const pct      = total > 0 ? Math.round((verified / total) * 100) : 0;
  const color    = complianceColor(pct);
  const coverage = meta.total_pdf > 0 ? Math.round((total / meta.total_pdf) * 100) : 0;

  return (
    <div className={`rounded-xl border ${meta.border} ${meta.bg} p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badgeBg}`}>
              {meta.label}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">{meta.desc}</p>
          </div>
        </div>
        <span className={`text-sm font-black ${color.text}`}>{pct}%</span>
      </div>

      {/* Progress bar verified */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Statistik */}
      <div className="flex justify-between text-xs text-slate-400">
        <span className="text-emerald-700 font-semibold">✓ {verified} verified</span>
        <span>{total} aktif</span>
        <span className="text-slate-500">{meta.total_pdf} di PDF</span>
      </div>

      {/* Coverage bar (item aktif vs total PDF) */}
      {coverage < 100 && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-600">
          <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{ width: `${coverage}%` }}
            />
          </div>
          <span>{coverage}% terpantau</span>
        </div>
      )}
    </div>
  );
}

function UnitProgressRow({ unit }) {
  const pct   = unit.compliance_rate ?? 0;
  const color = complianceColor(pct);
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-700/50 last:border-0">
      <div className="w-40 shrink-0">
        <p className="text-sm font-semibold text-slate-200 truncate" title={unit.unit_name}>{unit.unit_name}</p>
        <p className="text-xs text-slate-500">{unit.unit_code}</p>
      </div>
      <div className="flex-1">
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${color.bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="w-16 text-right shrink-0">
        <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${color.badge}`}>{fmtPct(pct)}</span>
      </div>
      <div className="hidden sm:flex gap-3 text-xs text-slate-400 shrink-0 w-36 justify-end">
        <span className="text-emerald-600 font-semibold">✓ {unit.verified}</span>
        <span>{unit.total} total</span>
        {unit.overdue > 0 && <span className="text-red-500 font-semibold">⚠ {unit.overdue}</span>}
      </div>
    </div>
  );
}

function CriticalItemRow({ item, idx }) {
  const due = item.due_at ? new Date(item.due_at) : null;
  const daysLate = due ? Math.ceil((new Date() - due) / 86400000) : 0;
  return (
    <Link
      to={`/internal-monitoring/targets/${item.id}`}
      className="flex items-start gap-3 py-3 px-4 border-b border-slate-700/50 last:border-0 hover:bg-red-500/10 transition-colors group"
    >
      <span className="w-6 h-6 rounded-full bg-red-100 text-red-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {idx + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200 group-hover:text-red-700 truncate">
          {item.item_title || item.item_code}
        </p>
        <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-400">
          {item.unit_name && <span>📍 {item.unit_name}</span>}
          {daysLate > 0 && <span className="text-red-400 font-semibold">⚠ Terlambat {daysLate} hari</span>}
          <span className="capitalize">{(item.workflow_status || '').replace(/_/g, ' ')}</span>
        </div>
      </div>
      <span className="text-slate-500 group-hover:text-red-400 shrink-0">→</span>
    </Link>
  );
}

// ─── Komponen Utama ───────────────────────────────────────────────────────────
const ExecutiveDashboard = () => {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [periods, setPeriods] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [lastRefresh, setLastRefresh]   = useState(null);

  const load = useCallback(async (selectedPeriodId = null) => {
    try {
      setLoading(true);
      setError(null);

      // Ambil seluruh periode yang ada untuk dropdown
      let availablePeriods = periods;
      if (availablePeriods.length === 0) {
        const pRes = await internalMonitoringApi.listPeriods();
        availablePeriods = pRes.data?.data || [];
        setPeriods(availablePeriods);
      }

      let period = null;
      if (availablePeriods.length > 0) {
        if (selectedPeriodId) {
          period = availablePeriods.find(p => String(p.id) === String(selectedPeriodId));
        }
        if (!period) {
          period = availablePeriods.find(p => p.status === 'OPEN') || availablePeriods[0];
        }
      }
      setActivePeriod(period);

      let dRes;
      if (period) {
        dRes = await internalMonitoringApi.getExecutiveDashboard(period.id);
        setData(dRes.data?.data || dRes.data || null);
      } else {
        setData(null);
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat dashboard eksekutif.');
    } finally {
      setLoading(false);
    }
  }, [periods]);

  useEffect(() => { load(); }, [load]);

  const handlePeriodChange = (e) => {
    load(e.target.value);
  };

  if (loading) return (
    <div className="p-8 text-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-slate-400 text-sm">Memuat dashboard eksekutif...</p>
    </div>
  );

  if (error) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
    </div>
  );

  const byUnit        = data?.byUnit        || [];
  const byAssessment  = data?.byAssessment  || {};
  const criticalItems = data?.criticalItems || [];
  const complianceRate     = data?.complianceRate     ?? 0;
  const verifiedOnTimeRate = data?.verifiedOnTimeRate ?? 0;
  const overdueCount       = data?.overdueCount       ?? 0;
  const openFollowUpCount  = data?.openFollowUpCount  ?? 0;
  const totalItems         = data?.totalItems         ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Eksekutif — Monitoring Internal</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <select
              value={activePeriod?.id || ''}
              onChange={handlePeriodChange}
              className="text-sm border border-slate-600 bg-slate-800 text-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              {periods.length === 0 && <option value="">Tidak ada periode</option>}
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.status === 'OPEN' ? '(Aktif)' : '(Ditutup)'}
                </option>
              ))}
            </select>
            {lastRefresh && <span className="text-xs text-slate-500">· Diperbarui {lastRefresh.toLocaleTimeString('id-ID')}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(activePeriod?.id)} className="px-4 py-2 text-sm border border-slate-700 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-slate-300">
            🔄 Refresh
          </button>
          <Link
            to="/internal-monitoring/portal"
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-colors font-medium"
          >
            📋 Portal Upload
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Compliance Rate"
          value={fmtPct(complianceRate)}
          sub="Target kepatuhan keseluruhan"
          icon="📊"
          colorClass={complianceColor(complianceRate).text}
        />
        <KpiCard
          label="Tepat Waktu"
          value={fmtPct(verifiedOnTimeRate)}
          sub="Verified sebelum deadline"
          icon="⏱️"
          colorClass="text-blue-400"
        />
        <KpiCard
          label="Overdue"
          value={overdueCount}
          sub="Melewati deadline belum verified"
          icon="⚠️"
          colorClass={overdueCount > 0 ? 'text-red-400' : 'text-slate-500'}
        />
        <KpiCard
          label="Total Item Aktif"
          value={totalItems || (byUnit.reduce((s, u) => s + (u.total || 0), 0))}
          sub="295 item di PDF resmi"
          icon="📋"
          colorClass="text-slate-300"
        />
      </div>

      {/* ── Progress Bar Global ─────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-300">📈 Compliance Rate Global</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-bold border ${complianceColor(complianceRate).badge}`}>
            {fmtPct(complianceRate)}
          </span>
        </div>
        <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${complianceColor(complianceRate).bar}`}
            style={{ width: `${complianceRate}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1.5">
          <span>0%</span>
          <span className="text-amber-500">Target: 80%</span>
          <span>100%</span>
        </div>
      </div>

      {/* ── Breakdown per Assessment Category (AMPUH/PMPZI/AKIP/REG) ───────── */}
      <div>
        <h2 className="text-sm font-bold text-slate-300 mb-3">📊 Progres per Kategori Assessment (Sesuai PDF Resmi)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ASSESSMENT_META.map(meta => (
            <AssessmentCard
              key={meta.code}
              meta={meta}
              stats={byAssessment[meta.code] || byAssessment[meta.label] || null}
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          ℹ️ Total target di PDF resmi: 70 AMP + 134 PZ + 79 AKIP + 12 REG = <strong>295 item</strong>.
          Coverage % menunjukkan item yang sudah aktif di sistem vs total PDF.
        </p>
      </div>

      {/* ── Dua kolom: Unit Progress + Critical Items ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Progress Per Unit/Bagian */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300">🏢 Progress Per Unit / Bagian</h2>
            <span className="text-xs text-slate-500">{byUnit.length} unit</span>
          </div>
          {byUnit.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <div className="text-3xl mb-2">📋</div>
              <p>Data per unit belum tersedia.</p>
              <p className="text-xs mt-1 text-slate-400">
                Pastikan data master unit telah diisi dan target telah di-generate.
              </p>
            </div>
          ) : (
            <div className="px-5 divide-y divide-gray-50">
              {byUnit.map(u => <UnitProgressRow key={u.unit_id} unit={u} />)}
            </div>
          )}
        </div>

        {/* Critical Items (Overdue) */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300">🔥 Item Kritis (Overdue)</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${criticalItems.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
              {criticalItems.length} item
            </span>
          </div>
          {criticalItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-medium text-emerald-600">Tidak ada item overdue!</p>
              <p className="text-xs mt-1">Semua checklist berjalan sesuai jadwal.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {criticalItems.map((item, i) => <CriticalItemRow key={item.id} item={item} idx={i} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Shortcut navigasi ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/internal-monitoring/review-queue',  icon: '🔍', label: 'Antrian Review',    desc: 'Target menunggu approval/verifikasi' },
          { to: '/internal-monitoring/follow-ups',    icon: '📌', label: 'Follow-up Aktif',   desc: 'Tindak lanjut yang perlu diselesaikan' },
          { to: '/internal-monitoring/targets',       icon: '📋', label: 'Semua Target',      desc: 'Lihat dan kelola seluruh checklist' },
        ].map(nav => (
          <Link
            key={nav.to}
            to={nav.to}
            className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 hover:border-emerald-500/50 hover:shadow-lg transition-all group"
          >
            <div className="text-2xl mb-2">{nav.icon}</div>
            <div className="text-sm font-semibold text-slate-200 group-hover:text-teal-700">{nav.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{nav.desc}</div>
          </Link>
        ))}
      </div>

      {/* ── Management Review shortcut ──────────────────────────────────────── */}
      <div className="bg-linear-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🗂️</span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-200">Management Review</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Buat dan kelola sesi review manajemen untuk periode ini — rekap temuan, keputusan, dan tindak lanjut strategis.
            </p>
          </div>
          <Link
            to="/internal-monitoring/management-reviews"
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shrink-0"
          >
            Buka →
          </Link>
        </div>
      </div>

    </div>
  );
};

export default ExecutiveDashboard;
