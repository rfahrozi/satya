import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UploadCloud, CheckCircle, AlertCircle, FileText, Clock, ChevronRight, Download, X } from 'lucide-react'
import api from '../lib/axios'

export default function SatkerPortal() {
  const queryClient = useQueryClient()
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const [bulan, setBulan] = useState(currentMonth.toString())
  const [tahun, setTahun] = useState(currentYear.toString())

  // Modal State for Upload
  const [uploadModal, setUploadModal] = useState({ isOpen: false, reportId: null, reportName: '' })
  const [file, setFile] = useState(null)

  // Fetch Data
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-progress', bulan, tahun],
    queryFn: () => api.get(`/reports/my-progress?bulan=${bulan}&tahun=${tahun}`),
  })

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (formData) => api.post('/reports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-progress', bulan, tahun] })
      setUploadModal({ isOpen: false, reportId: null, reportName: '' })
      setFile(null)
      alert("Berhasil diunggah!")
    },
    onError: (err) => {
      alert(err.message)
    }
  })

  const handleUploadSubmit = (e) => {
    e.preventDefault()
    if (!file) return alert("Pilih file PDF/Excel dahulu")
    
    const formData = new FormData()
    formData.append('document', file)
    formData.append('report_type_id', uploadModal.reportId)
    formData.append('periode_bulan', bulan)
    formData.append('periode_tahun', tahun)
    
    uploadMutation.mutate(formData)
  }

  // Helper untuk rendering status
  const getBadgeStyle = (status_verifikasi, submission_id, isKetepatan) => {
    if (isKetepatan) {
       return status_verifikasi === 'Tepat Waktu' 
        ? 'bg-blue-100 text-blue-800' 
        : 'bg-orange-100 text-orange-800'
    }

    if (!submission_id) return 'bg-slate-100 text-slate-500 border border-slate-200'
    switch (status_verifikasi) {
      case 'lengkap': return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      case 'revisi': return 'bg-red-100 text-red-800 border border-red-200'
      case 'belum_lengkap': return 'bg-amber-100 text-amber-800 border border-amber-200'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const reports = data?.data || []

  return (
    <div className="space-y-6">
      
      {/* Header & Filter */}
      <div className="card p-6 border-b-4 border-b-primary-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Laporan Kewajiban Satker</h2>
            <p className="text-sm text-slate-500">Unggah dan pantau status kelengkapan laporan Anda sesuai periode.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={bulan} 
              onChange={e => setBulan(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i+1} value={i+1}>Bulan {i+1}</option>
              ))}
            </select>

            <select 
              value={tahun} 
              onChange={e => setTahun(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              {[currentYear-1, currentYear, currentYear+1].map(y => (
                <option key={y} value={y}>Tahun {y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-12 text-slate-400">Memuat data...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error.message}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const hasUploaded = !!report.submission_id;

            return (
              <div key={report.report_type_id} className={`card p-5 border-l-4 transition-all hover:shadow-md ${hasUploaded ? 'border-l-emerald-500' : 'border-l-slate-300'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-2 py-1 rounded text-[0.65rem] font-bold uppercase tracking-wider ${getBadgeStyle(report.status_verifikasi, report.submission_id)}`}>
                    {!hasUploaded ? 'Belum Upload' : report.status_verifikasi.replace('_', ' ')}
                  </div>
                  
                  {report.status_ketepatan_waktu && (
                    <div className={`px-2 py-1 rounded text-[0.65rem] font-bold tracking-wider ${getBadgeStyle(report.status_ketepatan_waktu, true, true)}`}>
                      {report.status_ketepatan_waktu}
                    </div>
                  )}
                </div>

                <h3 className="font-semibold text-slate-800 text-sm mb-4 leading-tight min-h-[40px]">
                  {report.nama_laporan}
                </h3>

                {report.catatan_admin && (
                   <div className="bg-orange-50 border border-orange-100 text-orange-800 text-xs p-3 rounded-lg mb-4 flex gap-2">
                     <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>
                     <span className="italic leading-relaxed">{report.catatan_admin}</span>
                   </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                  
                  {hasUploaded ? (
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Terunggah ({new Date(report.created_at).toLocaleDateString('id-ID')})
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Menunggu unggahan
                    </div>
                  )}

                  <button 
                    onClick={() => setUploadModal({ isOpen: true, reportId: report.report_type_id, reportName: report.nama_laporan })}
                    className={`btn text-xs px-3 py-1.5 rounded-md ${hasUploaded ? 'btn-secondary' : 'btn-primary'}`}
                  >
                    {hasUploaded ? 'Timpa Berkas' : 'Unggah'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL UPLOAD */}
      {uploadModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
             <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
               <h3 className="font-bold text-slate-800 line-clamp-1 pr-4">{uploadModal.reportName}</h3>
               <button onClick={() => setUploadModal({ isOpen: false })} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             
             <form onSubmit={handleUploadSubmit} className="p-6">
               <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                 <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                 <p className="text-sm text-slate-600 mb-2">Pilih dokumen valid untuk diunggah</p>
                 <p className="text-xs text-slate-400 mb-4">Format disetujui: PDF, Excel (.xlsx)</p>
                 <label className="btn btn-secondary cursor-pointer">
                   Pilih File
                   <input type="file" accept=".pdf,.xls,.xlsx" className="hidden" onChange={e => setFile(e.target.files[0])} />
                 </label>
                 {file && <div className="mt-4 text-sm font-medium text-blue-600 break-all bg-blue-50 p-2 rounded">{file.name}</div>}
               </div>

               <div className="mt-6 flex justify-end gap-3">
                 <button type="button" onClick={() => setUploadModal({ isOpen: false })} className="btn btn-secondary">Batal</button>
                 <button type="submit" disabled={uploadMutation.isPending || !file} className="btn btn-primary">
                    {uploadMutation.isPending ? 'Mengunggah...' : 'Upload Dokumen'}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

    </div>
  )
}
