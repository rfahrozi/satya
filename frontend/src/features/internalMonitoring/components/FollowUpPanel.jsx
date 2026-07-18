import React, { useState, useEffect } from 'react';
import { internalMonitoringApi } from '../api/internalMonitoringApi';
import StatusBadge from './StatusBadge';
import api from '../../../lib/axios';

// Peran yang relevan sebagai penanggung jawab follow-up (internal PT)
const PT_ROLES = [
  'ADMIN_PT', 'KPT', 'WKPT', 'PANITERA_PT',
  'PANMUD_HUKUM_PT', 'STAFF_PANMUD_HUKUM_PT', 'PIMPINAN', 'VERIFIER'
];

const FollowUpPanel = ({ targetId, followUps, onFollowUpChanged }) => {
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [ptUsers, setPtUsers]     = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt]             = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');

  // Muat daftar user PT saat form dibuka
  useEffect(() => {
    if (!showForm || ptUsers.length > 0) return;

    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        const res = await api.get('/api/v1/auth/users');
        const all = res?.data?.data || res?.data || [];
        // Filter hanya user dengan role PT yang relevan
        const filtered = all.filter(u => PT_ROLES.includes(u.role) && u.is_active !== false);
        setPtUsers(filtered);
      } catch {
        // Jika gagal, biarkan kosong — user masih bisa ketik manual sebagai fallback
        setPtUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [showForm]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueAt('');
    setOwnerUserId('');
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ownerUserId) {
      alert('Pilih penanggung jawab terlebih dahulu.');
      return;
    }
    try {
      setLoading(true);
      await internalMonitoringApi.createFollowUp(targetId, {
        title,
        description,
        due_at: dueAt,
        owner_user_id: parseInt(ownerUserId, 10)
      });
      resetForm();
      if (onFollowUpChanged) onFollowUpChanged();
    } catch (err) {
      alert('Gagal membuat follow-up: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (fuId, action) => {
    try {
      setLoading(true);
      await internalMonitoringApi.updateFollowUpStatus(targetId, fuId, action, 'Updated via UI');
      if (onFollowUpChanged) onFollowUpChanged();
    } catch (err) {
      alert('Gagal update status: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6">
      {/* Header */}
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Tindak Lanjut (Follow-ups)
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Daftar perbaikan atau catatan tindak lanjut untuk target ini.
          </p>
        </div>
        <button
          onClick={() => setShowForm(prev => !prev)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {showForm ? 'Batal' : '+ Tambah Follow-up'}
        </button>
      </div>

      {/* Form tambah follow-up */}
      {showForm && (
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Judul */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Judul <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ringkasan tindak lanjut..."
                className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Deskripsi <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Jelaskan tindakan yang perlu diambil..."
                className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tenggat Waktu */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tenggat Waktu <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dueAt}
                  onChange={e => setDueAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Penanggung Jawab — dropdown user */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Penanggung Jawab <span className="text-red-500">*</span>
                </label>
                {usersLoading ? (
                  <div className="mt-1 text-sm text-gray-400 py-2">Memuat daftar user...</div>
                ) : ptUsers.length > 0 ? (
                  <select
                    required
                    value={ownerUserId}
                    onChange={e => setOwnerUserId(e.target.value)}
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">-- Pilih Penanggung Jawab --</option>
                    {ptUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  /* Fallback: input manual jika API user tidak tersedia */
                  <input
                    type="number"
                    required
                    value={ownerUserId}
                    onChange={e => setOwnerUserId(e.target.value)}
                    placeholder="ID User"
                    min={1}
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Menyimpan...' : 'Simpan Follow-up'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daftar follow-up */}
      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {(!followUps || followUps.length === 0) ? (
            <li className="px-4 py-5 sm:px-6 text-sm text-gray-500 text-center">
              Belum ada tindak lanjut.
            </li>
          ) : (
            followUps.map(fu => (
              <li key={fu.id} className="px-4 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900">{fu.title}</h4>
                    <p className="mt-1 text-sm text-gray-600">{fu.description}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Jatuh Tempo: {fu.due_at
                        ? new Date(fu.due_at).toLocaleDateString('id-ID')
                        : '-'}
                    </p>
                  </div>
                  <StatusBadge status={fu.status} />
                </div>

                {/* Tombol transisi status */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(fu.status === 'OPEN' || fu.status === 'REOPENED') && (
                    <button
                      onClick={() => updateStatus(fu.id, 'start')}
                      disabled={loading}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                    >
                      Mulai Kerjakan
                    </button>
                  )}
                  {fu.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => updateStatus(fu.id, 'submit-resolution')}
                      disabled={loading}
                      className="text-xs text-green-600 hover:underline disabled:opacity-50"
                    >
                      Ajukan Penyelesaian
                    </button>
                  )}
                  {fu.status === 'AWAITING_VERIFICATION' && (
                    <>
                      <button
                        onClick={() => updateStatus(fu.id, 'close')}
                        disabled={loading}
                        className="text-xs text-emerald-600 hover:underline disabled:opacity-50"
                      >
                        Tutup & Selesai
                      </button>
                      <button
                        onClick={() => updateStatus(fu.id, 'reopen')}
                        disabled={loading}
                        className="text-xs text-amber-600 hover:underline disabled:opacity-50"
                      >
                        Buka Kembali
                      </button>
                    </>
                  )}
                  {fu.status !== 'CANCELLED' && fu.status !== 'CLOSED' && (
                    <button
                      onClick={() => updateStatus(fu.id, 'cancel')}
                      disabled={loading}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default FollowUpPanel;
