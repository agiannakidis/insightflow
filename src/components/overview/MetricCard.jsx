import React from 'react';

export default function MetricCard({ title, value, subtitle, trend, trendLabel, color = 'violet', icon, loading }) {
  const colors = {
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
        <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="h-8 w-28 bg-zinc-800 rounded animate-pulse mb-2" />
        <div className="h-2.5 w-16 bg-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5 hover:border-zinc-700/60 transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</span>
        {icon && (
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colors[color]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1 tracking-tight">{value ?? '—'}</div>
      {subtitle && <div className="text-xs text-zinc-500">{subtitle}</div>}
      {trend != null && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trend > 0 ? 'text-red-400' : 'text-green-400'}`}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend > 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}