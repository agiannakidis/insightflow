import React, { useEffect, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { apiCall } from '../auth/apiCall';
import { useFilters } from '../filters/FilterContext';

export default function AnomalyChart() {
  const { from, to } = useFilters();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avgErrors, setAvgErrors] = useState(0);

  useEffect(() => {
    setLoading(true);
    base44.functions.invoke('clickhouseQuery', {
      type: 'anomalyDetection',
      params: { from, to }
    }).then(res => {
      const raw = res.data?.data || [];
      const processed = raw.map(r => ({
        time: (r.bucket || '').slice(11, 16),
        errors: parseInt(r.error_count || 0),
        total: parseInt(r.total_count || 0),
        error_rate: parseInt(r.total_count) > 0 ? parseFloat(((r.error_count / r.total_count) * 100).toFixed(1)) : 0,
      }));
      const avg = processed.length ? processed.reduce((s, r) => s + r.errors, 0) / processed.length : 0;
      setAvgErrors(avg);
      setData(processed);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [from, to]);

  const spikes = data.filter(d => d.errors > avgErrors * 2);

  if (loading) return <div className="h-40 bg-zinc-900/40 rounded-xl animate-pulse" />;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Error Activity</div>
        {spikes.length > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1">
            <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span className="text-xs text-amber-400">{spikes.length} spike{spikes.length > 1 ? 's' : ''} detected</span>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
          <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11, color: '#e4e4e7' }} />
          {avgErrors > 0 && <ReferenceLine yAxisId="left" y={avgErrors * 2} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={{ value: '2x avg', fill: '#f59e0b', fontSize: 9, position: 'right' }} />}
          <Bar yAxisId="left" dataKey="errors" fill="#ef4444" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="error_rate" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}