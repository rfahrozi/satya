import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Landmark, FileText, Calendar, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import api from '../lib/axios';

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('satkers');
  const queryClient = useQueryClient();

  // Toast state
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Master Data</h1>
        <p className="text-sm text-slate-400">Kelola Satker, Jenis Laporan, dan Pengaturan Deadline</p>
      </div>

      {toast && (
        <div className={`p-4 rounded-lg text-sm font-semibold text-white shadow-lg flex justify-between items-center ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'satkers' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveTab('satkers')}
        >
          <Landmark size={18} /> Satuan Kerja
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'reports' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileText size={18} /> Jenis Laporan
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'deadlines' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveTab('deadlines')}
        >
          <Calendar size={18} /> Pengaturan Deadline
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-slate-900 border border-white/6 rounded-2xl p-5">
        {activeTab === 'satkers' && <SatkerTab setToast={setToast} queryClient={queryClient} />}
        {activeTab === 'reports' && <ReportTypeTab setToast={setToast} queryClient={queryClient} />}
        {activeTab === 'deadlines' && <DeadlineTab setToast={setToast} queryClient={queryClient} />}
      </div>
    </div>
  );
}

// ─── KOMPONEN TAB SATKER ───────────────────────────────────────────────────────
function SatkerTab({ setToast, queryClient }) {
  const { data: satkers, isLoading } = useQuery({
    queryKey: ['master', 'satkers'],
    queryFn: () => api.get('/api/v1/master/satkers').then(r => r.data.data || []),
  });

  const [form, setForm] = useState({ id: null, nama_satker: '' });

  const mutationCreate = useMutation({
    mutationFn: (data) => api.post('/api/v1/master/satkers', data),
    onSuccess: () => { queryClient.invalidateQueries(['master', 'satkers']); setToast({ type: 'success', text: 'Satker ditambahkan.' }); setForm({ id: null, nama_satker: '' }); },
    onError: (e) => setToast({ type: 'error', text: e.message || 'Gagal menambah satker.' }),
  });

  const mutationUpdate = useMutation({
    mutationFn: (data) => api.put(`/api/v1/master/satkers/${data.id}`, { nama_satker: data.nama_satker }),
    onSuccess: () => { queryClient.invalidateQueries(['master', 'satkers']); setToast({ type: 'success', text: 'Satker diperbarui.' }); setForm({ id: null, nama_satker: '' }); },
    onError: (e) => setToast({ type: 'error', text: e.message || 'Gagal memperbarui satker.' }),
  });

  const mutationDelete = useMutation({
    mutationFn: (id) => api.delete(`/api/v1/master/satkers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['master', 'satkers']); setToast({ type: 'success', text: 'Satker dihapus.' }); },
    onError: (e) => setToast({ type: 'error', text: e.message || 'Gagal menghapus satker. Mungkin masih digunakan.' }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nama_satker) return;
    if (form.id) mutationUpdate.mutate(form);
    else mutationCreate.mutate(form);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-3 mb-6 items-end">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">Nama Satuan Kerja</label>
          <input
            type="text"
            required
            value={form.nama_satker}
            onChange={(e) => setForm({ ...form, nama_satker: e.target.value })}
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Contoh: Pengadilan Negeri Batam"
          />
        </div>
        <button type="submit" disabled={mutationCreate.isLoading || mutationUpdate.isLoading} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 h-[38px]">
          {form.id ? <><Check size={16} /> Simpan</> : <><Plus size={16} /> Tambah</>}
        </button>
        {form.id && (
          <button type="button" onClick={() => setForm({ id: null, nama_satker: '' })} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium h-[38px]">Batal</button>
        )}
      </form>

      {isLoading ? (
        <div className="text-center py-4 text-slate-400">Memuat...</div>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg rounded-bl-lg w-16">ID</th>
              <th className="px-4 py-3">Nama Satuan Kerja</th>
              <th className="px-4 py-3 rounded-tr-lg rounded-br-lg text-right w-32">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {satkers?.map((s) => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-slate-800/40">
                <td className="px-4 py-3 text-slate-400">{s.id}</td>
                <td className="px-4 py-3 text-white">{s.nama_satker}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setForm(s)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md mr-1" title="Edit"><Edit2 size={16} /></button>
                  <button onClick={() => { if(window.confirm('Yakin hapus?')) mutationDelete.mutate(s.id); }} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md" title="Hapus"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── KOMPONEN TAB JENIS LAPORAN ────────────────────────────────────────────────
function ReportTypeTab({ setToast, queryClient }) {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['master', 'reports'],
    queryFn: () => api.get('/api/v1/master/report-types').then(r => r.data.data || []),
  });

  const [form, setForm] = useState({ id: null, nama_laporan: '', is_wajib: true });

  const mutationCreate = useMutation({
    mutationFn: (data) => api.post('/api/v1/master/report-types', data),
    onSuccess: () => { queryClient.invalidateQueries(['master', 'reports']); setToast({ type: 'success', text: 'Jenis Laporan ditambahkan.' }); setForm({ id: null, nama_laporan: '', is_wajib: true }); },
    onError: (e) => setToast({ type: 'error', text: e.message || 'Gagal menambah laporan.' }),
  });

  const mutationUpdate = useMutation({
    mutationFn: (data) => api.put(`/api/v1/master/report-types/${data.id}`, { nama_laporan: data.nama_laporan, is_wajib: data.is_wajib }),
    onSuccess: () => { queryClient.invalidateQueries(['master', 'reports']); setToast({ type: 'success', text: 'Jenis Laporan diperbarui.' }); setForm({ id: null, nama_laporan: '', is_wajib: true }); },
    onError: (e) => setToast({ type: 'error', text: e.message || 'Gagal memperbarui laporan.' }),
  });

  const mutationDelete = useMutation({
    mutationFn: (id) => api.delete(`/api/v1/master/report-types/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['master', 'reports']); setToast({ type: 'success', text: 'Jenis Laporan dihapus.' }); },
    onError: (e) => setToast({ type: 'error', text: e.message || 'Gagal menghapus laporan.' }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nama_laporan) return;
    if (form.id) mutationUpdate.mutate(form);
    else mutationCreate.mutate(form);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-3 mb-6 items-end">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">Nama Jenis Laporan</label>
          <input
            type="text"
            required
            value={form.nama_laporan}
            onChange={(e) => setForm({ ...form, nama_laporan: e.target.value })}
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Contoh: Laporan Bulanan Keuangan"
          />
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer h-[38px] px-2">
            <input type="checkbox" checked={form.is_wajib} onChange={(e) => setForm({ ...form, is_wajib: e.target.checked })} className="rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500" />
            <span className="text-sm text-slate-300">Wajib Dilaporkan</span>
          </label>
        </div>
        <button type="submit" disabled={mutationCreate.isLoading || mutationUpdate.isLoading} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 h-[38px]">
          {form.id ? <><Check size={16} /> Simpan</> : <><Plus size={16} /> Tambah</>}
        </button>
        {form.id && (
          <button type="button" onClick={() => setForm({ id: null, nama_laporan: '', is_wajib: true })} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium h-[38px]">Batal</button>
        )}
      </form>

      {isLoading ? (
        <div className="text-center py-4 text-slate-400">Memuat...</div>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg rounded-bl-lg w-16">ID</th>
              <th className="px-4 py-3">Nama Laporan</th>
              <th className="px-4 py-3 w-32 text-center">Status</th>
              <th className="px-4 py-3 rounded-tr-lg rounded-br-lg text-right w-32">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {reports?.map((r) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-slate-800/40">
                <td className="px-4 py-3 text-slate-400">{r.id}</td>
                <td className="px-4 py-3 text-white">{r.nama_laporan}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${r.is_wajib ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-700 text-slate-300'}`}>
                    {r.is_wajib ? 'Wajib' : 'Opsional'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setForm(r)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md mr-1" title="Edit"><Edit2 size={16} /></button>
                  <button onClick={() => { if(window.confirm('Yakin hapus?')) mutationDelete.mutate(r.id); }} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md" title="Hapus"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── KOMPONEN TAB DEADLINE ─────────────────────────────────────────────────────
function DeadlineTab({ setToast, queryClient }) {
  const { data: deadlines, isLoading: loadDL } = useQuery({ queryKey: ['master', 'deadlines'], queryFn: () => api.get('/api/v1/master/deadlines').then(r => r.data.data || []) });
  const { data: reports } = useQuery({ queryKey: ['master', 'reports'], queryFn: () => api.get('/api/v1/master/report-types').then(r => r.data.data || []) });

  const [form, setForm] = useState({ id: null, report_type_id: '', period_type: 'monthly', day_of_period: 10 });

  const mutationCreate = useMutation({
    mutationFn: (data) => api.post('/api/v1/master/deadlines', data),
    onSuccess: () => { queryClient.invalidateQueries(['master', 'deadlines']); setToast({ type: 'success', text: 'Deadline ditambahkan.' }); setForm({ id: null, report_type_id: '', period_type: 'monthly', day_of_period: 10 }); },
    onError: (e) => setToast({ type: 'error', text: e.message || 'Gagal menambah deadline.' }),
  });

  const mutationUpdate = useMutation({
    mutationFn: (data) => api.put(`/api/v1/master/deadlines/${data.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries(['master', 'deadlines']); setToast({ type: 'success', text: 'Deadline diperbarui.' }); setForm({ id: null, report_type_id: '', period_type: 'monthly', day_of_period: 10 }); },
    onError: (e) => setToast({ type: 'error', text: e.message || 'Gagal memperbarui deadline.' }),
  });

  const mutationDelete = useMutation({
    mutationFn: (id) => api.delete(`/api/v1/master/deadlines/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['master', 'deadlines']); setToast({ type: 'success', text: 'Deadline dihapus.' }); },
    onError: (e) => setToast({ type: 'error', text: e.message || 'Gagal menghapus deadline.' }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.report_type_id) return setToast({ type: 'error', text: 'Pilih jenis laporan' });
    if (form.id) mutationUpdate.mutate(form);
    else mutationCreate.mutate(form);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 mb-6 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-400 mb-1">Jenis Laporan</label>
          <select required value={form.report_type_id} onChange={(e) => setForm({ ...form, report_type_id: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500">
            <option value="">Pilih Laporan</option>
            {reports?.map(r => <option key={r.id} value={r.id}>{r.nama_laporan}</option>)}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-xs text-slate-400 mb-1">Periode</label>
          <select required value={form.period_type} onChange={(e) => setForm({ ...form, period_type: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500">
            <option value="monthly">Bulanan</option>
            <option value="quarterly">Triwulan</option>
            <option value="semesterly">Semesteran</option>
            <option value="annually">Tahunan</option>
          </select>
        </div>
        <div className="w-24">
          <label className="block text-xs text-slate-400 mb-1">Hari Ke-</label>
          <input type="number" required min="1" max="31" value={form.day_of_period} onChange={(e) => setForm({ ...form, day_of_period: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500" />
        </div>
        <button type="submit" disabled={mutationCreate.isLoading || mutationUpdate.isLoading} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 h-[38px]">
          {form.id ? <><Check size={16} /> Simpan</> : <><Plus size={16} /> Tambah</>}
        </button>
        {form.id && (
          <button type="button" onClick={() => setForm({ id: null, report_type_id: '', period_type: 'monthly', day_of_period: 10 })} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium h-[38px]">Batal</button>
        )}
      </form>

      {loadDL ? (
        <div className="text-center py-4 text-slate-400">Memuat...</div>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">Laporan</th>
              <th className="px-4 py-3">Periode</th>
              <th className="px-4 py-3">Jatuh Tempo</th>
              <th className="px-4 py-3 rounded-r-lg text-right w-32">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {deadlines?.map((d) => (
              <tr key={d.id} className="border-b border-white/5 hover:bg-slate-800/40">
                <td className="px-4 py-3 text-white">{d.nama_laporan}</td>
                <td className="px-4 py-3 text-slate-300 capitalize">{d.period_type}</td>
                <td className="px-4 py-3 text-slate-300">Hari ke-{d.day_of_period} bulan berikutnya</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setForm(d)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md mr-1" title="Edit"><Edit2 size={16} /></button>
                  <button onClick={() => { if(window.confirm('Yakin hapus?')) mutationDelete.mutate(d.id); }} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md" title="Hapus"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
