import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { internalMonitoringApi } from '../api/internalMonitoringApi';
import StatusBadge from '../components/StatusBadge';
import EvidenceEditor from '../components/EvidenceEditor';

// ─── Konstanta ────────────────────────────────────────────────────────────────
const ASSESSMENT_TABS = [
  { code: 'ALL',      label: '📋 Semua',    color: 'blue'   },
  { code: 'AMPUH',    label: '🏆 AMPUH',    color: 'amber'  },
  { code: 'PMPZI',    label: '🛡️ PMPZI',    color: 'teal'   },
  { code: 'AKIP',     label: '📊 AKIP',     color: 'violet' },
  { code: 'REGULASI', label: '📜 Regulasi', color: 'slate'  },
];

// Rumpun Tupoksi sesuai PDF2 — untuk filter per bidang
const RUMPUN_OPTIONS = [
  { value: 'ALL',                                    label: 'Semua Rumpun' },
  { value: 'PENGAWASAN DAN PEMBINAAN',               label: 'Pengawasan & Pembinaan' },
  { value: 'PENGAWASAN DAN INTEGRITAS',              label: 'Pengawasan & Integritas' },
  { value: 'PENGAWASAN TEKNIS PERKARA',              label: 'Pengawasan Teknis Perkara' },
  { value: 'TEKNIS YUDISIAL',                        label: 'Teknis Yudisial' },
  { value: 'PERSIDANGAN DAN MINUTASI',               label: 'Persidangan & Minutasi' },
  { value: 'ADMINISTRASI PERKARA',                   label: 'Administrasi Perkara' },
  { value: 'ADMINISTRASI PERKARA PERDATA',           label: 'Adm. Perkara Perdata' },
  { value: 'ADMINISTRASI PERKARA PIDANA',            label: 'Adm. Perkara Pidana' },
  { value: 'ADMINISTRASI DAN DATA PERKARA',          label: 'Adm. & Data Perkara' },
  { value: 'DATA, ARSIP, INFORMASI DAN PENGADUAN',   label: 'Data, Arsip & Pengaduan' },
  { value: 'PELAYANAN PERKARA/PTSP',                 label: 'Pelayanan & PTSP' },
  { value: 'KEUANGAN PERKARA',                       label: 'Keuangan Perkara' },
  { value: 'KEPEMIMPINAN DAN TATA KELOLA',           label: 'Kepemimpinan & Tata Kelola' },
  { value: 'REFORMASI BIROKRASI/ZONA INTEGRITAS',    label: 'Reformasi Birokrasi / ZI' },
  { value: 'TATA KELOLA/KEPATUHAN',                  label: 'Tata Kelola & Kepatuhan' },
  { value: 'UMUM, KEUANGAN DAN BMN',                 label: 'Umum, Keuangan & BMN' },
  { value: 'PERENCANAAN, SDM, ORGANISASI DAN TI',    label: 'Perencanaan, SDM & TI' },
  { value: 'MANAJEMEN RISIKO',                       label: 'Manajemen Risiko' },
  { value: 'AKUNTABILITAS KINERJA',                  label: 'Akuntabilitas Kinerja (SAKIP)' },
  { value: 'PRIORITAS PERSIDANGAN DAN PELAYANAN',    label: 'Prioritas Persidangan' },
  { value: 'PENYELESAIAN PERKARA BANDING',           label: 'Penyelesaian Perkara Banding' },
  { value: 'PENGENDALIAN KEPANITERAAN',              label: 'Pengendalian Kepaniteraan' },
  { value: 'PENGENDALIAN KESEKRETARIATAN',           label: 'Pengendalian Kesekretariatan' },
];

// Badge warna per assessment source
const ASSESS_BADGE = {
  AMPUH:    { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'AMPUH'  },
  PMPZI:    { bg: 'bg-teal-100',   text: 'text-teal-800',   label: 'PMPZI'  },
  AKIP:     { bg: 'bg-violet-100', text: 'text-violet-800', label: 'AKIP'   },
  REGULASI: { bg: 'bg-slate-100',  text: 'text-slate-700',  label: 'REG'    },
};

const STATUS_ORDER = ['NOT_STARTED','REVISION_REQUIRED','IN_PROGRESS','AWAITING_APPROVAL','AWAITING_VERIFICATION','VERIFIED'];

const FREQ_LABEL = {
  MONTHLY:                        '📅 Bulanan',
  QUARTERLY:                      '📊 Triwulan',
  SEMIANNUAL:                     '📆 Semester',
  ANNUAL_REGULATOR_CALENDAR:      '🗓️ Tahunan',
  ANNUAL_WITH_CHANGE_EVENTS:      '🗓️ Tahunan/Event',
  CONTINUOUS_WITH_MONTHLY_REVIEW: '🔄 Berkelanjutan',
  EVENT_WITH_MONTHLY_RECAP:       '⚡ Per-Event',
};

// Warna badge status ringkas
function progressColor(pct) {
  if (pct >= 80) return 'text-emerald-600 bg-emerald-50';
  if (pct >= 50) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

// ─── Komponen ─────────────────────────────────────────────────────────────────
const InternalPortal = () => {
  const [targets, setTargets]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [activePeriod, setActivePeriod] = useState(null);
  const [activeAssessment, setActiveAssessment] = useState('ALL');
  const [activeRumpun, setActiveRumpun]         = useState('ALL');
  const [statusFilter, setStatusFilter]         = useState('ALL');
  const [search, setSearch]           = useState('');
  const [expandedId, setExpandedId]   = useState(null);

  const user = JSON.parse(localStorage.getItem('satya_user') || 'null');

  // Role uploader asli (yang berhak mengupload dan submit target di Portal ini)
  const UPLOADER_ROLES = [
    'KASUBBAG_PTIP', 'KASUBBAG_KEPEG_TI', 'KASUBBAG_TURT', 'KASUBBAG_PEL_KEU',
    'PANMUD_HUKUM_PT', 'STAFF_PANMUD_HUKUM_PT',
    'PANMUD_PIDANA_PT', 'PANMUD_PERDATA_PT', 'PANMUD_TIPIKOR_PT'
  ];
  const canUpload = UPLOADER_ROLES.includes(user?.role);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Ambil periode aktif (status dari backend adalah 'OPEN', bukan 'ACTIVE')
      const pRes = await internalMonitoringApi.listPeriods({ status: 'OPEN' });
      const periods = pRes.data?.data || [];
      const period  = periods[0] || null;
      setActivePeriod(period);

      // Tentukan apakah user ini admin/pimpinan yang boleh melihat semua target di periode ini
      const isSuperUser = ['ADMIN_PT', 'KPT', 'WKPT', 'PIMPINAN', 'PANITERA_PT', 'VERIFIER'].includes(user?.role);

      let tRes;
      if (isSuperUser) {
        // Superuser melihat semua target pada periode aktif
        tRes = await internalMonitoringApi.listTargets({ period_id: period?.id });
      } else {
        // User koordinator / unit hanya melihat target yang ditugaskan ke mereka
        tRes = await internalMonitoringApi.listTargets({ role_scope: 'UNIT_PIC', period_id: period?.id });
      }

      setTargets(tRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat data portal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filter & Grup ─────────────────────────────────────────────────────────
  const filtered = targets.filter(t => {
    const matchAssessment = activeAssessment === 'ALL'
      || (t.criteria || []).some(c => c.assessment_code === activeAssessment)
      || (activeAssessment === 'REGULASI' && t.item_code?.startsWith('REG-'));
    const matchRumpun = activeRumpun === 'ALL'
      || (t.duty_cluster || '').toUpperCase().includes(activeRumpun.toUpperCase());
    const matchStatus = statusFilter === 'ALL' || t.workflow_status === statusFilter;
    const matchSearch = !search
      || t.monitoring_item_title?.toLowerCase().includes(search.toLowerCase())
      || t.item_code?.toLowerCase().includes(search.toLowerCase())
      || (t.duty_cluster || '').toLowerCase().includes(search.toLowerCase());
    return matchAssessment && matchRumpun && matchStatus && matchSearch;
  });

  // KPI Summary
  const total    = targets.length;
  const verified = targets.filter(t => t.workflow_status === 'VERIFIED').length;
  const overdue  = targets.filter(t => t.workflow_status !== 'VERIFIED' && t.due_at && new Date(t.due_at) < new Date()).length;
  const inProg   = targets.filter(t => ['IN_PROGRESS','AWAITING_APPROVAL','AWAITING_VERIFICATION'].includes(t.workflow_status)).length;
  const compliancePct = total ? Math.round((verified / total) * 100) : 0;

  if (loading) return (
    <div className="p-8 text-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Memuat portal monitoring internal...</p>
    </div>
  );

  if (error) return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portal Monitoring Internal</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.username} · {activePeriod ? `Periode: ${activePeriod.name}` : '⚠ Tidak ada periode aktif'}
          </p>
        </div>
        <button onClick={load} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
          🔄 Muat Ulang
        </button>
      </div>

      {/* ── KPI Tiles ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Checklist', value: total,          color: 'blue'    },
          { label: 'Verified',        value: verified,        color: 'emerald' },
          { label: 'Sedang Berjalan', value: inProg,          color: 'amber'   },
          { label: 'Overdue',         value: overdue,         color: 'red'     },
        ].map(k => (
          <div key={k.label} className={`bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm`}>
            <div className={`text-2xl font-black text-${k.color}-600`}>{k.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar keseluruhan */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
          <span>Progress Kepatuhan</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${progressColor(compliancePct)}`}>
            {compliancePct}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${compliancePct >= 80 ? 'bg-emerald-500' : compliancePct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
            style={{ width: `${compliancePct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{verified} dari {total} checklist telah diverifikasi</p>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">

        {/* Assessment tabs */}
        <div className="flex flex-wrap gap-2">
          {ASSESSMENT_TABS.map(tab => (
            <button
              key={tab.code}
              onClick={() => { setActiveAssessment(tab.code); setActiveRumpun('ALL'); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeAssessment === tab.code
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {tab.code !== 'ALL' && (
                <span className="ml-1.5 opacity-70">
                  ({targets.filter(t =>
                    tab.code === 'REGULASI'
                      ? t.item_code?.startsWith('REG-')
                      : (t.criteria || []).some(c => c.assessment_code === tab.code)
                  ).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Rumpun Tupoksi filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-500">Rumpun:</span>
          <select
            value={activeRumpun}
            onChange={e => setActiveRumpun(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-400 outline-none bg-white text-gray-700 max-w-xs"
          >
            {RUMPUN_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {activeRumpun !== 'ALL' && (
            <button
              onClick={() => setActiveRumpun('ALL')}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              ✕ Reset
            </button>
          )}
        </div>

        {/* Status + Search */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="ALL">Semua Status</option>
            {STATUS_ORDER.map(s => (
              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="🔍 Cari kode, judul, atau rumpun..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Info filter aktif */}
        {(activeAssessment !== 'ALL' || activeRumpun !== 'ALL' || statusFilter !== 'ALL' || search) && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Menampilkan <strong className="text-gray-700">{filtered.length}</strong> dari {targets.length} checklist</span>
            <button
              onClick={() => { setActiveAssessment('ALL'); setActiveRumpun('ALL'); setStatusFilter('ALL'); setSearch(''); }}
              className="text-blue-500 hover:text-blue-700 underline"
            >
              Reset semua filter
            </button>
          </div>
        )}
      </div>

      {/* ── Daftar Target ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-xl">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 text-sm">Tidak ada checklist yang sesuai filter.</p>
          {total === 0 && activePeriod && (
            <p className="text-xs text-gray-400 mt-2">
              Belum ada target yang digenerate untuk periode ini.
              Hubungi Admin PT untuk generate targets.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(target => {
            const isExpanded  = expandedId === target.id;
            const isOverdue   = target.workflow_status !== 'VERIFIED' && target.due_at && new Date(target.due_at) < new Date();
            const daysLeft    = target.due_at ? Math.ceil((new Date(target.due_at) - new Date()) / 86400000) : null;
            const freqLabel   = FREQ_LABEL[target.frequency_type] || target.frequency_type || '';

            return (
              <div
                key={target.id}
                className={`bg-white border rounded-xl shadow-sm transition-all duration-200 ${
                  isExpanded ? 'border-blue-300 shadow-md' : isOverdue ? 'border-red-200' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* ── Baris Header Target ─────────────────────────────────── */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : target.id)}
                >
                  {/* Kode item — tampilkan kode asli (AMP/PZ/AKIP/REG) */}
                  {(() => {
                    const code = target.item_code || '';
                    const akey = code.startsWith('AMP-') ? 'AMPUH'
                      : code.startsWith('PZ-')   ? 'PMPZI'
                      : code.startsWith('AKIP-') ? 'AKIP'
                      : code.startsWith('REG-')  ? 'REGULASI' : null;
                    const badge = akey ? ASSESS_BADGE[akey] : null;
                    return (
                      <div className={`w-16 h-10 rounded-lg flex flex-col items-center justify-center text-center shrink-0 border ${
                        badge ? `${badge.bg} border-current ${badge.text}` : 'bg-blue-50 border-blue-100 text-blue-600'
                      }`}>
                        <span className="text-[9px] font-bold leading-none opacity-70">
                          {badge?.label || 'CHK'}
                        </span>
                        <span className="text-[10px] font-bold leading-tight">
                          {code.replace(/^(AMP|PZ|AKIP|REG|CHK)-/, '')}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Info utama */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {target.monitoring_item_title || target.item_code}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge status={target.workflow_status} />
                        {freqLabel && (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600">
                            {freqLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                      {target.unit_name && <span>📍 {target.unit_name}</span>}
                      {target.duty_cluster && (
                        <span className="text-gray-400 italic truncate max-w-50" title={target.duty_cluster}>
                          {target.duty_cluster}
                        </span>
                      )}
                      {daysLeft !== null && (
                        <span className={isOverdue ? 'text-red-600 font-semibold' : daysLeft <= 3 ? 'text-amber-600 font-semibold' : ''}>
                          {isOverdue ? `⚠ Terlambat ${Math.abs(daysLeft)} hari`
                            : daysLeft === 0 ? '⚡ Jatuh tempo hari ini'
                            : `🗓 ${daysLeft} hari lagi`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <div className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} shrink-0 mt-1`}>
                    ▼
                  </div>
                </div>

                {/* ── Panel Upload Evidence (Expanded) ───────────────────── */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 rounded-b-xl">
                    {/* Action bar workflow */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-2">
                      <div className="flex flex-wrap gap-2">
                        {canUpload && ['NOT_STARTED','IN_PROGRESS','REVISION_REQUIRED'].includes(target.workflow_status) && (
                          <WorkflowButton
                            label="Submit Target"
                            color="blue"
                            onClick={async () => {
                              await internalMonitoringApi.submitTarget(target.id);
                              load();
                            }}
                          />
                        )}
                        {!canUpload && (
                          <span className="text-xs italic text-gray-500 bg-gray-100 px-2.5 py-1 rounded">
                            Mode Viewer (Read-Only)
                          </span>
                        )}
                      </div>
                      {/* Tombol ke halaman detail lengkap */}
                      <Link
                        to={`/internal-monitoring/targets/${target.id}`}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-white transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        Buka Detail ↗
                      </Link>
                    </div>

                    {/* Evidence Editor — upload dokumen per requirement */}
                    <div className="px-4 pb-4">
                      <EvidenceEditor
                        targetId={target.id}
                        requirements={target.requirements || []}
                        evidences={target.evidences || []}
                        onEvidenceChanged={load}
                        readOnly={!canUpload}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Helper: tombol aksi workflow ────────────────────────────────────────────
const COLOR_MAP = {
  blue:    'bg-blue-600 hover:bg-blue-700 text-white',
  amber:   'bg-amber-500 hover:bg-amber-600 text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  red:     'border border-red-400 text-red-600 hover:bg-red-50',
};

function WorkflowButton({ label, color, onClick }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    try { setBusy(true); await onClick(); } catch (err) { alert(err.response?.data?.message || err.message); } finally { setBusy(false); }
  };
  return (
    <button
      onClick={handle}
      disabled={busy}
      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${COLOR_MAP[color] || COLOR_MAP.blue}`}
    >
      {busy ? 'Memproses...' : label}
    </button>
  );
}

export default InternalPortal;
