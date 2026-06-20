import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const queryClient = useQueryClient();

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => api.get('/api/v1/notifications').then(res => res.data?.data || []),
        refetchInterval: 30000, // Polling setiap 30 detik
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const markAsReadMutation = useMutation({
        mutationFn: (id) => api.patch(`/api/v1/notifications/${id}/read`),
        onSuccess: () => queryClient.invalidateQueries(['notifications']),
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => api.patch('/api/v1/notifications/read-all'),
        onSuccess: () => queryClient.invalidateQueries(['notifications']),
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notif) => {
        if (!notif.is_read) {
            markAsReadMutation.mutate(notif.id);
        }
        // Jika perlu navigasi, bisa ditambahkan di sini
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 60) return `${diffMins} mnt lalu`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} jam lalu`;
        return `${Math.floor(diffMins / 1440)} hari lalu`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Notifikasi"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-semibold text-slate-800 text-sm">Notifikasi</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={() => markAllAsReadMutation.mutate()}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Tandai semua dibaca
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[350px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-slate-500 text-sm">
                                <Bell className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                Belum ada notifikasi
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((notif) => (
                                    <div 
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-0.5">
                                                {notif.title.includes('Diterima') ? (
                                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                                ) : notif.title.includes('Revisi') ? (
                                                    <AlertCircle size={16} className="text-amber-500" />
                                                ) : (
                                                    <Bell size={16} className="text-blue-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notif.is_read ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                                                    {notif.title}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-slate-400">
                                                    <Clock size={10} />
                                                    {formatTime(notif.created_at)}
                                                </div>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
