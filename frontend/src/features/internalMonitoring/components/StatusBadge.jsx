import React from 'react';

const statusConfig = {
  NOT_STARTED: { label: 'Belum Mulai', color: 'bg-gray-100 text-gray-800' },
  IN_PROGRESS: { label: 'Sedang Berjalan', color: 'bg-blue-100 text-blue-800' },
  AWAITING_APPROVAL: { label: 'Menunggu Approval', color: 'bg-yellow-100 text-yellow-800' },
  AWAITING_VERIFICATION: { label: 'Menunggu Verifikasi', color: 'bg-purple-100 text-purple-800' },
  REVISION: { label: 'Revisi', color: 'bg-red-100 text-red-800' },
  VERIFIED: { label: 'Verified', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-gray-200 text-gray-500' },
  NOT_APPLICABLE: { label: 'Tidak Berlaku', color: 'bg-gray-200 text-gray-500' },
};

export const StatusBadge = ({ status, className = '' }) => {
  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  
  return (
    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color} ${className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
