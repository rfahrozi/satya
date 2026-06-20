import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Landmark, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import api from '../lib/axios'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    if (!token) {
      setError('Token reset tidak ditemukan di URL. Silakan klik ulang tautan dari email Anda.')
      setIsLoading(false)
      return
    }

    try {
      const res = await api.post('/api/v1/auth/reset-password', { token, newPassword })
      setSuccess(res.data.message || 'Password berhasil diubah.')
      
      // Navigate to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mereset password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow delay-1000"></div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        
        <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8 overflow-hidden">
          
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <Landmark className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Buat Password Baru</h1>
            <p className="text-sm text-slate-500 mt-1">Masukkan kata sandi baru untuk akun Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {!token && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2 mb-4">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>Token tidak ditemukan. Harap pastikan Anda membuka tautan yang benar dari email.</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg flex items-start gap-2 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{success} Mengalihkan ke halaman Login...</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="newPassword" className="text-sm font-semibold text-slate-700 ml-1">Password Baru</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  id="newPassword"
                  type="password"
                  required
                  disabled={!token || success !== ''}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-slate-700 placeholder-slate-400 disabled:opacity-50"
                  placeholder="••••••••"
                  minLength="6"
                />
              </div>
              <p className="text-xs text-slate-500 ml-1 mt-1">Minimal 6 karakter.</p>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || success !== '' || !token}
              className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              <div className="flex items-center justify-center gap-2 relative z-10">
                {isLoading
                  ? <><Loader2 className="animate-spin w-5 h-5" /><span>Menyimpan...</span></>
                  : 'Simpan Password Baru'
                }
              </div>
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
