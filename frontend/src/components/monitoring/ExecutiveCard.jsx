import React from 'react';

export function ExecutiveCard({ title, value, subtitle, icon, color = 'blue' }) {
  const colors = {
    blue:   'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20',
    emerald:'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    amber:  'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20',
    red:    'from-red-500/20 to-red-500/5 text-red-400 border-red-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20',
  };

  const css = colors[color] || colors.blue;

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150`}></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-2.5 rounded-xl bg-linear-to-br ${css} shadow-inner`}>
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider">{title}</h3>
        <div className="text-3xl font-black text-white tracking-tight mb-2">{value}</div>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}
