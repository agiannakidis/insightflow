import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { base44 } from '@/api/base44Client';
import { useFilters } from '../filters/FilterContext';

const SERVICE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export default function TracesVolumeChart() {
  const { from, to, interval, filters } = useFilters();
  const [data, setData] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    base44.functions.invoke('clickhouseQuery', {
      type: 'tracesVolume',
      params: { from, to, interval, service: filters.service?.length ? filters.service : undefined }
    }).then(res => {
      const raw = res.data?.data || [];
      const buckets = {};
      const svcs = new Set();
      raw.forEach(row => {
        const b = row.bucket?.slice(0, 16) || '';
        if (!buckets[b]) buckets[b] = { time: b };
        buckets[b][row.ServiceName] = (buckets[b][row.ServiceName] || 0) + parseInt(row.cnt || 0);
        svcs.add(row.ServiceName);
      });
      setData(Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time)));
      setServices([...svcs]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [from, to, interval, filters.service]);

  if (loading) return <div className="h-48 bg-zinc-900/40 rounded-xl animate-pulse" />;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4">Trace Count by Service</div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11, color: '#e4e4e7' }} />
          <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
          {services.map((s, i) => (
            <Bar key={s} dataKey={s} stackId="a" fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}