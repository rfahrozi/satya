// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  Search,
  ShieldCheck,
  PieChart,
  Users,
  FileWarning,
} from 'lucide-react';
import api from '../lib/axios'; // axios wrapper that injects JWT

const MONTHS = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function ProgressBar({ value = 0, max = 1, label = '' }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  const colorClass = pct === 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label}: ${pct}%` : `${pct}%`}
      >
        <div className={`${colorClass} h-full rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs font-semibold text-slate-300 w-10 text-right" aria-hidden="true">{pct}%</div>
    </div>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('satya_user') || 'null') || {};
  const isAdmin = user.role === 'ADMIN_PT';

  const now = new Date();
  const [bulan, setBulan] = useState(String(now.getMonth() + 1));
  const [tahun, setTahun] = useState(String(now.getFullYear()));
  const [search, setSearch] = useState('');

  // Verify modal state
  const [verifyModal, setVerifyModal] = useState({ open: false, data: null });
  const [statusVerif, setStatusVerif] = useState('');
  const [catatan, setCatatan] = useState('');
  const [formError, setFormError] = useState('');
  // In-page toast replaces window.alert()
  const [toast, setToast] = useState(null);

  // Focus trap for verify modal
  const verifyModalRef = useFocusTrap(verifyModal.open);

  // Auto-dismiss toast after 5 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Close modal on Escape
  useEffect(() => {
    if (!verifyModal.open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setVerifyModal({ open: false, data: null });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [verifyModal.open]);

  // Fetch the dashboard aggregation
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', bulan, tahun],
    queryFn: async () => {
      // api.get should return the backend payload according to your api wrapper
      // Backend returns: { success: true, data: [ ...satkers ] }
      const resp = await api.get(`/api/v1/reports/dashboard-agregat?bulan=${bulan}&tahun=${tahun}`);
      // If api wrapper already returns response.data, adapt accordingly:
      // const payload = resp?.data ?? resp;
      // return payload.data ?? payload;
      return resp?.data ?? resp;
    },
    keepPreviousData: true,
  });

  const satkers = Array.isArray(dashboardData) ? dashboardData : (dashboardData?.data ?? []);
  const filtered = satkers.filter(s => s.nama_satker.toLowerCase().includes(search.toLowerCase()));

  // Mutation: verify report
  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, catatanAdmin }) => {
      // expected backend payload: { status_verifikasi, catatan_admin }
      return api.patch(`/api/v1/reports/${id}/verify`, {
        status_verifikasi: status,
        catatan_admin: catatanAdmin || null,
      });
    },
    onSuccess: () => {
      // Refresh dashboard aggregate
      queryClient.invalidateQueries({ queryKey: ['dashboard', bulan, tahun] });
    },
  });

  const handleDownload = async (submissionId) => {
    try {
      const res = await api.get(`/api/v1/reports/${submissionId}/download`);
      const url = res?.data?.url ?? res?.url ?? res?.data?.url ?? res?.url;
      if (url) window.open(url, '_blank');
      else setToast({ type: 'error', text: 'Tautan unduh tidak tersedia dari server.' });
    } catch (err) {
      setToast({ type: 'error', text: err.message || 'Gagal mengunduh file.' });
    }
  };

  const openVerifyModal = (laporan) => {
    setVerifyModal({ open: true, data: laporan });
    setStatusVerif('');
    setCatatan('');
    setFormError('');
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!statusVerif) {
      setFormError('Pilih status verifikasi terlebih dahulu.');
      return;
    }
    // If status is revisi, catatan is required
    if (statusVerif === 'revisi' && (!catatan || catatan.trim().length < 5)) {
      setFormError('Catatan revisi minimal 5 karakter.');
      return;
    }
    try {
      await verifyMutation.mutateAsync({
        id: verifyModal.data.submission_id,
        status: statusVerif,
        catatanAdmin: catatan,
      });
      // On success show confirmation and close modal shortly
      setVerifyModal({ open: false, data: null });
      setStatusVerif('');
      setCatatan('');
      setToast({ type: 'success', text: 'Verifikasi tersimpan. Notifikasi akan dikirim oleh worker.' });
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan verifikasi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard Monitoring</h1>
          <p className="text-sm text-slate-400">{MONTHS[parseInt(bulan)]} {tahun} — Agregat kepatuhan pelaporan</p>
        </div>

        <div className="flex items-center gap-2 pt-3 sm:pt-0">
          <label htmlFor="filter-bulan" className="sr-only">Filter Bulan</label>
          <select
            id="filter-bulan"
            value={bulan}
            onChange={e => setBulan(e.target.value)}
            className="bg-slate-800 border border-white/6 px-3 py-2 rounded-md text-sm"
          >
            {MONTHS.slice(1).map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
          </select>
          <label htmlFor="filter-tahun" className="sr-only">Filter Tahun</label>
          <select
            id="filter-tahun"
            value={tahun}
            onChange={e => setTahun(e.target.value)}
            className="bg-slate-800 border border-white/6 px-3 py-2 rounded-md text-sm"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 p-4 rounded-xl border border-white/6 focus:outline-none focus:ring-2 focus:ring-blue-500" tabIndex={0} aria-label={`Total Satuan Kerja: ${satkers.length}`}>
          <div className="text-xs text-slate-400" aria-hidden="true">Satuan Kerja</div>
          <div className="text-2xl font-bold" aria-hidden="true">{satkers.length}</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-white/6 focus:outline-none focus:ring-2 focus:ring-blue-500" tabIndex={0} aria-label={`Jenis laporan wajib: ${satkers[0]?.statistik?.total_wajib ?? 0}`}>
          <div className="text-xs text-slate-400" aria-hidden="true">Jenis laporan (wajib)</div>
          <div className="text-2xl font-bold" aria-hidden="true">{satkers[0]?.statistik?.total_wajib ?? '-'}</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-white/6 focus:outline-none focus:ring-2 focus:ring-blue-500" tabIndex={0} aria-label={`Total laporan diunggah periode ini: ${satkers.reduce((a, s) => a + parseInt(s.statistik?.total_upload || 0), 0)}`}>
          <div className="text-xs text-slate-400" aria-hidden="true">Total Upload (periode)</div>
          <div className="text-2xl font-bold" aria-hidden="true">{satkers.reduce((a, s) => a + parseInt(s.statistik?.total_upload || 0), 0)}</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-white/6 focus:outline-none focus:ring-2 focus:ring-blue-500" tabIndex={0} aria-label={`Rata-rata kepatuhan: ${satkers.length ? Math.round(satkers.reduce((a, s) => a + parseFloat(s.statistik?.persentase_kepatuhan || 0), 0) / satkers.length) : 0} persen`}>
          <div className="text-xs text-slate-400" aria-hidden="true">Rata-rata kepatuhan</div>
          <div className="text-2xl font-bold" aria-hidden="true">
            {satkers.length ? Math.round(satkers.reduce((a, s) => a + parseFloat(s.statistik?.persentase_kepatuhan || 0), 0) / satkers.length) : 0}%
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md relative">
        <label htmlFor="search-satker" className="sr-only">Cari Satuan Kerja</label>
        <Search className="absolute left-3 top-3 text-slate-500" aria-hidden="true" />
        <input
          id="search-satker"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari Satuan Kerja..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-white/6 rounded-lg"
        />
      </div>

      {/* Content list */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Memuat data dashboard…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400">Tidak ditemukan satker sesuai pencarian.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(satker => {
            const pct = parseInt(satker.statistik?.persentase_kepatuhan || 0);
            const headerBadge = pct === 100 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-red-400';
            return (
              <div key={satker.nama_satker} className="bg-slate-900 border border-white/6 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${headerBadge}`} aria-hidden="true" />
                    <div>
                      <div className="font-bold text-white">{satker.nama_satker}</div>
                      <ProgressBar
                        value={satker.statistik?.total_upload || 0}
                        max={satker.statistik?.total_wajib || 1}
                        label={`Kepatuhan ${satker.nama_satker}`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-xs text-slate-400 text-right">
                      <div className="font-bold text-white">{satker.statistik?.persentase_kepatuhan ?? '-'}%</div>
                      <div className="text-[11px]">Kepatuhan</div>
                    </div>
                  </div>
                </div>

                {/* Expanded table */}
                <div className="border-t border-white/6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs text-slate-400">Laporan</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs text-slate-400">Ketepatan</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs text-slate-400">Status Verifikasi</th>
                        {isAdmin && <th scope="col" className="px-4 py-3 text-right text-xs text-slate-400">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {satker.detail_laporan.map(l => {
                        const uploaded = !!l.submission_id;
                        return (
                          <tr key={l.report_type_id} className="border-t border-white/6 hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                {uploaded ? <CheckCircle2 size={14} className="text-emerald-400 mt-0.5" /> : <AlertCircle size={14} className="text-slate-500 mt-0.5" />}
                                <div className={`${uploaded ? 'text-white font-medium' : 'text-slate-400 italic'}`}>{l.nama_laporan}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {l.status_ketepatan_waktu ? (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${l.status_ketepatan_waktu === 'Tepat Waktu' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                  {l.status_ketepatan_waktu}
                                </span>
                              ) : <span className="text-slate-500">-</span>}
                            </td>
                            <td className="px-4 py-3">
                              {uploaded ? (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${l.status_verifikasi === 'lengkap' ? 'bg-emerald-50 text-emerald-700' :
                                    l.status_verifikasi === 'revisi' ? 'bg-red-50 text-red-700' :
                                      'bg-amber-50 text-amber-700'
                                  }`}>
                                  {String(l.status_verifikasi || '').replace('_', ' ')}
                                </span>
                              ) : <span className="text-slate-500">Belum Upload</span>}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3 text-right">
                                {uploaded && (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      onClick={() => handleDownload(l.submission_id)}
                                      aria-label={`Unduh laporan ${l.nama_laporan}`}
                                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                    >
                                      <Download size={14} aria-hidden="true" />
                                    </button>
                                    <button
                                      onClick={() => openVerifyModal({ ...l, nama_satker: satker.nama_satker })}
                                      aria-label={`Verifikasi laporan ${l.nama_laporan} dari ${satker.nama_satker}`}
                                      className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold"
                                    >
                                      Verifikasi
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Verify modal (admin) */}
      {isAdmin && verifyModal.open && verifyModal.data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setVerifyModal({ open: false, data: null })}
        >
          <div
            ref={verifyModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-modal-title"
            className="bg-slate-900 w-full max-w-md rounded-2xl border border-white/6 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-blue-400" aria-hidden="true" />
                <div>
                  <div id="verify-modal-title" className="text-sm font-bold text-white">{verifyModal.data.nama_satker}</div>
                  <div className="text-xs text-slate-400">{verifyModal.data.nama_laporan}</div>
                </div>
              </div>
              <button
                onClick={() => setVerifyModal({ open: false, data: null })}
                aria-label="Tutup dialog verifikasi"
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Keputusan Verifikasi</label>
                <select value={statusVerif} onChange={(e) => setStatusVerif(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-white/6 rounded-md">
                  <option value="">-- Pilih status --</option>
                  <option value="lengkap">lengkap</option>
                  <option value="revisi">revisi</option>
                </select>
              </div>

              {statusVerif === 'revisi' && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Catatan Revisi (akan dikirim via email)</label>
                  <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={4} className="w-full p-2.5 bg-slate-800 border border-white/6 rounded-md" placeholder="Jelaskan perbaikan yang dibutuhkan..." />
                </div>
              )}

              {formError && (
                <div role="alert" aria-live="assertive" className="text-sm text-red-400">{formError}</div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-white/6">
                <button type="button" onClick={() => setVerifyModal({ open: false, data: null })} className="px-3 py-2 bg-slate-800 rounded-md">Batal</button>
                <button type="submit" disabled={verifyMutation.isLoading} className="px-4 py-2 bg-blue-600 rounded-md text-white font-semibold">
                  {verifyMutation.isLoading ? 'Menyimpan...' : 'Simpan Verifikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-page toast (replaces window.alert) */}
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-6 right-6 z-[150] px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${
            toast.type === 'error'
              ? 'bg-red-950 text-red-200 border-red-700'
              : 'bg-emerald-950 text-emerald-200 border-emerald-700'
          }`}
        >
          {toast.text}
        </div>
      )}

    </div>
  );
}