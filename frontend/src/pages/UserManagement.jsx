import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users as UsersIcon, Plus, Mail, Lock, CheckCircle, Search, MailPlus } from 'lucide-react'
import api from '../lib/axios'

export default function UserManagement() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // State for Create User Form
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nama_satker: '',
    email: ''
  })

  // Fetch Users
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/auth/users'),
  })

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: (newUserData) => api.post('/auth/users', newUserData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsModalOpen(false)
      setFormData({ username: '', password: '', nama_satker: '', email: '' })
      alert("Satker berhasil didaftarkan!")
    },
    onError: (err) => {
      alert(err.message)
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const usersList = data?.data || []
  const filteredUsers = usersList.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.satker?.nama_satker || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="card p-6 border-b-4 border-b-blue-600 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
               <UsersIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Manajemen Akses & Pengguna</h2>
              <p className="text-sm text-slate-500">Kelola akun kredensial untuk satuan kerja (Pengadilan Negeri).</p>
            </div>
          </div>
          
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary gap-2">
            <Plus size={18} /> Tambah Satker PN
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center relative max-w-md">
        <Search className="w-5 h-5 text-slate-400 absolute left-3" />
        <input 
           type="text" 
           placeholder="Cari berdasarkan username / institusi..." 
           value={searchTerm}
           onChange={e => setSearchTerm(e.target.value)}
           className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      {/* User Table (List) */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Memuat data pengguna...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-6 py-4">Nama Institusi / Jabatan</th>
                  <th className="px-6 py-4">Username Login</th>
                  <th className="px-6 py-4">Hak Akses (Role)</th>
                  <th className="px-6 py-4">Email Reminder Terdaftar</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {user.satker?.nama_satker ? (
                        <div className="flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-slate-400" />
                          <span>{user.satker.nama_satker}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Pimpinan PT / Admin PT</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 font-mono text-xs">{user.username}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded text-[0.65rem] font-bold tracking-wider uppercase
                          ${user.role === 'ADMIN_PT' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'PIMPINAN' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }
                       `}>
                          {user.role.replace('_', ' ')}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       {user.email ? (
                          <span className="text-slate-600 flex items-center gap-1.5"><Mail className="w-4 h-4 text-emerald-500" /> {user.email}</span>
                       ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                       )}
                    </td>
                    <td className="px-6 py-4 flex items-center gap-1 text-emerald-600 font-medium">
                       <CheckCircle size={16} /> Aktif
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <div className="text-center py-10 text-slate-400">Tidak ada data pengguna.</div>}
          </div>
        )}
      </div>

      {/* MODAL TAMBAH USER SATKER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
             <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><MailPlus size={18}/> Daftarkan Akun Satker PN</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">tutup</button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Nama Satker (Institusi)</label>
                  <input 
                    type="text" required placeholder="Cth: Pengadilan Negeri Batam"
                    value={formData.nama_satker} onChange={e => setFormData({...formData, nama_satker: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Username Login</label>
                    <input 
                      type="text" required placeholder="pn_batam_baru" 
                      value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                    <input 
                      type="text" required placeholder="••••••••" 
                      value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Email Resmi (Untuk Reminder Autodeploy)</label>
                  <input 
                    type="email" required placeholder="pengadilan@domain.go.id"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <p className="text-[11px] text-slate-500 ml-1 mt-1">Sistem BullMQ Worker akan mengirim email ke alamat ini pada H-3 dan H-1 deadline laporan.</p>
                </div>

               <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Batal</button>
                 <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
                    {createMutation.isPending ? 'Menyimpan...' : 'Buat Akun & Satker'}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

    </div>
  )
}
