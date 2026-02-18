import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { base44 } from '@/api/base44Client';
import { useFilters } from '../filters/FilterContext';

const LEVEL_FILL = {
  error: '#ef4444',
  warn: '#f59e0b',
  warning: '#f59e0b',
  info: '#3b82f6',
  debug: '#6b7280',
  trace: '#8b5cf6',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs shadow-xl">
      <div className="text-zinc-400 mb-1.5">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-300">{p.dataKey}: {p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function LogsVolumeChart() {
  const { from, to, interval, filters } = useFilters();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState([]);

  useEffect(() => {
    setLoading(true);
    base44.functions.invoke('clickhouseQuery', {
      type: 'logsVolume',
      params: { from, to, interval, service: filters.service?.length ? filters.service : undefined }
    }).then(res => {
      const raw = res.data?.data || [];
      const buckets = {};
      const lvls = new Set();
      raw.forEach(row => {
        const b = row.bucket?.slice(0, 16) || '';
        if (!buckets[b]) buckets[b] = { time: b };
        buckets[b][row.level] = (buckets[b][row.level] || 0) + parseInt(row.cnt || 0);
        lvls.add(row.level);
      });
      setData(Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time)));
      setLevels([...lvls]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [from, to, interval, filters.service]);

  if (loading) return <div className="h-48 bg-zinc-900/40 rounded-xl animate-pulse" />;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4">Log Volume by Level</div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            {levels.map(l => (
              <linearGradient key={l} id={`grad-${l}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={LEVEL_FILL[l] || '#6b7280'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={LEVEL_FILL[l] || '#6b7280'} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
          {levels.map(l => (
            <Area key={l} type="monotone" dataKey={l} stackId="1"
              stroke={LEVEL_FILL[l] || '#6b7280'} fill={`url(#grad-${l})`} strokeWidth={1.5} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}