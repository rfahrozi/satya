import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SatkerPortal from './pages/SatkerPortal'
import UserManagement from './pages/UserManagement'
import MasterData from './pages/MasterData'
import MasterDataPT from './pages/MasterDataPT'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Informasi from './pages/Informasi'
import Layout from './components/Layout'

// ─── Internal Monitoring PT ──────────────────────────────────────────────────
import IMDashboard        from './features/internalMonitoring/pages/Dashboard'
import IMMyTargets        from './features/internalMonitoring/pages/MyTargets'
import IMTargetDetail     from './features/internalMonitoring/pages/TargetDetail'
import IMReviewQueue      from './features/internalMonitoring/pages/ReviewQueue'
import IMFollowUpQueue    from './features/internalMonitoring/pages/FollowUpQueue'
import IMInternalPortal   from './features/internalMonitoring/pages/InternalPortal'
import IMExecutiveDashboard  from './features/internalMonitoring/pages/ExecutiveDashboard'

// ─── Governance Components ────────────────────────────────────────────────────
import RiskHeatmap           from './features/internalMonitoring/components/governance/RiskHeatmap'
import RiskTrendDashboard    from './features/internalMonitoring/components/governance/RiskTrendDashboard'
import ManagementReviewList  from './features/internalMonitoring/components/governance/ManagementReviewList'
import ManagementReviewDetail from './features/internalMonitoring/components/governance/ManagementReviewDetail'
import RepeatFindingQueue    from './features/internalMonitoring/components/governance/RepeatFindingQueue'
import RiskAcceptanceRegister from './features/internalMonitoring/components/governance/RiskAcceptanceRegister'
import ActionAgingDashboard  from './features/internalMonitoring/components/governance/ActionAgingDashboard'

// ─── Definisi Role Akses Sesuai Alur Proses ──────────────────────────────────
const R_EKSEKUTIF = ['KPT', 'WKPT', 'HAKIM_PT']; // 1. Dashboard Eksekutif PT

const R_MONITORING = [
  'KPT', 'WKPT', 'HAKIM_PT', 
  'PANITERA_PT', 'SEKRETARIS_PT', 
  'KABAG_PERENC_KEP', 'KABAG_UMUM_KEU'
]; // 2. Monitoring Internal PT (Pimpinan & Pejabat Eselon III)

// 3. Uploader di Portal Checklist (Semua jabatan yang memiliki target evaluasi)
const R_UPLOADER = [
  'KPT', 'WKPT', 'HAKIM_PT', 
  'PANITERA_PT', 'PANMUD_HUKUM_PT', 'PANMUD_PERDATA_PT', 'PANMUD_PIDANA_PT', 'PANITERA_PENGGANTI', 'STAFF_PANMUD_HUKUM_PT',
  'SEKRETARIS_PT', 'KABAG_PERENC_KEP', 'KABAG_UMUM_KEU',
  'KASUBBAG_TURT', 'KASUBBAG_KEPEG_TI', 'KASUBBAG_PEL_KEU', 'KASUBBAG_PTIP'
];

// Verifikator (Reviewer tahap akhir)
const R_VERIFIER = ['VERIFIER'];

const R_ADMIN = ['ADMIN_PT']; // Manajemen User, Master Data PN, Master Data PT


function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('satya_token');
  const user = JSON.parse(localStorage.getItem('satya_user') || 'null');

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirection fallback berdasarkan role
    const pnRoles = ['KPN', 'PANITERA_PN', 'PANMUD_HUKUM_PN', 'STAFF_PANMUD_HUKUM_PN', 'SATKER_PN', 'ADMIN_PN'];
    if (pnRoles.includes(user.role)) return <Navigate to="/portal" replace />;

    // Fallback spesifik internal PT
    if (R_ADMIN.includes(user.role)) return <Navigate to="/master" replace />;
    if (R_UPLOADER.includes(user.role)) return <Navigate to="/internal-monitoring/portal" replace />;
    if (R_EKSEKUTIF.includes(user.role)) return <Navigate to="/internal-monitoring/executive" replace />;
    if (R_VERIFIER.includes(user.role)) return <Navigate to="/internal-monitoring/review-queue" replace />;

    return <Navigate to="/internal-monitoring/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter basename="/satya">
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Unprotected Auth route */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Dashboard/API Routes wrapped in App Shell Layout */}
        <Route element={<Layout />}>

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN_PT', ...R_MONITORING]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN_PT', 'ADMIN_PN']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/informasi"
            element={
              <ProtectedRoute allowedRoles={['ADMIN_PT', ...R_MONITORING]}>
                <Informasi />
              </ProtectedRoute>
            }
          />

          <Route
            path="/master"
            element={
              <ProtectedRoute allowedRoles={['ADMIN_PT']}>
                <MasterData />
              </ProtectedRoute>
            }
          />

          {/* Master Data PT — untuk mengelola periode monitoring dan 51 checklist */}
          <Route
            path="/master-pt"
            element={
              <ProtectedRoute allowedRoles={['ADMIN_PT']}>
                <MasterDataPT />
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['KPN', 'PANITERA_PN', 'PANMUD_HUKUM_PN', 'STAFF_PANMUD_HUKUM_PN', 'SATKER_PN', 'ADMIN_PN']}>
                <SatkerPortal />
              </ProtectedRoute>
            }
          />

          {/* ── Monitoring Internal PT ─────────────────────────────────────── */}

          {/* Dashboard utama monitoring internal — untuk Kabag dan Pimpinan */}
          <Route
            path="/internal-monitoring"
            element={<Navigate to="/internal-monitoring/dashboard" replace />}
          />
          <Route
            path="/internal-monitoring/dashboard"
            element={
              <ProtectedRoute allowedRoles={R_MONITORING}>
                <IMDashboard />
              </ProtectedRoute>
            }
          />

          {/* Daftar target yang ditugaskan ke pengguna */}
          <Route
            path="/internal-monitoring/targets"
            element={
              <ProtectedRoute allowedRoles={R_UPLOADER}>
                <IMMyTargets />
              </ProtectedRoute>
            }
          />

          {/* Detail target: upload evidence, submit, approve, verifikasi */}
          <Route
            path="/internal-monitoring/targets/:id"
            element={
              <ProtectedRoute allowedRoles={[...R_UPLOADER, ...R_VERIFIER, ...R_MONITORING, ...R_ADMIN]}>
                <IMTargetDetail />
              </ProtectedRoute>
            }
          />

          {/* Antrian review — untuk Verifier */}
          <Route
            path="/internal-monitoring/review-queue"
            element={
              <ProtectedRoute allowedRoles={R_VERIFIER}>
                <IMReviewQueue />
              </ProtectedRoute>
            }
          />

          {/* Antrian follow-up — semua role operasional */}
          <Route
            path="/internal-monitoring/follow-ups"
            element={
              <ProtectedRoute allowedRoles={[...R_UPLOADER, ...R_MONITORING, ...R_VERIFIER]}>
                <IMFollowUpQueue />
              </ProtectedRoute>
            }
          />

          {/* Portal upload checklist per bagian internal PT (HANYA Uploader) */}
          <Route
            path="/internal-monitoring/portal"
            element={
              <ProtectedRoute allowedRoles={R_UPLOADER}>
                <IMInternalPortal />
              </ProtectedRoute>
            }
          />

          {/* Dashboard eksekutif untuk Pimpinan/KPT — byUnit breakdown */}
          <Route
            path="/internal-monitoring/executive"
            element={
              <ProtectedRoute allowedRoles={R_EKSEKUTIF}>
                <IMExecutiveDashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Governance Routes ──────────────────────────────────────────── */}
          <Route
            path="/internal-monitoring/risk-heatmap"
            element={<ProtectedRoute allowedRoles={R_MONITORING}><RiskHeatmap /></ProtectedRoute>}
          />
          <Route
            path="/internal-monitoring/risk-trends"
            element={<ProtectedRoute allowedRoles={R_MONITORING}><RiskTrendDashboard /></ProtectedRoute>}
          />
          <Route
            path="/internal-monitoring/management-reviews"
            element={<ProtectedRoute allowedRoles={['ADMIN_PT', ...R_EKSEKUTIF]}><ManagementReviewList /></ProtectedRoute>}
          />
          <Route
            path="/internal-monitoring/management-reviews/:id"
            element={<ProtectedRoute allowedRoles={['ADMIN_PT', ...R_EKSEKUTIF]}><ManagementReviewDetail /></ProtectedRoute>}
          />
          <Route
            path="/internal-monitoring/repeat-findings"
            element={<ProtectedRoute allowedRoles={['ADMIN_PT','VERIFIER']}><RepeatFindingQueue /></ProtectedRoute>}
          />
          <Route
            path="/internal-monitoring/risk-acceptances"
            element={<ProtectedRoute allowedRoles={['ADMIN_PT', ...R_EKSEKUTIF]}><RiskAcceptanceRegister /></ProtectedRoute>}
          />
          <Route
            path="/internal-monitoring/action-aging"
            element={<ProtectedRoute allowedRoles={R_MONITORING}><ActionAgingDashboard /></ProtectedRoute>}
          />

        </Route>

        <Route path="*" element={<h1 className="p-8 text-center text-slate-500">Halaman tidak ditemukan (404)</h1>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
