import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, AlertCircle, FileText, Download, X, Search, Activity, ShieldCheck, PieChart } from 'lucide-react'
import api from '../lib/axios'

export default function Dashboard() {
  const queryClient = useQueryClient()
  const user = JSON.parse(localStorage.getItem('satya_user') || '{}')
  const isAdmin = user.role === 'ADMIN_PT'

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const [bulan, setBulan] = useState(currentMonth.toString())
  const [tahun, setTahun] = useState(currentYear.toString())
  const [searchTerm, setSearchTerm] = useState('')

  // Verify Modal State
  const [verifyModal, setVerifyModal] = useState({ isOpen: false, data: null })
  const [statusVerif, setStatusVerif] = useState('')
  const [catatan, setCatatan] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', bulan, tahun],
    queryFn: () => api.get(`/reports/dashboard-agregat?bulan=${bulan}&tahun=${tahun}`),
  })

  const verifyMutation = useMutation({
    mutationFn: (payload) => api.patch(`/reports/${payload.id}/verify`, {
      status_verifikasi: payload.status,
      catatan_admin: payload.catatan
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', bulan, tahun] })
      setVerifyModal({ isOpen: false, data: null })
      setStatusVerif('')
      setCatatan('')
      alert('Berhasil diverifikasi!')
    },
    onError: (err) => alert(err.message)
  })

  const handleVerifySubmit = (e) => {
    e.preventDefault()
    if (!statusVerif) return alert("Pilih status verifikasi")
    
    verifyMutation.mutate({
      id: verifyModal.data.submission_id,
      status: statusVerif,
      catatan: catatan
    })
  }

  const handleDownload = async (submissionId) => {
    try {
      const res = await api.get(`/reports/${submissionId}/download`)
      window.open(res.data.url, '_blank')
    } catch (err) {
      alert("Gagal mengunduh file")
    }
  }

  // Filter Data
  const satkers = data?.data || []
  const filteredSatkers = satkers.filter(s => 
    s.nama_satker.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      
      {/* Header Dashboard */}
      <div className="card p-6 border-b-4 border-b-teal-500 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600">
               <PieChart size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Dashboard Monitoring Pimpinan</h2>
              <p className="text-sm text-slate-500">Agregasi kepatuhan unggah laporan pengadilan negeri (Periode Terpilih).</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <select value={bulan} onChange={e => setBulan(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none">
              {[...Array(12)].map((_, i) => (<option key={i+1} value={i+1}>Bulan {i+1}</option>))}
             </select>
             <select value={tahun} onChange={e => setTahun(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none">
              {[currentYear-1, currentYear, currentYear+1].map(y => (<option key={y} value={y}>Tahun {y}</option>))}
             </select>
          </div>
        </div>
      </div>

      <div className="flex items-center relative max-w-md">
        <Search className="w-5 h-5 text-slate-400 absolute left-3" />
        <input 
           type="text" 
           placeholder="Cari Satuan Kerja..." 
           value={searchTerm}
           onChange={e => setSearchTerm(e.target.value)}
           className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 italic">Mengkalkulasi agregat kepatuhan...</div>
      ) : (
        <div className="space-y-6">
          {filteredSatkers.map(satker => (
            <div key={satker.nama_satker} className="card p-0 overflow-hidden shadow-sm hover:shadow-md transition-shadow animate-fade-in">
               <div className="bg-slate-50/80 p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Activity className={`w-6 h-6 ${parseFloat(satker.statistik.persentase_kepatuhan) < 100 ? 'text-amber-500' : 'text-emerald-500'}`} />
                    <h3 className="font-bold text-lg text-slate-800">{satker.nama_satker}</h3>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                     <div className="text-center px-3 border-r border-slate-100">
                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Wajib</p>
                        <p className="font-bold text-slate-800">{satker.statistik.total_wajib}</p>
                     </div>
                     <div className="text-center px-3 border-r border-slate-100">
                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Terunggah</p>
                        <p className="font-bold text-emerald-600">{satker.statistik.total_upload}</p>
                     </div>
                     <div className="text-center pl-3">
                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Kepatuhan</p>
                        <p className={`font-bold ${parseFloat(satker.statistik.persentase_kepatuhan) === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {satker.statistik.persentase_kepatuhan}
                        </p>
                     </div>
                  </div>
               </div>

               <div className="p-0 overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200 font-semibold">
                     <tr>
                       <th className="px-6 py-4">Nama Laporan</th>
                       <th className="px-6 py-4">Ketepatan</th>
                       <th className="px-6 py-4">Status Review</th>
                       {isAdmin && <th className="px-6 py-4 text-right">Aksi</th>}
                     </tr>
                   </thead>
                   <tbody>
                     {satker.detail_laporan.map((laporan) => {
                       const isUploaded = laporan.status_upload === 'sudah_upload'
                       return (
                         <tr key={laporan.report_type_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4 font-medium text-slate-800 max-w-md">
                             <div className="flex items-center gap-2">
                               {isUploaded ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-slate-300" />}
                               <span className={isUploaded ? '' : 'text-slate-400 italic'}>{laporan.nama_laporan}</span>
                             </div>
                           </td>
                           
                           <td className="px-6 py-4">
                             {isUploaded && (
                               <span className={`px-2 py-1 rounded text-[0.65rem] font-bold tracking-wider uppercase ${laporan.status_ketepatan_waktu === 'Tepat Waktu' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                                 {laporan.status_ketepatan_waktu}
                               </span>
                             )}
                           </td>

                           <td className="px-6 py-4">
                              {isUploaded ? (
                                <span className={`px-2 py-1 rounded text-[0.65rem] font-bold tracking-wider uppercase 
                                  ${laporan.status_verifikasi === 'lengkap' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                                    laporan.status_verifikasi === 'revisi' ? 'bg-red-50 text-red-700 border border-red-200' : 
                                    'bg-amber-50 text-amber-700 border border-amber-200'}`}
                                >
                                  {laporan.status_verifikasi.replace('_', ' ')}
                                </span>
                              ) : <span className="text-slate-300">-</span>}
                           </td>

                           {isAdmin && (
                             <td className="px-6 py-4 text-right space-x-2">
                               {isUploaded && (
                                 <>
                                  <button onClick={() => handleDownload(laporan.submission_id)} className="btn btn-secondary py-1 px-2 text-xs" title="Unduh / Buka Dokumen">
                                    <Download size={14} />
                                  </button>
                                  <button onClick={() => setVerifyModal({ isOpen: true, data: { ...laporan, nama_satker: satker.nama_satker } })} className="btn btn-primary py-1 px-2 text-xs">
                                    Verifikasi
                                  </button>
                                 </>
                               )}
                             </td>
                           )}
                         </tr>
                       )
                     })}
                   </tbody>
                 </table>
               </div>
            </div>
          ))}
          {filteredSatkers.length === 0 && <div className="text-center py-10 text-slate-500">Data satuan kerja tidak ditemukan.</div>}
        </div>
      )}

      {/* VERIFY MODAL FOR ADMIN */}
      {isAdmin && verifyModal.isOpen && verifyModal.data && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
             <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShieldCheck size={18}/> Verifikasi Laporan</h3>
               <button onClick={() => setVerifyModal({ isOpen: false, data: null })} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             
             <form onSubmit={handleVerifySubmit} className="p-6 space-y-4">
                
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">{verifyModal.data.nama_satker}</p>
                  <p className="text-sm text-blue-900 leading-tight">{verifyModal.data.nama_laporan}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Keputusan Verifikasi</label>
                  <select 
                    required
                    value={statusVerif}
                    onChange={e => setStatusVerif(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="" disabled>-- Pilih Status --</option>
                    <option value="lengkap">✅ Lengkap & Sesuai</option>
                    <option value="revisi">❌ Revisi (Kirim Email Notifikasi)</option>
                  </select>
                </div>

                {statusVerif === 'revisi' && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Catatan Revisi / Kesalahan</label>
                    <textarea 
                      required
                      value={catatan}
                      onChange={e => setCatatan(e.target.value)}
                      placeholder="Jelaskan bagian mana yang perlu diperbaiki oleh satker..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none text-sm min-h-[100px]"
                    ></textarea>
                    <p className="text-[11px] text-red-500 ml-1 mt-1">Catatan ini akan dikirim via Email resmi satker.</p>
                  </div>
                )}

               <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                 <button type="button" onClick={() => setVerifyModal({ isOpen: false, data: null })} className="btn btn-secondary">Batal</button>
                 <button type="submit" disabled={verifyMutation.isPending} className="btn btn-primary">
                    {verifyMutation.isPending ? 'Memproses...' : 'Simpan Verifikasi'}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

    </div>
  )
}
