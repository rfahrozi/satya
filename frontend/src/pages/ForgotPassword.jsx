import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Landmark, User, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
import api from '../lib/axios'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const res = await api.post('/api/v1/auth/forgot-password', { username })
      setSuccess(res.data.message || 'Tautan reset password telah dikirim ke email Anda.')
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim permintaan reset password.')
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
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Lupa Password</h1>
            <p className="text-sm text-slate-500 mt-1">Masukkan Username atau Email Anda untuk mereset kata sandi.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg flex items-start gap-2 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="username" className="text-sm font-semibold text-slate-700 ml-1">Username / Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input 
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-slate-700 placeholder-slate-400"
                  placeholder="Masukkan username atau email"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || success !== ''}
              className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              <div className="flex items-center justify-center gap-2 relative z-10">
                {isLoading
                  ? <><Loader2 className="animate-spin w-5 h-5" /><span>Mengirim...</span></>
                  : 'Kirim Link Reset'
                }
              </div>
            </button>

            <button 
              type="button" 
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 text-slate-600 font-medium py-2 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
