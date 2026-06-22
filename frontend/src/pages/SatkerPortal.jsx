import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  X,
  History,
  Search,
  Filter
} from 'lucide-react';
import api from '../lib/axios';
import { useFocusTrap } from '../hooks/useFocusTrap';
import ConfirmDialog from '../components/ConfirmDialog';
import HistoryModal from '../components/HistoryModal';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function SatkerPortal() {
  const queryClient = useQueryClient();

  // default to current period
  const now = new Date();
  const [bulan, setBulan] = useState(String(now.getMonth() + 1));
  const [tahun, setTahun] = useState(String(now.getFullYear()));

  // UI state for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('semua'); // 'semua', 'belum_upload', 'sudah_upload'

  // upload modal state
  const [uploadModal, setUploadModal] = useState({
    open: false,
    reportTypeId: null,
    reportName: '',
    existingSubmissionId: null,
  });

  const [selectedFilePdf, setSelectedFilePdf] = useState(null);
  const [selectedFileExcel, setSelectedFileExcel] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [isDraggingExcel, setIsDraggingExcel] = useState(false);
  const fileInputPdfRef = useRef(null);
  const fileInputExcelRef = useRef(null);

  const [toastMsg, setToastMsg] = useState(null);

  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const openHistory = (submissionId) => {
    setSelectedHistoryId(submissionId);
    setIsHistoryModalOpen(true);
  };
  const closeHistory = () => {
    setIsHistoryModalOpen(false);
    setSelectedHistoryId(null);
  };

  const [confirmDialog, setConfirmDialog] = useState({ open: false, submissionId: null, reportName: '' });
  const uploadModalRef = useFocusTrap(uploadModal.open);

  useEffect(() => {
    if (!uploadModal.open) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') closeUploadModal(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [uploadModal.open]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-progress', bulan, tahun],
    queryFn: async () => {
      const res = await api.get(`/api/v1/reports/my-progress?bulan=${bulan}&tahun=${tahun}`);
      return res?.data ?? res;
    },
    staleTime: 1000 * 60 * 1,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData) =>
      api.post('/api/v1/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(pct);
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-progress', bulan, tahun] });
      setToastMsg({ type: 'success', text: 'Unggah berhasil.' });
      closeUploadModal();
    },
    onError: (err) => {
      setToastMsg({ type: 'error', text: err?.message || 'Gagal mengunggah file' });
      setUploadProgress(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (submissionId) => api.delete(`/api/v1/reports/${submissionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-progress', bulan, tahun] });
      setToastMsg({ type: 'success', text: 'Laporan dihapus.' });
    },
    onError: (err) => {
      setToastMsg({ type: 'error', text: err?.message || 'Gagal menghapus laporan' });
    },
  });

  const handleDownloadPdf = async (submissionId) => {
    try {
      const res = await api.get(`/api/v1/reports/${submissionId}/download?type=pdf`);
      const url = res?.data?.url ?? res?.url ?? res?.data ?? null;
      if (url) window.open(url, '_blank', 'noopener');
    } catch (err) {}
  };
  const handleDownloadExcel = async (submissionId) => {
    try {
      const res = await api.get(`/api/v1/reports/${submissionId}/download?type=excel`);
      const url = res?.data?.url ?? res?.url ?? res?.data ?? null;
      if (url) window.open(url, '_blank', 'noopener');
    } catch (err) {}
  };

  const openUploadModal = (report) => {
    setSelectedFilePdf(null);
    setSelectedFileExcel(null);
    setUploadProgress(0);
    setUploadModal({
      open: true,
      reportTypeId: report.report_type_id,
      reportName: report.nama_laporan,
      existingSubmissionId: report.submission_id ?? null,
    });
  };

  const closeUploadModal = () => {
    setUploadModal({ open: false, reportTypeId: null, reportName: '', existingSubmissionId: null });
    setSelectedFilePdf(null);
    setSelectedFileExcel(null);
    setUploadProgress(0);
  };

  const onFileChangePdf = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') return setToastMsg({ type: 'error', text: 'Format tidak didukung. Gunakan PDF atau XLSX.' });
    if (f.size > 10 * 1024 * 1024) return setToastMsg({ type: 'error', text: 'Ukuran file terlalu besar (maks 10MB).' });
    setSelectedFilePdf(f);
  };
  const onFileChangeExcel = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls') && !f.type.includes('spreadsheet') && !f.type.includes('excel')) {
      return setToastMsg({ type: 'error', text: 'Format tidak didukung. Gunakan PDF atau XLSX.' });
    }
    if (f.size > 10 * 1024 * 1024) return setToastMsg({ type: 'error', text: 'Ukuran file terlalu besar (maks 10MB).' });
    setSelectedFileExcel(f);
  };

  const handleDragOverPdf = (e) => { e.preventDefault(); setIsDraggingPdf(true); };
  const handleDragLeavePdf = (e) => { e.preventDefault(); setIsDraggingPdf(false); };
  const handleDropPdf = (e) => { e.preventDefault(); setIsDraggingPdf(false); const f = e.dataTransfer.files?.[0]; if (f) onFileChangePdf(f); };

  const handleDragOverExcel = (e) => { e.preventDefault(); setIsDraggingExcel(true); };
  const handleDragLeaveExcel = (e) => { e.preventDefault(); setIsDraggingExcel(false); };
  const handleDropExcel = (e) => { e.preventDefault(); setIsDraggingExcel(false); const f = e.dataTransfer.files?.[0]; if (f) onFileChangeExcel(f); };

  const submitUpload = (e) => {
    e.preventDefault();
    if (!selectedFilePdf || !selectedFileExcel) return setToastMsg({ type: 'error', text: 'Pilih file PDF dan Excel terlebih dahulu.' });
    const fd = new FormData();
    fd.append('dokumen_monev', selectedFilePdf);
    fd.append('dokumen_excel', selectedFileExcel);
    fd.append('report_type_id', String(uploadModal.reportTypeId));
    fd.append('periode_bulan', String(bulan));
    fd.append('periode_tahun', String(tahun));
    uploadMutation.mutate(fd);
  };

  const confirmDelete = (submissionId, reportName) => setConfirmDialog({ open: true, submissionId, reportName });
  const handleConfirmDelete = () => { deleteMutation.mutate(confirmDialog.submissionId); handleCancelDelete(); };
  const handleCancelDelete = () => setConfirmDialog({ open: false, submissionId: null, reportName: '' });

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 5000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const reports = Array.isArray(data) ? data : (data?.data ?? []);

  // Filter Data
  const filteredReports = reports.filter(r => {
    const matchSearch = r.nama_laporan.toLowerCase().includes(searchQuery.toLowerCase());
    const uploaded = !!r.submission_id;
    const matchStatus = filterStatus === 'semua' ? true :
                        filterStatus === 'belum_upload' ? !uploaded :
                        filterStatus === 'sudah_upload' ? uploaded : true;
    return matchSearch && matchStatus;
  });

  // Group Data
  const wajibReports = filteredReports.filter(r => r.is_wajib);
  const opsionalReports = filteredReports.filter(r => !r.is_wajib);

  // Helper for deadline
  const renderDeadline = (deadlineDateStr, uploaded) => {
    if (!deadlineDateStr) return null;
    if (uploaded) return null; // don't show deadline if already uploaded

    const deadline = new Date(deadlineDateStr);
    const today = new Date();
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <div className="text-[11px] text-red-500 font-bold mt-1.5">Terlambat {Math.abs(diffDays)} Hari</div>;
    } else if (diffDays <= 3) {
      return <div className="text-[11px] text-amber-500 font-bold mt-1.5">Jatuh Tempo: Sisa {diffDays} Hari</div>;
    } else {
      return <div className="text-[11px] text-gray-400 mt-1.5">Batas Unggah: {deadline.toLocaleDateString('id-ID')}</div>;
    }
  };

  const totalReports = reports.length;
  const totalUploaded = reports.filter(r => !!r.submission_id).length;
  const progressPct = totalReports === 0 ? 0 : Math.round((totalUploaded / totalReports) * 100);

  // Render a Report Card
  const renderCard = (r) => {
    const uploaded = !!r.submission_id;
    const ketepatan = r.status_ketepatan_waktu; 
    return (
      <div key={r.report_type_id} className="p-5 bg-slate-900 border border-white/5 rounded-xl flex flex-col shadow-sm transition-all hover:border-white/10 hover:bg-slate-900/80">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex gap-2 mb-2 items-center">
              <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full tracking-wider ${r.is_wajib ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
                {r.is_wajib ? 'Wajib' : 'Opsional'}
              </span>
              {uploaded ? (
                 <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-emerald-500/20 text-emerald-400">Terunggah</span>
              ) : (
                 <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-red-500/20 text-red-400">Belum Upload</span>
              )}
            </div>
            <h3 className={`text-sm font-semibold leading-snug ${uploaded ? 'text-white' : 'text-gray-300'}`}>{r.nama_laporan}</h3>
            {renderDeadline(r.deadline_date, uploaded)}
          </div>
          <div className="text-right whitespace-nowrap pt-1">
            {uploaded && <div className="text-[11px] text-gray-400">{new Date(r.created_at).toLocaleDateString('id-ID')}</div>}
          </div>
        </div>

        {r.catatan_admin && (
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded-lg text-sm">
            <strong className="block mb-0.5">Catatan Admin:</strong> 
            <span className="text-orange-200/90">{r.catatan_admin}</span>
          </div>
        )}

        <div className="mt-auto pt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {ketepatan && (
              <span className={`px-2 py-1 rounded-md text-[11px] font-semibold ${ketepatan === 'Tepat Waktu' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>
                {ketepatan}
              </span>
            )}
            {r.nilai_angka !== null && r.nilai_angka !== undefined && (
              <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300">
                Nilai: {r.nilai_angka}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {uploaded && (
              <>
                <button onClick={() => openHistory(r.submission_id)} title="Riwayat" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition-colors">
                  <History size={16} />
                </button>
                <button onClick={() => handleDownloadPdf(r.submission_id)} title="Unduh PDF" className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                  <Download size={16} />
                </button>
                <button onClick={() => handleDownloadExcel(r.submission_id)} title="Unduh Excel" className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors">
                  <Download size={16} />
                </button>
                <button onClick={() => confirmDelete(r.submission_id, r.nama_laporan)} title="Hapus" className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button
              onClick={() => openUploadModal(r)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${uploaded ? 'border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'}`}
            >
              {uploaded ? 'Perbarui' : 'Unggah'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Portal Satker — Unggah Laporan</h1>
          <p className="text-sm text-gray-400">Kelola dan unggah laporan periode <span className="font-semibold text-white">{MONTHS[parseInt(bulan) - 1]} {tahun}</span></p>
        </div>

        <div className="flex items-center gap-3">
          <select value={bulan} onChange={(e) => setBulan(e.target.value)} className="bg-slate-900 border border-white/10 text-sm px-4 py-2.5 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-white cursor-pointer hover:border-white/20 transition-colors">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={tahun} onChange={(e) => setTahun(e.target.value)} className="bg-slate-900 border border-white/10 text-sm px-4 py-2.5 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-white cursor-pointer hover:border-white/20 transition-colors">
            {Array.from({ length: 5 }).map((_, idx) => {
              const y = now.getFullYear() - 2 + idx;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Progress Bar & Summary */}
      <div className="p-6 bg-slate-900 border border-white/5 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 relative z-10 gap-2">
          <div>
            <div className="text-sm font-semibold text-white mb-1">Progress Kepatuhan</div>
            <div className="text-sm text-gray-400">Telah mengunggah <strong className="text-white">{totalUploaded}</strong> dari total <strong className="text-white">{totalReports}</strong> laporan yang tersedia.</div>
          </div>
          <div className="text-4xl font-bold text-emerald-400 tracking-tight">{progressPct}%</div>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-white/5 relative z-10 shadow-inner">
          <div className="h-full bg-linear-to-r from-emerald-600 to-emerald-400 rounded-full relative" style={{ width: `${progressPct}%`, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-white/5">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama laporan..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors text-white placeholder-gray-500"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter size={18} className="text-gray-500 hidden sm:block" />
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer text-white"
          >
            <option value="semua">Tampilkan Semua Status</option>
            <option value="belum_upload">Belum Terunggah</option>
            <option value="sudah_upload">Sudah Terunggah</option>
          </select>
        </div>
      </div>

      {/* reports grid */}
      <div>
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            Memuat daftar laporan...
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-red-400 bg-red-900/10 rounded-xl border border-red-900/20">
            <AlertCircle className="mx-auto mb-2" size={32} />
            Error: {error?.message ?? 'Gagal memuat data laporan.'}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-dashed border-white/10 text-gray-400">
            <Search className="mx-auto mb-3 opacity-20" size={40} />
            Tidak ada laporan yang sesuai dengan kriteria pencarian/filter Anda.
          </div>
        ) : (
          <div className="space-y-10">
            {wajibReports.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2 border-b border-white/5 pb-2">
                  <div className="w-2 h-6 bg-amber-500 rounded-sm"></div>
                  Laporan Wajib
                  <span className="ml-2 px-2.5 py-0.5 rounded-full bg-white/5 text-xs font-semibold text-gray-400">{wajibReports.length}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {wajibReports.map(renderCard)}
                </div>
              </div>
            )}

            {opsionalReports.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2 border-b border-white/5 pb-2">
                  <div className="w-2 h-6 bg-slate-600 rounded-sm"></div>
                  Laporan Opsional
                  <span className="ml-2 px-2.5 py-0.5 rounded-full bg-white/5 text-xs font-semibold text-gray-400">{opsionalReports.length}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {opsionalReports.map(renderCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {uploadModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={closeUploadModal}>
          <div
            className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl m-4"
            ref={uploadModalRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6 border-b border-white/5 pb-4">
              <div className="pr-4">
                <h3 className="text-lg font-bold leading-tight mb-1.5 text-white">{uploadModal.reportName}</h3>
                <p className="text-sm text-emerald-400 font-medium">Periode {MONTHS[parseInt(bulan) - 1]} {tahun}</p>
              </div>
              <button onClick={closeUploadModal} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitUpload} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div
                  onDragOver={handleDragOverPdf}
                  onDragLeave={handleDragLeavePdf}
                  onDrop={handleDropPdf}
                  onClick={() => fileInputPdfRef.current?.click()}
                  className={`border-2 ${isDraggingPdf ? 'border-red-500 bg-red-500/10' : 'border-dashed border-white/10 hover:border-red-500/50 hover:bg-white/5'} rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[150px]`}
                >
                  <UploadCloud size={32} className="text-red-400 mb-3" />
                  <div className="text-sm font-medium text-gray-200 mb-1">Dokumen PDF</div>
                  <div className="text-[11px] text-gray-500">Maks 10MB</div>
                  <input ref={fileInputPdfRef} type="file" accept=".pdf" className="hidden" onChange={(e) => onFileChangePdf(e.target.files?.[0])} />
                  {selectedFilePdf && (
                    <div className="mt-4 text-xs w-full bg-slate-800 rounded-lg p-2.5 flex items-center justify-between border border-white/5">
                      <span className="truncate text-gray-300 pr-2 font-medium">{selectedFilePdf.name}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFilePdf(null); }} className="text-red-400 hover:text-red-300 p-1">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div
                  onDragOver={handleDragOverExcel}
                  onDragLeave={handleDragLeaveExcel}
                  onDrop={handleDropExcel}
                  onClick={() => fileInputExcelRef.current?.click()}
                  className={`border-2 ${isDraggingExcel ? 'border-green-500 bg-green-500/10' : 'border-dashed border-white/10 hover:border-green-500/50 hover:bg-white/5'} rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[150px]`}
                >
                  <UploadCloud size={32} className="text-green-400 mb-3" />
                  <div className="text-sm font-medium text-gray-200 mb-1">Data Excel</div>
                  <div className="text-[11px] text-gray-500">Maks 10MB (.xlsx)</div>
                  <input ref={fileInputExcelRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onFileChangeExcel(e.target.files?.[0])} />
                  {selectedFileExcel && (
                    <div className="mt-4 text-xs w-full bg-slate-800 rounded-lg p-2.5 flex items-center justify-between border border-white/5">
                      <span className="truncate text-gray-300 pr-2 font-medium">{selectedFileExcel.name}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFileExcel(null); }} className="text-green-400 hover:text-green-300 p-1">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {(selectedFilePdf || selectedFileExcel) && uploadProgress > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium text-gray-300">
                    <span>Sedang Mengunggah...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${uploadProgress}%`, transition: 'width 300ms' }} />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={closeUploadModal} className="px-5 py-2.5 rounded-lg bg-transparent text-gray-300 hover:bg-white/5 transition-colors text-sm font-medium">Batal</button>
                <button
                  type="submit"
                  disabled={uploadMutation.isLoading || !selectedFilePdf || !selectedFileExcel}
                  className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20 text-sm flex items-center gap-2"
                >
                  {uploadMutation.isLoading ? 'Uploading...' : uploadModal.existingSubmissionId ? 'Timpa & Simpan' : 'Unggah Dokumen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className={`fixed bottom-8 right-8 z-60 px-5 py-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 ${
            toastMsg.type === 'error' ? 'bg-slate-900 text-red-200 border-red-900/50' : 'bg-slate-900 text-emerald-200 border-emerald-900/50'
          }`}
        >
          {toastMsg.type === 'error' ? <AlertCircle size={20} className="text-red-500" /> : <CheckCircle2 size={20} className="text-emerald-500" />}
          <span className="text-sm font-medium">{toastMsg.text}</span>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title="Hapus Laporan"
        message={`Yakin ingin menghapus dokumen "${confirmDialog.reportName}"? Tindakan ini tidak dapat dibatalkan dan nilai/verifikasi akan hilang.`}
        confirmLabel="Ya, Hapus Dokumen"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {isHistoryModalOpen && selectedHistoryId && (
        <HistoryModal submissionId={selectedHistoryId} onClose={closeHistory} />
      )}
    </div>
  );
}