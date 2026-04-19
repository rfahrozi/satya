import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { LogOut, Home, Users, Landmark, FileText } from 'lucide-react'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const userStr = localStorage.getItem('satya_user')
  const user = userStr ? JSON.parse(userStr) : null

  const handleLogout = () => {
    localStorage.removeItem('satya_token')
    localStorage.removeItem('satya_user')
    navigate('/login', { replace: true })
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="glass-header border-b border-slate-200">
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
                {(user.role === 'ADMIN_PT' || user.role === 'PIMPINAN') && (
                  <Link 
                    to="/dashboard" 
                    className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Home size={18} /> Dashboard
                  </Link>
                )}

                {user.role === 'ADMIN_PT' && (
                  <Link 
                    to="/users" 
                    className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Users size={18} /> Manajemen User
                  </Link>
                )}

                {user.role === 'SATKER_PN' && (
                  <Link 
                    to="/portal" 
                    className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors ${location.pathname === '/portal' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <FileText size={18} /> Portal Laporan
                  </Link>
                )}
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800">{user.username}</p>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Keluar / Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>

            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
        <Outlet />
      </main>

    </div>
  )
}
