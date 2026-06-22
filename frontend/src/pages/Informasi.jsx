import React from 'react';

export default function Informasi() {
  const fileUrl = `${import.meta.env.BASE_URL}project-description.html`;
  
  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden h-[85vh] w-full flex flex-col">
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Informasi Sistem</h2>
        <a 
          href={fileUrl} 
          target="_blank" 
          rel="noreferrer"
          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium shadow-md shadow-blue-900/20"
        >
          Buka Tab Baru
        </a>
      </div>
      <iframe 
        src={fileUrl} 
        className="w-full flex-1 border-none bg-slate-950"
        title="Informasi Project Description"
      />
    </div>
  );
}
