import React, { useEffect, useState } from 'react';
import { apiCall } from '../auth/apiCall';
import { useFilters } from '../filters/FilterContext';

export default function ErrorRateTable() {
  const { from, to } = useFilters();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    base44.functions.invoke('clickhouseQuery', { type: 'errorRateByService', params: { from, to } })
      .then(res => { setData(res.data?.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [from, to]);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4">Error Rate by Service</div>
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-7 bg-zinc-800 rounded animate-pulse" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-6 text-zinc-500 text-xs">No data</div>
      ) : (
        <div className="space-y-2">
          {data.map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-violet-300 font-medium w-32 truncate">{row.ServiceName}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${parseFloat(row.error_rate) > 10 ? 'bg-red-500' : parseFloat(row.error_rate) > 5 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(parseFloat(row.error_rate) || 0, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-mono w-12 text-right ${parseFloat(row.error_rate) > 10 ? 'text-red-400' : parseFloat(row.error_rate) > 5 ? 'text-amber-400' : 'text-green-400'}`}>
                {row.error_rate}%
              </span>
              <span className="text-[10px] text-zinc-600 w-16 text-right">{parseInt(row.total || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}