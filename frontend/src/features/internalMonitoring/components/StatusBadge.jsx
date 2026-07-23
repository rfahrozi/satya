import React from 'react';

const statusConfig = {
  NOT_STARTED: { label: 'Belum Mulai', color: 'bg-slate-800 text-slate-300 border border-slate-600' },
  IN_PROGRESS: { label: 'Sedang Berjalan', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  AWAITING_APPROVAL: { label: 'Menunggu Approval', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  AWAITING_VERIFICATION: { label: 'Menunggu Verifikasi', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  REVISION: { label: 'Revisi', color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  VERIFIED: { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-slate-700 text-slate-400' },
  NOT_APPLICABLE: { label: 'Tidak Berlaku', color: 'bg-slate-700 text-slate-400' },
};

export const StatusBadge = ({ status, className = '' }) => {
  const config = statusConfig[status] || { label: status, color: 'bg-slate-800 text-slate-300' };
  
  return (
    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color} ${className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
