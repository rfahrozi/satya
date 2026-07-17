import React, { useState } from 'react';
import { internalMonitoringApi } from '../api/internalMonitoringApi';
import StatusBadge from './StatusBadge';

const FollowUpPanel = ({ targetId, followUps, onFollowUpChanged }) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await internalMonitoringApi.createFollowUp(targetId, {
        title,
        description,
        due_at: dueAt,
        owner_user_id: ownerUserId
      });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setDueAt('');
      setOwnerUserId('');
      if (onFollowUpChanged) onFollowUpChanged();
    } catch (err) {
      alert('Gagal membuat follow-up: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (fuId, status) => {
    try {
      setLoading(true);
      await internalMonitoringApi.updateFollowUpStatus(targetId, fuId, status, 'Updated via UI');
      if (onFollowUpChanged) onFollowUpChanged();
    } catch (err) {
      alert('Gagal update status: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Tindak Lanjut (Follow-ups)</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Daftar perbaikan atau catatan tindak lanjut untuk target ini.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {showForm ? 'Batal' : '+ Tambah Follow-up'}
        </button>
      </div>

      {showForm && (
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Judul</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
              <textarea required value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tenggat Waktu</label>
                <input type="date" required value={dueAt} onChange={e => setDueAt(e.target.value)} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Penanggung Jawab (User ID)</label>
                <input type="number" required value={ownerUserId} onChange={e => setOwnerUserId(e.target.value)} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              Simpan Follow-up
            </button>
          </form>
        </div>
      )}

      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {(!followUps || followUps.length === 0) ? (
            <li className="px-4 py-5 sm:px-6 text-sm text-gray-500">Belum ada tindak lanjut.</li>
          ) : (
            followUps.map(fu => (
              <li key={fu.id} className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{fu.title}</h4>
                  <div className="flex space-x-2">
                    <span className="text-xs text-gray-500">Jatuh Tempo: {fu.due_at ? new Date(fu.due_at).toLocaleDateString('id-ID') : '-'}</span>
                    <StatusBadge status={fu.status} />
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600">{fu.description}</p>
                
                {/* Actions based on status */}
                <div className="mt-3 flex space-x-2">
                  {fu.status === 'OPEN' && (
                    <button onClick={() => updateStatus(fu.id, 'IN_PROGRESS')} className="text-xs text-blue-600 hover:underline">Tandai In Progress</button>
                  )}
                  {fu.status === 'IN_PROGRESS' && (
                    <button onClick={() => updateStatus(fu.id, 'CLOSED')} className="text-xs text-green-600 hover:underline">Tandai Selesai</button>
                  )}
                  {fu.status !== 'CANCELLED' && fu.status !== 'CLOSED' && (
                    <button onClick={() => updateStatus(fu.id, 'CANCELLED')} className="text-xs text-red-600 hover:underline">Batalkan</button>
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
