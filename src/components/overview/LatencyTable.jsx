import React, { useEffect, useState } from 'react';
import { apiCall } from '../auth/apiCall';
import { useFilters } from '../filters/FilterContext';

function fmt(ms) {
  if (ms == null) return '—';
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function LatencyTable() {
  const { from, to } = useFilters();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiCall('clickhouseQuery', { type: 'latencyPercentiles', params: { from, to } })
      .then(res => { setData(res.data?.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [from, to]);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4">Latency Percentiles</div>
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-7 bg-zinc-800 rounded animate-pulse" />)}</div>
      ) : data.length === 0 ? (
        <div className="text-center py-6 text-zinc-500 text-xs">No data</div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800/60">
              <th className="text-left py-2 text-zinc-500 font-medium">Service</th>
              <th className="text-right py-2 text-zinc-500 font-medium">p50</th>
              <th className="text-right py-2 text-zinc-500 font-medium">p95</th>
              <th className="text-right py-2 text-zinc-500 font-medium">p99</th>
              <th className="text-right py-2 text-zinc-500 font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                <td className="py-2 text-violet-300 font-medium truncate max-w-[120px]">{row.ServiceName}</td>
                <td className="py-2 text-right text-green-400 font-mono">{fmt(row.p50_ms)}</td>
                <td className={`py-2 text-right font-mono ${parseFloat(row.p95_ms) > 1000 ? 'text-amber-400' : 'text-zinc-300'}`}>{fmt(row.p95_ms)}</td>
                <td className={`py-2 text-right font-mono ${parseFloat(row.p99_ms) > 1000 ? 'text-red-400' : 'text-zinc-300'}`}>{fmt(row.p99_ms)}</td>
                <td className="py-2 text-right text-zinc-500">{parseInt(row.cnt || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}