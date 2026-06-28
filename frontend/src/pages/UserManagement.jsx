// frontend/src/pages/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Edit3,
  Trash2,
  UserCheck,
  ShieldCheck,
  Search,
  X,
  Check,
} from 'lucide-react';
import api from '../lib/axios';
import { useFocusTrap } from '../hooks/useFocusTrap';
import ConfirmDialog from '../components/ConfirmDialog';

/*
  UserManagement.jsx
  - Admin page for managing users (create, edit, deactivate/delete, reset password)
  - Uses react-query for data fetching and mutation
  - Assumes API endpoints (consistent with project docs):
      GET  /api/v1/users                 -> list users (with optional ?q=)
      POST /api/v1/users                 -> create user
      PATCH /api/v1/users/:id            -> update user
      DELETE /api/v1/users/:id           -> delete/deactivate user
      POST /api/v1/users/:id/reset-password -> (optional) reset user password / send temp password
      GET  /api/v1/satkers               -> list satkers for assignment
  - Adjust endpoint paths if your backend uses other route prefixes.
*/

const ALL_ROLE_OPTIONS = [
  { value: 'ADMIN_PT', label: 'Administrator (ADMIN_PT)' },
  { value: 'KPT', label: 'Ketua PT (KPT)' },
  { value: 'WKPT', label: 'Wakil Ketua PT (WKPT)' },
  { value: 'PANITERA_PT', label: 'Panitera PT (PANITERA_PT)' },
  { value: 'PANMUD_HUKUM_PT', label: 'Panitera Muda Hukum PT (PANMUD_HUKUM_PT)' },
  { value: 'STAFF_PANMUD_HUKUM_PT', label: 'Staff Panmud Hukum PT (STAFF_PANMUD_HUKUM_PT)' },
  { value: 'ADMIN_PN', label: 'Admin PN (ADMIN_PN)' },
  { value: 'KPN', label: 'Ketua PN (KPN)' },
  { value: 'PANITERA_PN', label: 'Panitera PN (PANITERA_PN)' },
  { value: 'PANMUD_HUKUM_PN', label: 'Panmud Hukum PN (PANMUD_HUKUM_PN)' },
  { value: 'STAFF_PANMUD_HUKUM_PN', label: 'Staff Panmud Hukum PN (STAFF_PANMUD_HUKUM_PN)' },
  { value: 'SATKER_PN', label: 'Satker (SATKER_PN)' },
];

const SATKER_OPTIONS = [
  { id: 1, name: 'Pengadilan Negeri Tanjungpinang' },
  { id: 2, name: 'Pengadilan Negeri Batam' },
  { id: 3, name: 'Pengadilan Negeri Tanjung Balai Karimun' },
  { id: 4, name: 'Pengadilan Negeri Natuna' },
];

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full ${className}`}>
      {children}
    </span>
  );
}

export default function UserManagement() {
  const queryClient = useQueryClient();

  const userStr = localStorage.getItem('satya_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isAdminPN = currentUser?.role === 'ADMIN_PN';

  const roleOptions = isAdminPN
    ? ALL_ROLE_OPTIONS.filter(r => ['KPN', 'PANITERA_PN', 'PANMUD_HUKUM_PN', 'STAFF_PANMUD_HUKUM_PN', 'SATKER_PN', 'ADMIN_PN'].includes(r.value))
    : ALL_ROLE_OPTIONS;

  // UI state
  const [q, setQ] = useState('');
  const [pageSize] = useState(50); // pagination placeholder (server-side recommended)
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('create'); // 'create' | 'edit'
  const [formError, setFormError] = useState('');

  // Accessible feedback & confirm
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, user: null });

  // Modal focus trap & escape
  const modalRef = useFocusTrap(modalOpen);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  // form state
  const [form, setForm] = useState({
    username: '',
    email: '',
    role: 'SATKER_PN',
    satker_id: '', // optional, relevant for SATKER_PN role
    password: '',
    confirmPassword: '',
    active: true,
  });

  // fetch users
  const { data: usersResp, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['users', q],
    queryFn: async () => {
      // server expected to return array or { data: [...] }
      const res = await api.get(`/api/v1/auth/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      return res?.data ?? res;
    },
    keepPreviousData: true,
  });



  const users = Array.isArray(usersResp) ? usersResp : (usersResp?.data ?? []);

  // Mutations: create, update, delete, reset password
  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api/v1/auth/users', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.post(`/api/v1/auth/users`, { id, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/v1/auth/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const resetPwdMutation = useMutation({
    mutationFn: (id) => api.post(`/api/v1/auth/users/${id}/reset-password`),
    onSuccess: () => {
      setToast({ type: 'success', text: 'Permintaan reset password terkirim (server akan mengirim email).' });
    },
    onError: (err) => {
      setToast({ type: 'error', text: err?.message || 'Gagal meminta reset password' });
    },
  });

  // helpers
  function openCreate() {
    setMode('create');
    setForm({
      username: '',
      email: '',
      role: 'SATKER_PN',
      satker_id: isAdminPN && currentUser?.satkerId ? String(currentUser.satkerId) : '',
      password: '',
      confirmPassword: '',
      active: true,
    });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(user) {
    setMode('edit');
    setSelectedUser(user);
    setForm({
      username: user.username || '',
      email: user.email || '',
      role: user.role || 'SATKER_PN',
      satker_id: user.satker_id ? String(user.satker_id) : (isAdminPN && currentUser?.satkerId ? String(currentUser.satkerId) : ''),
      password: '',
      confirmPassword: '',
      active: user.active ?? true,
    });
    setFormError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedUser(null);
  }

  function validateForm() {
    // basic validation rules; systems often require stronger password rules
    if (!form.username || form.username.trim().length < 3) {
      setFormError('Username minimal 3 karakter.');
      return false;
    }
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setFormError('Masukkan alamat email yang valid.');
      return false;
    }

    const pnRoles = ['KPN', 'PANITERA_PN', 'PANMUD_HUKUM_PN', 'STAFF_PANMUD_HUKUM_PN', 'SATKER_PN', 'ADMIN_PN'];
    if (pnRoles.includes(form.role) && !form.satker_id) {
      setFormError('Pilih Satuan Kerja untuk role Pengadilan Negeri.');
      return false;
    }
    if (mode === 'create') {
      if (!form.password || form.password.length < 8) {
        setFormError('Password minimal 8 karakter.');
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setFormError('Password dan konfirmasi tidak cocok.');
        return false;
      }
    } else {
      // edit mode: if password entered, validate it
      if (form.password) {
        if (form.password.length < 8) {
          setFormError('Password minimal 8 karakter.');
          return false;
        }
        if (form.password !== form.confirmPassword) {
          setFormError('Password dan konfirmasi tidak cocok.');
          return false;
        }
      }
    }
    setFormError('');
    return true;
  }

  async function submitForm(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const pnRoles = ['KPN', 'PANITERA_PN', 'PANMUD_HUKUM_PN', 'STAFF_PANMUD_HUKUM_PN', 'SATKER_PN', 'ADMIN_PN'];
    const payload = {
      username: form.username.trim(),
      email: form.email.trim(),
      role: form.role,
      satker_id: pnRoles.includes(form.role) && form.satker_id ? Number(form.satker_id) : null,
      active: !!form.active,
    };
    // only send password if provided
    if (form.password) payload.password = form.password;

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload);
        setToast({ type: 'success', text: 'Akun berhasil dibuat.' });
      } else if (mode === 'edit' && selectedUser) {
        await updateMutation.mutateAsync({ id: selectedUser.id, payload });
        setToast({ type: 'success', text: 'Perubahan tersimpan.' });
      }
    } catch (err) {
      setFormError(err?.response?.data?.message ?? err?.message ?? 'Gagal menyimpan pengguna.');
    }
  }

  function confirmDelete(user) {
    setConfirmDialog({ open: true, action: 'delete', user });
  }

  function triggerResetPassword(user) {
    setConfirmDialog({ open: true, action: 'reset', user });
  }

  function handleConfirmAction() {
    if (!confirmDialog.user) return;
    if (confirmDialog.action === 'delete') {
      deleteMutation.mutate(confirmDialog.user.id);
    } else if (confirmDialog.action === 'reset') {
      resetPwdMutation.mutate(confirmDialog.user.id);
    }
    setConfirmDialog({ open: false, action: null, user: null });
  }

  function handleCancelAction() {
    setConfirmDialog({ open: false, action: null, user: null });
  }

  // small UI helpers
  function RoleBadge({ role }) {
    const map = {
      ADMIN_PT: 'bg-violet-600 text-white',
      KPT: 'bg-teal-600 text-white',
      WKPT: 'bg-teal-600 text-white',
      PANITERA_PT: 'bg-teal-600 text-white',
      PANMUD_HUKUM_PT: 'bg-indigo-500 text-white',
      STAFF_PANMUD_HUKUM_PT: 'bg-indigo-400 text-white',
      ADMIN_PN: 'bg-amber-600 text-white',
      KPN: 'bg-orange-500 text-white',
      PANITERA_PN: 'bg-orange-500 text-white',
      PANMUD_HUKUM_PN: 'bg-amber-500 text-white',
      STAFF_PANMUD_HUKUM_PN: 'bg-yellow-500 text-white',
      SATKER_PN: 'bg-yellow-600 text-white',
    };
    return <Badge className={map[role] || 'bg-slate-500 text-white'}>{role}</Badge>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-400">Buat, edit, aktifkan atau nonaktifkan akun pengguna sistem.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <label htmlFor="search-user" className="sr-only">Cari username atau email</label>
            <Search className="absolute left-3 top-2 text-slate-400" aria-hidden="true" />
            <input
              id="search-user"
              placeholder="Cari username atau email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800 border border-white/6 rounded-md text-sm"
            />
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-md text-white font-semibold">
            <UserPlus size={16} aria-hidden="true" /> Buat Akun
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-slate-900 border border-white/6 rounded-xl overflow-hidden">
        <div className="p-4">
          <table className="w-full text-sm">
            <thead className="text-slate-400 text-xs uppercase">
              <tr>
                <th scope="col" className="text-left px-4 py-2">User</th>
                <th scope="col" className="text-left px-4 py-2">Email</th>
                <th scope="col" className="text-left px-4 py-2">Role / Satker</th>
                <th scope="col" className="text-left px-4 py-2">Status</th>
                <th scope="col" className="text-right px-4 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr><td colSpan="5" className="text-center py-6 text-slate-500">Memuat pengguna…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-6 text-slate-500">Tidak ada pengguna</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-t border-white/6 hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold">
                        {String(user.username || '').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{user.username}</div>
                        <div className="text-xs text-slate-400">{user.fullname ?? ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={user.role} />
                      <div className="text-xs text-slate-400">{user.satker_name ?? '—'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.active ? <Badge className="bg-emerald-600 text-white">Aktif</Badge> : <Badge className="bg-red-600 text-white">Nonaktif</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button title="Edit" aria-label={`Edit akun ${user.username}`} onClick={() => openEdit(user)} className="p-2 rounded-md bg-slate-800 hover:bg-slate-700">
                        <Edit3 size={16} aria-hidden="true" />
                      </button>
                      <button title="Reset Password" aria-label={`Reset password akun ${user.username}`} onClick={() => triggerResetPassword(user)} className="p-2 rounded-md bg-slate-800 hover:bg-slate-700">
                        <UserCheck size={16} aria-hidden="true" />
                      </button>
                      <button title="Hapus" aria-label={`Hapus akun ${user.username}`} onClick={() => confirmDelete(user)} className="p-2 rounded-md bg-red-700/20 hover:bg-red-700/30 text-red-400">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={closeModal}>
          <div
            ref={modalRef}
            className="w-full max-w-2xl bg-slate-900 border border-white/6 rounded-2xl p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 id="user-modal-title" className="text-lg font-bold text-white">{mode === 'create' ? 'Buat Akun Baru' : `Edit: ${selectedUser?.username}`}</h3>
                <p className="text-sm text-slate-400">Isi data pengguna dan atur role / satker.</p>
              </div>
              <button onClick={closeModal} aria-label="Tutup dialog" className="p-2 rounded-md text-slate-400 hover:text-white">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={submitForm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="form-username" className="block text-xs text-slate-400 mb-1">Username</label>
                <input id="form-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-white/6 rounded-md" autoComplete="username" />
              </div>

              <div>
                <label htmlFor="form-email" className="block text-xs text-slate-400 mb-1">Email</label>
                <input id="form-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-white/6 rounded-md" autoComplete="email" />
              </div>

              <div>
                <label htmlFor="form-role" className="block text-xs text-slate-400 mb-1">Role</label>
                <select id="form-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-white/6 rounded-md">
                  {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="form-satker" className="block text-xs text-slate-400 mb-1">Satuan Kerja (wajib untuk role PN)</label>
                <select id="form-satker" value={String(form.satker_id || '')} onChange={(e) => setForm({ ...form, satker_id: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-white/6 rounded-md" disabled={isAdminPN}>
                  <option value="">-- Pilih Satker --</option>
                  {SATKER_OPTIONS.map(s => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="form-password" className="block text-xs text-slate-400 mb-1">{mode === 'create' ? 'Password' : 'Password (kosongkan jika tidak ingin mengubah)'}</label>
                <input id="form-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-white/6 rounded-md" autoComplete={mode === 'create' ? 'new-password' : 'new-password'} />
              </div>

              <div>
                <label htmlFor="form-confirm-password" className="block text-xs text-slate-400 mb-1">Konfirmasi Password</label>
                <input id="form-confirm-password" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full p-2.5 bg-slate-800 border border-white/6 rounded-md" autoComplete="new-password" />
              </div>

              <div className="md:col-span-2 flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  <span className="text-sm text-slate-300">Akun aktif</span>
                </label>

                <div className="ml-auto flex items-center gap-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2 rounded-md bg-white/5">Batal</button>
                  <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold" disabled={createMutation.isLoading || updateMutation.isLoading}>
                    {mode === 'create' ? (createMutation.isLoading ? 'Membuat…' : 'Buat Akun') : (updateMutation.isLoading ? 'Menyimpan…' : 'Simpan Perubahan')}
                  </button>
                </div>
              </div>

              {formError && <div role="alert" aria-live="assertive" className="md:col-span-2 text-sm text-red-400 mt-1">{formError}</div>}
            </form>
          </div>
        </div>
      )}

      {/* Accessible Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.action === 'delete' ? 'Hapus Akun' : 'Reset Password'}
        message={
          confirmDialog.action === 'delete'
            ? `Hapus akun ${confirmDialog.user?.username}? Aksi ini tidak dapat dibatalkan.`
            : `Kirim tautan reset password ke ${confirmDialog.user?.email}?`
        }
        confirmLabel={confirmDialog.action === 'delete' ? 'Ya, Hapus' : 'Ya, Kirim'}
        cancelLabel="Batal"
        variant={confirmDialog.action === 'delete' ? 'danger' : 'warning'}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />

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