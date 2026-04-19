import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Landmark, Lock, User, AlertCircle, Loader2 } from 'lucide-react'
import axios from 'axios'

export default function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await axios.post('http://localhost:3000/api/v1/auth/login', formData)
      
      const { token, user } = res.data.data
      
      // Save session credentials
      localStorage.setItem('satya_token', token)
      localStorage.setItem('satya_user', JSON.stringify(user))

      // Direct to respective portal
      if (user.role === 'SATKER_PN') {
        navigate('/portal')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal terhubung ke server')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow delay-1000"></div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        
        {/* Main Glass Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8 overflow-hidden">
          
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg mb-4 transform hover:scale-105 transition-transform duration-300">
              <Landmark className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Login ke SATYA</h1>
            <p className="text-sm text-slate-500 mt-1">Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 ml-1">Username / Kode Satker</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input 
                  type="text"
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-slate-700 placeholder-slate-400"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-slate-700 placeholder-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              <div className="flex items-center justify-center gap-2 relative z-10">
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Masuk Sistem'}
              </div>
            </button>
          </form>

        </div>
        
        {/* Footer Area */}
        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          &copy; 2026 Pengadilan Tinggi Kepulauan Riau
        </p>

      </div>
    </div>
  )
}
