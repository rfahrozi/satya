import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../features/internalMonitoring/api/internalMonitoringApi';

const MasterDataPT = () => {
  const [periods, setPeriods] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('periods'); // periods | items | import
  const [searchTerm, setSearchTerm] = useState('');

  // State untuk buat periode baru
  const [newPeriod, setNewPeriod] = useState({
    name: 'Periode Semester II 2026',
    year: 2026,
    month: 12,
    start_date: '2026-07-01',
    end_date: '2026-12-31'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, mRes] = await Promise.all([
        internalMonitoringApi.listPeriods(),
        internalMonitoringApi.listMasterItems()
      ]);
      console.log('API Response Master Items:', mRes.data);
      setPeriods(pRes.data?.data || []);
      setMasterItems(mRes.data?.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat master data PT');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    try {
      await internalMonitoringApi.createPeriod(newPeriod);
      alert('Periode berhasil dibuat!');
      loadData();
    } catch (err) {
      alert('Gagal membuat periode: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenPeriod = async (id) => {
    try {
      await internalMonitoringApi.openPeriod(id);
      alert('Periode dibuka dan siap diaktifkan!');
      loadData();
    } catch (err) {
      alert('Gagal membuka periode: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Data PT (Internal Monitoring)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pengelolaan Periode Aktif, 51 Checklist AMPUH/PMPZI/AKIP, dan Master Konfigurasi untuk Pengadilan Tinggi
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          🔄 Muat Ulang
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('periods')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'periods' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📅 Kelola Periode Monitoring PT
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'items' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Daftar 51 Master Checklist (CHK)
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {loading && <div className="p-8 text-center text-gray-500">Memuat data master...</div>}

      {/* TAB 1: KELOLA PERIODE */}
      {!loading && activeTab === 'periods' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Daftar Periode Internal Monitoring</h3>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-200">
                    <th className="p-3">ID</th>
                    <th className="p-3">Nama Periode</th>
                    <th className="p-3">Siklus</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {periods.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-gray-400">
                        Belum ada periode yang dibuat.
                      </td>
                    </tr>
                  ) : (
                    periods.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono text-gray-500">{p.id}</td>
                        <td className="p-3 font-semibold text-gray-900">{p.name}</td>
                        <td className="p-3 text-gray-600">{p.year} (Bulan {p.month})</td>
                        <td className="p-3 text-xs text-gray-500">
                          {p.start_date?.split('T')[0]} s.d. {p.end_date?.split('T')[0]}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              p.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'OPEN'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {p.status === 'DRAFT' && (
                            <button
                              onClick={() => handleOpenPeriod(p.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              Buka Periode
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Buat Periode Baru */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">➕ Buat Periode Baru</h3>
            <form onSubmit={handleCreatePeriod} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Periode</label>
                <input
                  type="text"
                  value={newPeriod.name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tahun</label>
                  <input
                    type="number"
                    value={newPeriod.year}
                    onChange={(e) => setNewPeriod({ ...newPeriod, year: parseInt(e.target.value) })}
                    required
                    className="w-full p-2 border border-gray-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Bulan (1-12)</label>
                  <input
                    type="number"
                    value={newPeriod.month}
                    onChange={(e) => setNewPeriod({ ...newPeriod, month: parseInt(e.target.value) })}
                    required
                    min="1"
                    max="12"
                    className="w-full p-2 border border-gray-300 rounded bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={newPeriod.start_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={newPeriod.end_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded transition-colors"
              >
                Simpan Periode
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR MASTER CHECKLIST */}
      {!loading && activeTab === 'items' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 shrink-0">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Konfigurasi {masterItems.length} Item Master Checklist PT</h3>
              <p className="text-xs text-gray-500">
                Semua item disinkronisasi dari Canonical Master Version sesuai dokumen kriteria resmi AMPUH, PMPZI, dan AKIP.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Cari checklist atau bagian..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm w-64"
              />
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                ✔ Master Aktif
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm whitespace-nowrap relative">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                <tr className="text-slate-600 font-semibold">
                  <th className="px-4 py-3 bg-slate-50">Kode</th>
                  <th className="px-4 py-3 bg-slate-50 min-w-[250px]">Judul Checklist</th>
                  <th className="px-4 py-3 bg-slate-50">Frekuensi</th>
                  <th className="px-4 py-3 bg-slate-50">Bagian (Unit) Penanggung Jawab</th>
                  <th className="px-4 py-3 bg-slate-50 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {masterItems.filter(item =>
                  (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (item.item_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (item.unit_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                ).map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{item.item_code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-normal">
                      {item.title}
                      <div className="text-[10px] text-slate-400 mt-0.5 font-normal uppercase">{item.duty_cluster}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {item.frequency_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-indigo-600">
                      {item.unit_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {item.is_active ? 'AKTIF' : 'INAKTIF'}
                      </span>
                    </td>
                  </tr>
                ))}
                {masterItems.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      Data master checklist tidak ditemukan. Harap pastikan *seeding* master data telah dijalankan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 shrink-0 text-xs text-slate-400">
            *Catatan: Pengeditan struktur dokumen checklist, syarat unggahan, dan matriks pemetaan Kriteria (AMPUH/PMPZI) dikelola terpusat melalui sinkronisasi <b>Master JSON</b>.
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataPT;
