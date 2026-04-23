import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  X,
  Clock,
} from 'lucide-react';
import api from '../lib/axios';
import { useFocusTrap } from '../hooks/useFocusTrap';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * SatkerPortal.jsx
 * - Satker view to list 28 reports (report_types)
 * - Show upload status, ketepatan waktu, admin note
 * - Upload (field name 'dokumen_monev'), replace existing submission
 * - Download via pre-signed URL
 * - Delete own submissions
 *
 * Dependencies:
 * - react, react-query, lucide-react
 * - axios wrapper at ../lib/axios (must include Authorization header)
 */

/* Helper: month names */
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

  // upload modal state
  const [uploadModal, setUploadModal] = useState({
    open: false,
    reportTypeId: null,
    reportName: '',
    existingSubmissionId: null,
  });

  // file state and upload progress
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // feedback / status
  const [toastMsg, setToastMsg] = useState(null);

  // Accessible confirm dialog (replaces window.confirm)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, submissionId: null, reportName: '' });

  // Focus trap for upload modal
  const uploadModalRef = useFocusTrap(uploadModal.open);

  // Close upload modal on Escape
  useEffect(() => {
    if (!uploadModal.open) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') closeUploadModal(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [uploadModal.open]);

  // Fetch my progress (server returns list of report types with submission info)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-progress', bulan, tahun],
    queryFn: async () => {
      // axios wrapper returns response.data per project docs
      const res = await api.get(`/api/v1/reports/my-progress?bulan=${bulan}&tahun=${tahun}`);
      // res is expected to be array or { data: [...] } depending on wrapper; normalize:
      return res?.data ?? res;
    },
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Upload mutation (multipart/form-data) — field name must be 'dokumen_monev'
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
      setSelectedFile(null);
      setUploadProgress(0);
      setUploadModal({ open: false, reportTypeId: null, reportName: '', existingSubmissionId: null });
    },
    onError: (err) => {
      const message = err?.message || 'Gagal mengunggah file';
      setToastMsg({ type: 'error', text: message });
      setUploadProgress(0);
    },
  });

  // Delete mutation
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

  // download handler: obtains presigned url then opens in new tab/window
  const handleDownload = async (submissionId) => {
    try {
      const res = await api.get(`/api/v1/reports/${submissionId}/download`);
      // api wrapper may return data shape; normalize:
      const url = res?.data?.url ?? res?.url ?? res?.data ?? null;
      if (!url) {
        setToastMsg({ type: 'error', text: 'Tautan unduh tidak tersedia.' });
        return;
      }
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setToastMsg({ type: 'error', text: err?.message || 'Gagal mengambil tautan unduh' });
    }
  };

  // open upload modal for a report type
  const openUploadModal = (report) => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadModal({
      open: true,
      reportTypeId: report.report_type_id,
      reportName: report.nama_laporan,
      existingSubmissionId: report.submission_id ?? null,
    });
  };

  // close modal
  const closeUploadModal = () => {
    setUploadModal({ open: false, reportTypeId: null, reportName: '', existingSubmissionId: null });
    setSelectedFile(null);
    setUploadProgress(0);
  };

  // handle file selection
  const onFileChange = (file) => {
    if (!file) return;
    // validate mime & size (client-side)
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowed.includes(file.type)) {
      setToastMsg({ type: 'error', text: 'Format tidak didukung. Gunakan PDF atau XLSX.' });
      return;
    }
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      setToastMsg({ type: 'error', text: 'Ukuran file terlalu besar (maks 10MB).' });
      return;
    }
    setSelectedFile(file);
  };

  // drag handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFileChange(f);
  };

  // submit upload
  const submitUpload = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setToastMsg({ type: 'error', text: 'Pilih file terlebih dahulu.' });
      return;
    }
    if (!uploadModal.reportTypeId) {
      setToastMsg({ type: 'error', text: 'Report type tidak tersedia.' });
      return;
    }
    const fd = new FormData();
    // IMPORTANT: backend expects field 'dokumen_monev'
    fd.append('dokumen_monev', selectedFile);
    fd.append('report_type_id', String(uploadModal.reportTypeId));
    fd.append('periode_bulan', String(bulan));
    fd.append('periode_tahun', String(tahun));

    uploadMutation.mutate(fd);
  };

  // Open delete confirm dialog
  const confirmDelete = (submissionId, reportName) => {
    setConfirmDialog({ open: true, submissionId, reportName });
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate(confirmDialog.submissionId);
    setConfirmDialog({ open: false, submissionId: null, reportName: '' });
  };

  const handleCancelDelete = () => {
    setConfirmDialog({ open: false, submissionId: null, reportName: '' });
  };

  // auto clear toast
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 5000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // normalize fetched report list
  const reports = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Portal Satker — Unggah Laporan</h1>
          <p className="text-sm text-gray-300">Periode: <span className="font-semibold">{MONTHS[parseInt(bulan) - 1]} {tahun}</span></p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="portal-bulan" className="sr-only">Filter Bulan</label>
          <select
            id="portal-bulan"
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="bg-slate-800 border border-white/6 text-sm px-3 py-2 rounded-md"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <label htmlFor="portal-tahun" className="sr-only">Filter Tahun</label>
          <select
            id="portal-tahun"
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="bg-slate-800 border border-white/6 text-sm px-3 py-2 rounded-md"
          >
            {Array.from({ length: 5 }).map((_, idx) => {
              const y = now.getFullYear() - 2 + idx;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
      </div>

      {/* status row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-white/6 rounded-lg">
          <div className="text-xs text-gray-400">Total Jenis Laporan</div>
          <div className="text-2xl font-bold">{reports.length}</div>
        </div>
        <div className="p-4 bg-slate-900 border border-white/6 rounded-lg">
          <div className="text-xs text-gray-400">Terunggah</div>
          <div className="text-2xl font-bold">
            {reports.reduce((acc, r) => acc + (r.submission_id ? 1 : 0), 0)}
          </div>
        </div>
        <div className="p-4 bg-slate-900 border border-white/6 rounded-lg">
          <div className="text-xs text-gray-400">Belum Lengkap</div>
          <div className="text-2xl font-bold">
            {reports.reduce((acc, r) => acc + (r.submission_id ? 0 : 1), 0)}
          </div>
        </div>
      </div>

      {/* reports grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-gray-400">Memuat daftar laporan…</div>
        ) : isError ? (
          <div className="col-span-full text-center py-8 text-red-400">Error: {error?.message ?? 'Gagal memuat data'}</div>
        ) : reports.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-400">Daftar laporan tidak ditemukan.</div>
        ) : (
          reports.map((r) => {
            const uploaded = !!r.submission_id;
            const ketepatan = r.status_ketepatan_waktu; // 'Tepat Waktu' | 'Terlambat' | null
            return (
              <div key={r.report_type_id} className="p-5 bg-slate-900 border border-white/6 rounded-lg flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-2">{r.is_wajib ? 'Wajib' : 'Opsional'}</div>
                    <h3 className={`text-sm font-semibold ${uploaded ? 'text-white' : 'text-gray-300 italic'}`}>{r.nama_laporan}</h3>
                  </div>
                  <div className="text-right">
                    {uploaded ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-xs text-green-400 font-semibold">Terunggah</div>
                        <div className="text-[11px] text-gray-400">{new Date(r.created_at).toLocaleDateString('id-ID')}</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-xs text-gray-400 font-semibold">Belum Upload</div>
                        <div className="text-[11px] text-gray-500 italic">Silakan unggah dokumen</div>
                      </div>
                    )}
                  </div>
                </div>

                {r.catatan_admin && (
                  <div className="mt-4 p-3 bg-orange-50 text-orange-700 rounded-md text-sm">
                    Catatan Admin: {r.catatan_admin}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {ketepatan ? (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${ketepatan === 'Tepat Waktu' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                        {ketepatan}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {uploaded && (
                      <>
                        <button
                          onClick={() => handleDownload(r.submission_id)}
                          title="Unduh"
                          aria-label={`Unduh laporan ${r.nama_laporan}`}
                          className="p-2 rounded-md bg-slate-800 hover:bg-slate-700"
                        >
                          <Download size={16} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => confirmDelete(r.submission_id, r.nama_laporan)}
                          title="Hapus"
                          aria-label={`Hapus laporan ${r.nama_laporan}`}
                          className="p-2 rounded-md bg-red-700/20 hover:bg-red-700/30 text-red-400"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openUploadModal(r)}
                      aria-label={uploaded ? `Timpa berkas laporan ${r.nama_laporan}` : `Unggah laporan ${r.nama_laporan}`}
                      className={`px-3 py-1.5 rounded-md font-semibold ${uploaded ? 'bg-amber-600 text-slate-900' : 'bg-emerald-600 text-white'}`}
                    >
                      {uploaded ? 'Timpa Berkas' : 'Unggah'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload modal */}
      {uploadModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeUploadModal}>
          <div
            className="w-full max-w-lg bg-slate-900 border border-white/6 rounded-2xl p-6"
            ref={uploadModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 id="upload-modal-title" className="text-lg font-bold">{uploadModal.reportName}</h3>
                <p className="text-sm text-gray-400">Periode {MONTHS[parseInt(bulan) - 1]} {tahun}</p>
              </div>
              <button
                onClick={closeUploadModal}
                aria-label="Tutup dialog unggah"
                className="p-2 rounded-md hover:bg-white/5"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={submitUpload} className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Area unggah file. Klik atau tekan Enter untuk memilih file, atau tarik file ke sini."
                className={`border-2 ${isDragging ? 'border-blue-500 bg-white/5' : 'border-dashed border-white/10'} rounded-lg p-6 text-center transition-all cursor-pointer`}
              >
                <UploadCloud size={36} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
                <div className="text-sm text-gray-300 mb-1">Tarik &amp; lepas file di sini, atau klik untuk memilih</div>
                <div className="text-xs text-gray-500">Format: PDF atau XLSX · Maks 10MB</div>
                <input
                  ref={fileInputRef}
                  id="file-upload-input"
                  type="file"
                  accept=".pdf,.xlsx"
                  aria-label="Pilih file dokumen (PDF atau XLSX, maks 10MB)"
                  className="hidden"
                  onChange={(e) => onFileChange(e.target.files?.[0])}
                />
                {selectedFile && (
                  <div className="mt-3 text-sm text-left text-gray-200">
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate">{selectedFile.name}</div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} aria-label="Hapus file terpilih" className="text-sm text-gray-400">Hapus</button>
                    </div>
                    <div
                      className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={uploadProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progress unggah: ${uploadProgress}%`}
                    >
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${uploadProgress}%`, transition: 'width 300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeUploadModal} className="px-4 py-2 rounded-md bg-white/5">Batal</button>
                <button
                  type="submit"
                  disabled={uploadMutation.isLoading || !selectedFile}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white font-semibold disabled:opacity-60"
                >
                  {uploadMutation.isLoading ? 'Uploading…' : uploadModal.existingSubmissionId ? 'Timpa & Simpan' : 'Unggah & Simpan'}
                </button>
              </div>
            </form>

            {toastMsg && (
              <div className={`mt-4 p-3 rounded-md ${toastMsg.type === 'error' ? 'bg-red-700/10 text-red-300' : 'bg-emerald-700/10 text-emerald-300'}`}>
                {toastMsg.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastMsg && (
        <div
          role={toastMsg.type === 'error' ? 'alert' : 'status'}
          aria-live={toastMsg.type === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-6 right-6 z-60 p-3 rounded-md shadow-lg ${
            toastMsg.type === 'error'
              ? 'bg-red-900/80 text-red-200 border border-red-700'
              : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
          }`}
        >
          {toastMsg.text}
        </div>
      )}
      {/* Accessible delete confirm dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title="Hapus Laporan"
        message={`Yakin ingin menghapus "${confirmDialog.reportName}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

    </div>
  );
}