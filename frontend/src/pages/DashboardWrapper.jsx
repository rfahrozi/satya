import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardPN from './Dashboard';
import ExecutiveDashboardPT from '../features/internalMonitoring/pages/ExecutiveDashboard';

export default function DashboardWrapper() {
  const [activeTab, setActiveTab] = useState('pn'); // 'pn' atau 'pt'
  
  return (
    <div className="space-y-6">
      {/* ─── Header & Tab Switcher ────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-2 shadow-sm flex flex-col sm:flex-row p-1.5 gap-2 sticky top-4 z-40">
        <button
          onClick={() => setActiveTab('pn')}
          className={`flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 ${
            activeTab === 'pn'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeTab === 'pn' ? 'bg-white/20' : 'bg-slate-800'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>
          </div>
          Pengawasan Eksternal (PN)
        </button>
        <button
          onClick={() => setActiveTab('pt')}
          className={`flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 ${
            activeTab === 'pt'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeTab === 'pt' ? 'bg-white/20' : 'bg-slate-800'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
          </div>
          Evaluasi Internal (PT)
        </button>
      </div>

      {/* ─── Konten Aktif ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'pn' && (
          <motion.div
            key="pn-dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <DashboardPN />
          </motion.div>
        )}
        
        {activeTab === 'pt' && (
          <motion.div
            key="pt-dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <ExecutiveDashboardPT />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
