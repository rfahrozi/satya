import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { internalMonitoringApi } from '../api/internalMonitoringApi';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

function complianceColor(pct) {
  if (pct >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (pct >= 50) return { bar: 'bg-amber-400',   text: 'text-amber-700',   badge: 'bg-amber-50 text-amber-700 border-amber-200' };
  return               { bar: 'bg-red-500',      text: 'text-red-700',     badge: 'bg-red-50 text-red-700 border-red-200' };
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
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    badgeBg: 'bg-amber-100 text-amber-800',
  },
  {
    code: 'PMPZI',
    label: 'PMPZI',
    desc: 'Pembangunan Zona Integritas',
    icon: '🛡️',
    total_pdf: 134,
    prefix: 'PZ-',
    border: 'border-teal-200',
    bg: 'bg-teal-50',
    badgeBg: 'bg-teal-100 text-teal-800',
  },
  {
    code: 'AKIP',
    label: 'AKIP',
    desc: 'Akuntabilitas Kinerja (SAKIP)',
    icon: '📊',
    total_pdf: 79,
    prefix: 'AKIP-',
    border: 'border-violet-200',
    bg: 'bg-violet-50',
    badgeBg: 'bg-violet-100 text-violet-800',
  },
  {
    code: 'REGULASI',
    label: 'REG',
    desc: 'Tambahan Regulasi Badilum',
    icon: '📜',
    total_pdf: 12,
    prefix: 'REG-',
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    badgeBg: 'bg-slate-100 text-slate-700',
  },
];

// ─── Sub-komponen ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, colorClass = 'text-blue-600' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      </div>
      <div className={`text-3xl font-black ${colorClass} leading-none`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1.5">{sub}</div>}
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
            <p className="text-[10px] text-gray-500 mt-0.5">{meta.desc}</p>
          </div>
        </div>
        <span className={`text-sm font-black ${color.text}`}>{pct}%</span>
      </div>

      {/* Progress bar verified */}
      <div className="w-full h-2 bg-white bg-opacity-70 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Statistik */}
      <div className="flex justify-between text-xs text-gray-600">
        <span className="text-emerald-700 font-semibold">✓ {verified} verified</span>
        <span>{total} aktif</span>
        <span className="text-gray-400">{meta.total_pdf} di PDF</span>
      </div>

      {/* Coverage bar (item aktif vs total PDF) */}
      {coverage < 100 && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-600">
          <div className="flex-1 h-1 bg-white rounded-full overflow-hidden">
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
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-40 shrink-0">
        <p className="text-sm font-semibold text-gray-800 truncate" title={unit.unit_name}>{unit.unit_name}</p>
        <p className="text-xs text-gray-400">{unit.unit_code}</p>
      </div>
      <div className="flex-1">
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${color.bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="w-16 text-right shrink-0">
        <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${color.badge}`}>{fmtPct(pct)}</span>
      </div>
      <div className="hidden sm:flex gap-3 text-xs text-gray-500 shrink-0 w-36 justify-end">
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
      className="flex items-start gap-3 py-3 px-4 border-b border-gray-100 last:border-0 hover:bg-red-50 transition-colors group"
    >
      <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {idx + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 group-hover:text-red-700 truncate">
          {item.item_title || item.item_code}
        </p>
        <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
          {item.unit_name && <span>📍 {item.unit_name}</span>}
          {daysLate > 0 && <span className="text-red-600 font-semibold">⚠ Terlambat {daysLate} hari</span>}
          <span className="capitalize">{(item.workflow_status || '').replace(/_/g, ' ')}</span>
        </div>
      </div>
      <span className="text-gray-300 group-hover:text-red-400 shrink-0">→</span>
    </Link>
  );
}

// ─── Komponen Utama ───────────────────────────────────────────────────────────
const ExecutiveDashboard = () => {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [activePeriod, setActivePeriod] = useState(null);
  const [lastRefresh, setLastRefresh]   = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Resolusi periode aktif
      const pRes    = await internalMonitoringApi.listPeriods({ status: 'OPEN' });
      const periods = pRes.data?.data || [];
      const period  = periods[0] || null;
      setActivePeriod(period);

      // Executive dashboard — byUnit sudah terisi setelah BUG-06 diperbaiki
      const dRes = await internalMonitoringApi.getExecutiveDashboard(period?.id);
      setData(dRes.data?.data || dRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat dashboard eksekutif.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="p-8 text-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Memuat dashboard eksekutif...</p>
    </div>
  );

  if (error) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Eksekutif — Monitoring Internal</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activePeriod ? `Periode: ${activePeriod.name} (${activePeriod.year})` : '⚠ Tidak ada periode aktif'}
            {lastRefresh && <span className="ml-3 text-gray-400">· Diperbarui {lastRefresh.toLocaleTimeString('id-ID')}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
            🔄 Refresh
          </button>
          <Link
            to="/internal-monitoring/portal"
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
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
          colorClass="text-blue-600"
        />
        <KpiCard
          label="Overdue"
          value={overdueCount}
          sub="Melewati deadline belum verified"
          icon="⚠️"
          colorClass={overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}
        />
        <KpiCard
          label="Total Item Aktif"
          value={totalItems || (byUnit.reduce((s, u) => s + (u.total || 0), 0))}
          sub="295 item di PDF resmi"
          icon="📋"
          colorClass="text-gray-700"
        />
      </div>

      {/* ── Progress Bar Global ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">📈 Compliance Rate Global</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-bold border ${complianceColor(complianceRate).badge}`}>
            {fmtPct(complianceRate)}
          </span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${complianceColor(complianceRate).bar}`}
            style={{ width: `${complianceRate}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>0%</span>
          <span className="text-amber-500">Target: 80%</span>
          <span>100%</span>
        </div>
      </div>

      {/* ── Breakdown per Assessment Category (AMPUH/PMPZI/AKIP/REG) ───────── */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3">📊 Progres per Kategori Assessment (Sesuai PDF Resmi)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ASSESSMENT_META.map(meta => (
            <AssessmentCard
              key={meta.code}
              meta={meta}
              stats={byAssessment[meta.code] || byAssessment[meta.label] || null}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          ℹ️ Total target di PDF resmi: 70 AMP + 134 PZ + 79 AKIP + 12 REG = <strong>295 item</strong>.
          Coverage % menunjukkan item yang sudah aktif di sistem vs total PDF.
        </p>
      </div>

      {/* ── Dua kolom: Unit Progress + Critical Items ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Progress Per Unit/Bagian */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">🏢 Progress Per Unit / Bagian</h2>
            <span className="text-xs text-gray-400">{byUnit.length} unit</span>
          </div>
          {byUnit.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              <div className="text-3xl mb-2">📋</div>
              <p>Data per unit belum tersedia.</p>
              <p className="text-xs mt-1 text-gray-300">
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
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">🔥 Item Kritis (Overdue)</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${criticalItems.length > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
              {criticalItems.length} item
            </span>
          </div>
          {criticalItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
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
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-md transition-all group"
          >
            <div className="text-2xl mb-2">{nav.icon}</div>
            <div className="text-sm font-semibold text-gray-800 group-hover:text-teal-700">{nav.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{nav.desc}</div>
          </Link>
        ))}
      </div>

      {/* ── Management Review shortcut ──────────────────────────────────────── */}
      <div className="bg-linear-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🗂️</span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-800">Management Review</h3>
            <p className="text-xs text-gray-500 mt-0.5">
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
