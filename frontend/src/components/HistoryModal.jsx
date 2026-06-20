import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Clock, Upload, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import api from '../lib/axios';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function HistoryModal({ submissionId, onClose }) {
  const containerRef = useFocusTrap(!!submissionId);

  // Close on Escape
  useEffect(() => {
    if (!submissionId) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [submissionId, onClose]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['report-history', submissionId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/reports/${submissionId}/history`);
      return res?.data?.data ?? res?.data ?? res;
    },
    enabled: !!submissionId,
  });

  const handleDownloadHistory = async (historyId) => {
    try {
      const res = await api.get(`/api/v1/reports/history/${historyId}/download`);
      const url = res?.data?.url ?? res?.url ?? res?.data?.data?.url;
      if (url) {
        window.open(url, '_blank');
      } else {
        alert('Tautan unduh tidak tersedia.');
      }
    } catch (err) {
      alert('Gagal mengunduh file versi riwayat: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!submissionId) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10 shrink-0">
          <div>
            <h2 id="history-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
              <Clock size={20} className="text-blue-400" />
              Riwayat Dokumen
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">Memuat riwayat...</div>
          ) : isError ? (
            <div className="py-8 text-center text-red-400">Gagal memuat riwayat: {error?.message}</div>
          ) : !data || data.length === 0 ? (
            <div className="py-8 text-center text-slate-400">Belum ada riwayat tercatat.</div>
          ) : (
            <div className="relative border-l border-slate-700 ml-3 space-y-6 pb-2">
              {data.map((item) => {
                let Icon = Clock;
                let iconColor = "text-slate-400";
                let bgColor = "bg-slate-800";

                if (item.action_type === 'UPLOAD' || item.action_type === 'REUPLOAD') {
                  Icon = Upload;
                  iconColor = "text-blue-400";
                  bgColor = "bg-blue-500/20";
                } else if (item.action_type === 'VERIFY_OK') {
                  Icon = CheckCircle2;
                  iconColor = "text-emerald-400";
                  bgColor = "bg-emerald-500/20";
                } else if (item.action_type === 'VERIFY_REVISI') {
                  Icon = AlertCircle;
                  iconColor = "text-amber-400";
                  bgColor = "bg-amber-500/20";
                }

                return (
                  <div key={item.id} className="relative pl-6">
                    <div className={`absolute -left-3.5 top-0 w-7 h-7 rounded-full ${bgColor} border border-slate-700 flex items-center justify-center`}>
                      <Icon size={14} className={iconColor} />
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-white text-sm">{item.action_type}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(item.created_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mb-2">
                        Oleh: <span className="font-medium text-slate-200">{item.actor_name || item.actor}</span> ({item.actor_role || item.actor})
                      </div>
                      {item.catatan && (
                        <div className="text-xs text-slate-400 bg-black/20 p-2 rounded italic">
                          "{item.catatan}"
                        </div>
                      )}
                      {(item.action_type === 'UPLOAD' || item.action_type === 'REUPLOAD') && (
                        <button
                          onClick={() => handleDownloadHistory(item.id)}
                          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded text-xs font-medium transition-colors"
                        >
                          <Download size={14} /> Unduh Dokumen Versi Ini
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}