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


  const handleGenerateTargets = async (id) => {
    if (!confirm('Anda yakin ingin men-generate semua target checklist untuk periode ini? Tindakan ini akan memakan waktu sejenak dan membagikan checklist ke seluruh PIC.')) return;
    try {
      setLoading(true);
      await internalMonitoringApi.generateTargets(id);
      alert('Berhasil! Target telah di-generate.');
      loadData();
    } catch (err) {
      alert('Gagal generate target: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

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

  const isPeriodConflict = periods.some(
    p => p.year === newPeriod.year && p.month === newPeriod.month && ['OPEN', 'ACTIVE'].includes(p.status)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/50 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Master Data PT (Internal Monitoring)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pengelolaan Periode Aktif, 295 Checklist AMPUH/PMPZI/AKIP, dan Master Konfigurasi untuk Pengadilan Tinggi
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-slate-600 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
        >
          🔄 Muat Ulang
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/50 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('periods')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'periods' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          📅 Kelola Periode Monitoring PT
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'items' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          📋 Daftar 295 Master Checklist (CHK)
        </button>
      </div>

      {error && <div className="p-4 bg-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}
      {loading && <div className="p-8 text-center text-slate-500">Memuat data master...</div>}

      {/* TAB 1: KELOLA PERIODE */}
      {!loading && activeTab === 'periods' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">Daftar Periode Internal Monitoring</h3>
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-xs text-slate-500 uppercase font-semibold border-b border-slate-700/50">
                    <th className="p-3">ID</th>
                    <th className="p-3">Nama Periode</th>
                    <th className="p-3">Siklus</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {periods.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-500">
                        Belum ada periode yang dibuat.
                      </td>
                    </tr>
                  ) : (
                    periods.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/50">
                        <td className="p-3 font-mono text-slate-500">{p.id}</td>
                        <td className="p-3 font-semibold text-white">{p.name}</td>
                        <td className="p-3 text-slate-400">{p.year} (Bulan {p.month})</td>
                        <td className="p-3 text-xs text-slate-500">
                          {p.start_date?.split('T')[0]} s.d. {p.end_date?.split('T')[0]}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              p.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : p.status === 'OPEN'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right flex gap-2 justify-end">
                          {p.status === 'DRAFT' && (
                            <button
                              onClick={() => handleOpenPeriod(p.id)}
                              className="px-3 py-1 bg-blue-600 text-white shadow-md shadow-blue-900/20 rounded text-xs hover:bg-blue-700 transition-colors"
                            >
                              Buka Periode
                            </button>
                          )}
                          {p.status === 'OPEN' && (
                            <button
                              onClick={() => handleGenerateTargets(p.id)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-500 shadow-md shadow-emerald-900/20 transition-colors"
                            >
                              Generate Targets
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
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-semibold text-slate-200">➕ Buat Periode Baru</h3>
            <form onSubmit={handleCreatePeriod} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nama Periode</label>
                <input
                  type="text"
                  value={newPeriod.name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                  required
                  className="w-full p-2 border border-slate-600 rounded bg-slate-800 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tahun</label>
                  <input
                    type="number"
                    value={newPeriod.year}
                    onChange={(e) => setNewPeriod({ ...newPeriod, year: parseInt(e.target.value) })}
                    required
                    className="w-full p-2 border border-slate-600 rounded-lg bg-slate-800 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Pilih Siklus</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      const yr = newPeriod.year;
                      let update = { month: 12 };
                      if (val.startsWith('B-')) {
                         update.month = parseInt(val.split('-')[1]);
                         update.name = `Bulanan ${update.month} ${yr}`;
                         // Start date = 1st of month, end date = last day of month
                         update.start_date = `${yr}-${String(update.month).padStart(2,'0')}-01`;
                         update.end_date = `${yr}-${String(update.month).padStart(2,'0')}-${new Date(yr, update.month, 0).getDate()}`;
                         update.period_type = 'MONTHLY';
                      } else if (val.startsWith('Q-')) {
                         const q = parseInt(val.split('-')[1]);
                         update.month = q * 3;
                         update.name = `Triwulan ${q === 1 ? 'I' : q === 2 ? 'II' : q === 3 ? 'III' : 'IV'} ${yr}`;
                         update.start_date = `${yr}-${String((q-1)*3 + 1).padStart(2,'0')}-01`;
                         update.end_date = `${yr}-${String(update.month).padStart(2,'0')}-${new Date(yr, update.month, 0).getDate()}`;
                         update.period_type = 'QUARTERLY';
                      } else if (val.startsWith('S-')) {
                         const s = parseInt(val.split('-')[1]);
                         update.month = s * 6;
                         update.name = `Semester ${s === 1 ? 'I' : 'II'} ${yr}`;
                         update.start_date = `${yr}-${String((s-1)*6 + 1).padStart(2,'0')}-01`;
                         update.end_date = `${yr}-${String(update.month).padStart(2,'0')}-${new Date(yr, update.month, 0).getDate()}`;
                         update.period_type = 'SEMIANNUAL';
                      } else {
                         update.month = 12;
                         update.name = `Tahunan ${yr}`;
                         update.start_date = `${yr}-01-01`;
                         update.end_date = `${yr}-12-31`;
                         update.period_type = 'ANNUAL';
                      }
                      setNewPeriod({ ...newPeriod, ...update });
                    }}
                    className="w-full p-2 border border-slate-600 rounded-lg bg-slate-800 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  >
                    <option value="A">Tahunan (Desember)</option>
                    <optgroup label="Semester">
                      <option value="S-1">Semester I (Juni)</option>
                      <option value="S-2">Semester II (Desember)</option>
                    </optgroup>
                    <optgroup label="Triwulan">
                      <option value="Q-1">Triwulan I (Maret)</option>
                      <option value="Q-2">Triwulan II (Juni)</option>
                      <option value="Q-3">Triwulan III (September)</option>
                      <option value="Q-4">Triwulan IV (Desember)</option>
                    </optgroup>
                    <optgroup label="Bulanan">
                      <option value="B-1">Januari</option>
                      <option value="B-2">Februari</option>
                      <option value="B-3">Maret</option>
                      <option value="B-4">April</option>
                      <option value="B-5">Mei</option>
                      <option value="B-6">Juni</option>
                      <option value="B-7">Juli</option>
                      <option value="B-8">Agustus</option>
                      <option value="B-9">September</option>
                      <option value="B-10">Oktober</option>
                      <option value="B-11">November</option>
                      <option value="B-12">Desember</option>
                    </optgroup>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={newPeriod.start_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                    required
                    className="w-full p-2 border border-slate-600 rounded bg-slate-800 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  />
                </div>
                                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={newPeriod.end_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                    required
                    className="w-full p-2 border border-slate-600 rounded-lg bg-slate-800 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Peringatan Tumpang Tindih */}
              {isPeriodConflict && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 font-medium">
                  ⚠️ <b>Bentrok!</b> Bulan evaluasi ini (Bulan {newPeriod.month}) sudah diwakili oleh keranjang periode lain yang sedang aktif di tahun {newPeriod.year}. Jangan membuat keranjang tumpang tindih.
                </div>
              )}

              <button
                type="submit"
                disabled={isPeriodConflict}
                className={`w-full py-2.5 text-white font-semibold rounded-lg transition-all shadow-md ${isPeriodConflict ? 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'}`}
              >
                {isPeriodConflict ? 'Periode Tidak Valid' : 'Simpan Periode'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR MASTER CHECKLIST */}
      {!loading && activeTab === 'items' && (
        <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 shrink-0">
            <div>
              <h3 className="text-lg font-semibold text-white">Konfigurasi {masterItems.length} Item Master Checklist PT</h3>
              <p className="text-xs text-slate-500">
                Semua item disinkronisasi dari Canonical Master Version sesuai dokumen kriteria resmi AMPUH, PMPZI, dan AKIP.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Cari checklist atau bagian..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-slate-600 rounded text-sm w-64"
              />
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">
                ✔ Master Aktif
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-700/50 rounded max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm whitespace-nowrap relative">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-700/50">
                <tr className="text-slate-600 font-semibold">
                  <th className="px-4 py-3 bg-slate-50">Kode</th>
                  <th className="px-4 py-3 bg-slate-50 min-w-[250px]">Judul Checklist</th>
                  <th className="px-4 py-3 bg-slate-50">Frekuensi</th>
                  <th className="px-4 py-3 bg-slate-50">Bagian (Unit) Penanggung Jawab</th>
                  <th className="px-4 py-3 bg-slate-50 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
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
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-400">
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
