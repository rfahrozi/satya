import { useState } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { LogOut, Home, Users, Landmark, FileText, Menu, X, Database, Info, ClipboardCheck, FolderOpen, BarChart3 } from 'lucide-react'
import NotificationBell from './NotificationBell'

// Definisi Role Akses
const R_EKSEKUTIF = ['KPT', 'WKPT'];
const R_MONITORING = ['KABAG_PK', 'KABAG_UK', 'KPT', 'WKPT', 'PIMPINAN'];
const R_UPLOADER = [
  'KASUBBAG_PTIP', 'KASUBBAG_KEPEG_TI', 'KASUBBAG_TURT', 'KASUBBAG_PEL_KEU',
  'PANITERA_PT', 'PANMUD_HUKUM_PT', 'STAFF_PANMUD_HUKUM_PT',
  'PANMUD_PIDANA_PT', 'PANMUD_PERDATA_PT', 'PANMUD_TIPIKOR_PT'
];
const R_ADMIN = ['ADMIN_PT'];

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const userStr = localStorage.getItem('satya_user')
  const user = userStr ? JSON.parse(userStr) : null

  const ptRoles = ['ADMIN_PT', 'KPT', 'WKPT', 'PANITERA_PT', 'PANMUD_HUKUM_PT', 'STAFF_PANMUD_HUKUM_PT', 'PIMPINAN'];
  const pnRoles = ['KPN', 'PANITERA_PN', 'PANMUD_HUKUM_PN', 'STAFF_PANMUD_HUKUM_PN', 'SATKER_PN', 'ADMIN_PN'];
  const isAdmin = user.role === 'ADMIN_PT' || user.role === 'ADMIN_PN';
  const isGlobalAdmin = user.role === 'ADMIN_PT';

  const handleLogout = () => {
    localStorage.removeItem('satya_token')
    localStorage.removeItem('satya_user')
    navigate('/login', { replace: true })
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Skip-to-content link (A11y) */}
      <a href="#main-content" className="skip-link">Lewati ke konten utama</a>

      {/* Top Navbar */}
      <nav className="glass-header border-b border-slate-200" aria-label="Navigasi utama">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-lg flex items-center justify-center shadow-md">
                <Landmark className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800 leading-tight">SATYA</h1>
                <p className="text-[0.65rem] font-semibold text-blue-600 uppercase tracking-widest">{user.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              
              <div className="hidden md:flex items-center space-x-1">
                {ptRoles.includes(user.role) && (
                  <Link
                    to="/dashboard"
                    aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Home size={18} aria-hidden="true" /> Dashboard
                  </Link>
                )}

                {isAdmin && (
                  <>
                    <Link
                      to="/users"
                      aria-current={location.pathname === '/users' ? 'page' : undefined}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Users size={18} aria-hidden="true" /> Manajemen User
                    </Link>
                  </>
                )}

                {isGlobalAdmin && (
                  <>
                    <Link
                      to="/master"
                      aria-current={location.pathname === '/master' ? 'page' : undefined}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/master' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Database size={18} aria-hidden="true" /> Master Data
                    </Link>
                  </>
                )}

                {ptRoles.includes(user.role) && (
                    <Link
                      to="/informasi"
                      aria-current={location.pathname === '/informasi' ? 'page' : undefined}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/informasi' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Info size={18} aria-hidden="true" /> Informasi
                    </Link>
                )}

                {/* Dashboard Eksekutif PT */}
                {R_EKSEKUTIF.includes(user.role) && (
                  <Link
                    to="/internal-monitoring/executive"
                    aria-current={location.pathname === '/internal-monitoring/executive' ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/internal-monitoring/executive' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <BarChart3 size={18} aria-hidden="true" /> Dashboard Eksekutif PT
                  </Link>
                )}

                {/* Menu Monitoring Internal PT */}
                {R_MONITORING.includes(user.role) && (
                  <Link
                    to="/internal-monitoring/dashboard"
                    aria-current={location.pathname.startsWith('/internal-monitoring') && !location.pathname.startsWith('/internal-monitoring/portal') && !location.pathname.startsWith('/internal-monitoring/executive') ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname.startsWith('/internal-monitoring') && !location.pathname.startsWith('/internal-monitoring/portal') && !location.pathname.startsWith('/internal-monitoring/executive') ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <ClipboardCheck size={18} aria-hidden="true" /> Monitoring Internal PT
                  </Link>
                )}

                {/* Menu Portal Checklist PT */}
                {R_UPLOADER.includes(user.role) && (
                  <Link
                    to="/internal-monitoring/portal"
                    aria-current={location.pathname.startsWith('/internal-monitoring/portal') ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname.startsWith('/internal-monitoring/portal') ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <FolderOpen size={18} aria-hidden="true" /> Portal Checklist PT
                  </Link>
                )}

                {/* Menu Manajemen User & Master Data PN & Master Data PT */}
                {R_ADMIN.includes(user.role) && (
                  <>
                    <Link
                      to="/users"
                      aria-current={location.pathname === '/users' ? 'page' : undefined}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Users size={18} aria-hidden="true" /> Manajemen User
                    </Link>
                    <Link
                      to="/master"
                      aria-current={location.pathname === '/master' ? 'page' : undefined}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/master' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Database size={18} aria-hidden="true" /> Master Data PN
                    </Link>
                    <Link
                      to="/master-pt"
                      aria-current={location.pathname === '/master-pt' ? 'page' : undefined}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/master-pt' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Database size={18} aria-hidden="true" /> Master Data PT
                    </Link>
                  </>
                )}

                {pnRoles.includes(user.role) && (
                  <Link 
                    to="/portal" 
                    aria-current={location.pathname === '/portal' ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/portal' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <FileText size={18} aria-hidden="true" /> Portal Laporan
                  </Link>
                )}
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-2 sm:gap-4 pl-2 sm:pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800">{user.username}</p>
                </div>

                {pnRoles.includes(user.role) && <NotificationBell />}
                
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  aria-label="Keluar dari sistem"
                >
                  <LogOut size={20} aria-hidden="true" />
                </button>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-nav"
                  aria-label="Toggle navigasi mobile"
                  className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div id="mobile-nav" className="md:hidden bg-white border-t border-slate-200 shadow-lg px-4 pt-2 pb-4 space-y-2">
            {ptRoles.includes(user.role) && (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
                className={`flex items-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-colors ${location.pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Home size={18} aria-hidden="true" /> Dashboard
              </Link>
            )}

            {isAdmin && (
              <>
                <Link
                  to="/users"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={location.pathname === '/users' ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-colors ${location.pathname === '/users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Users size={18} aria-hidden="true" /> Manajemen User
                </Link>
              </>
            )}

            {isGlobalAdmin && (
              <>
                <Link
                  to="/master"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={location.pathname === '/master' ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-colors ${location.pathname === '/master' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Database size={18} aria-hidden="true" /> Master Data
                </Link>
              </>
            )}

            {ptRoles.includes(user.role) && (
                <Link
                  to="/informasi"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={location.pathname === '/informasi' ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-colors ${location.pathname === '/informasi' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Info size={18} aria-hidden="true" /> Informasi
                </Link>
            )}

            {/* Dashboard Eksekutif PT (mobile) */}
            {R_EKSEKUTIF.includes(user.role) && (
              <Link
                to="/internal-monitoring/executive"
                onClick={() => setMobileMenuOpen(false)}
                aria-current={location.pathname === '/internal-monitoring/executive' ? 'page' : undefined}
                className={`flex items-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-colors ${location.pathname === '/internal-monitoring/executive' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <BarChart3 size={18} aria-hidden="true" /> Dashboard Eksekutif PT
              </Link>
            )}

            {/* Menu Monitoring Internal PT (mobile) */}
            {R_MONITORING.includes(user.role) && (
              <Link
                to="/internal-monitoring/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                aria-current={location.pathname.startsWith('/internal-monitoring') && !location.pathname.startsWith('/internal-monitoring/portal') && !location.pathname.startsWith('/internal-monitoring/executive') ? 'page' : undefined}
                className={`flex items-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-colors ${location.pathname.startsWith('/internal-monitoring') && !location.pathname.startsWith('/internal-monitoring/portal') && !location.pathname.startsWith('/internal-monitoring/executive') ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <ClipboardCheck size={18} aria-hidden="true" /> Monitoring Internal PT
              </Link>
            )}

            {/* Menu Portal Checklist PT (mobile) */}
            {R_UPLOADER.includes(user.role) && (
              <Link
                to="/internal-monitoring/portal"
                onClick={() => setMobileMenuOpen(false)}
                aria-current={location.pathname.startsWith('/internal-monitoring/portal') ? 'page' : undefined}
                className={`flex items-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-colors ${location.pathname.startsWith('/internal-monitoring/portal') ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <FolderOpen size={18} aria-hidden="true" /> Portal Checklist PT
              </Link>
            )}

            {/* Menu Manajemen User & Master Data (mobile) */}
            {R_ADMIN.includes(user.role) && (
              <>
                <Link
                  to="/users"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={location.pathname === '/users' ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-colors ${location.pathname === '/users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Users size={18} aria-hidden="true" /> Manajemen User
                </Link>
                <Link
                  to="/master"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={location.pathname === '/master' ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-colors ${location.pathname === '/master' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Database size={18} aria-hidden="true" /> Master Data PN
                </Link>
                <Link
                  to="/master-pt"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={location.pathname === '/master-pt' ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-colors ${location.pathname === '/master-pt' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Database size={18} aria-hidden="true" /> Master Data PT
                </Link>
              </>
            )}
            {pnRoles.includes(user.role) && (
              <Link
                to="/portal"
                onClick={() => setMobileMenuOpen(false)}
                aria-current={location.pathname === '/portal' ? 'page' : undefined}
                className={`flex items-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-colors ${location.pathname === '/portal' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <FileText size={18} aria-hidden="true" /> Portal Laporan
              </Link>
            )}
            
            <div className="pt-2 mt-2 border-t border-slate-100 sm:hidden">
              <p className="text-sm font-semibold text-slate-800 px-3">{user.username}</p>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in" tabIndex={-1}>
        <Outlet />
      </main>

    </div>
  )
}
