import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useFilters } from '../filters/FilterContext';
import SkeletonTable from '../common/SkeletonTable';
import Pagination from '../common/Pagination';
import QueryInspector from '../common/QueryInspector';
import TraceDetailDrawer from './TraceDetailDrawer';

const STATUS_COLORS = {
  STATUS_CODE_ERROR: 'text-red-400 bg-red-400/10',
  STATUS_CODE_OK: 'text-green-400 bg-green-400/10',
  STATUS_CODE_UNSET: 'text-zinc-400 bg-zinc-800',
};

const KIND_COLORS = {
  SPAN_KIND_SERVER: 'text-blue-400',
  SPAN_KIND_CLIENT: 'text-violet-400',
  SPAN_KIND_PRODUCER: 'text-amber-400',
  SPAN_KIND_CONSUMER: 'text-green-400',
  SPAN_KIND_INTERNAL: 'text-zinc-400',
};

function formatDuration(ns) {
  if (!ns) return '—';
  const ms = ns / 1000000;
  if (ms < 1) return `${(ns / 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function TracesTable({ compact = false, onSelectTrace, selectedTraceId: highlightedTraceId }) {
  const { filters, from, to } = useFilters();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([]);
  const [pageSize, setPageSize] = useState(50);
  const [lastSql, setLastSql] = useState('');
  const [queryDuration, setQueryDuration] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);

  const fetchTraces = useCallback(async (cur) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        from, to,
        service: filters.service?.length ? filters.service : undefined,
        trace_id: filters.trace_id || undefined,
        span_id: filters.span_id || undefined,
        round_id: filters.round_id !== '' ? filters.round_id : undefined,
        operator_name: filters.operator_name || undefined,
        status_code: filters.status_code?.length ? filters.status_code : undefined,
        span_kind: filters.span_kind?.length ? filters.span_kind : undefined,
        span_name: filters.span_name || undefined,
        duration_min: filters.duration_min || undefined,
        duration_max: filters.duration_max || undefined,
        cursor: cur || undefined,
        limit: pageSize,
      };

      const [tracesRes, countRes] = await Promise.all([
        base44.functions.invoke('clickhouseQuery', { type: 'tracesList', params }),
        cur ? Promise.resolve(null) : base44.functions.invoke('clickhouseQuery', { type: 'tracesCount', params }),
      ]);

      setRows(tracesRes.data?.data || []);
      setLastSql(tracesRes.data?.sql || '');
      setQueryDuration(tracesRes.data?.queryDuration);
      if (countRes) setTotalCount(countRes.data?.data?.[0]?.cnt);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, filters, pageSize]);

  useEffect(() => {
    setCursor(null);
    setCursorStack([]);
    fetchTraces(null);
  }, [from, to, filters, pageSize]);

  const handleNext = () => {
    if (rows.length < pageSize) return;
    const last = rows[rows.length - 1];
    const newCursor = [last.Timestamp, last.TraceId, last.SpanId];
    setCursorStack(prev => [...prev, cursor]);
    setCursor(newCursor);
    fetchTraces(newCursor);
  };

  const handlePrev = () => {
    const stack = [...cursorStack];
    const prevCursor = stack.pop();
    setCursorStack(stack);
    setCursor(prevCursor);
    fetchTraces(prevCursor);
  };

  const handleRowClick = (row) => {
    if (onSelectTrace) onSelectTrace(row);
    else setSelectedTrace(row);
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    try { return new Date(ts).toISOString().replace('T', ' ').slice(0, 23); }
    catch { return ts; }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
        )}
        <table className="w-full text-xs border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-zinc-800">
              <th className="text-left px-4 py-2.5 text-zinc-400 font-medium w-44">Timestamp</th>
              <th className="text-left px-3 py-2.5 text-zinc-400 font-medium w-28">Service</th>
              <th className="text-left px-3 py-2.5 text-zinc-400 font-medium">Span Name</th>
              <th className="text-left px-3 py-2.5 text-zinc-400 font-medium w-28">Kind</th>
              <th className="text-left px-3 py-2.5 text-zinc-400 font-medium w-24">Duration</th>
              <th className="text-left px-3 py-2.5 text-zinc-400 font-medium w-28">Status</th>
              <th className="text-left px-3 py-2.5 text-zinc-400 font-medium w-20">Round ID</th>
              <th className="text-left px-3 py-2.5 text-zinc-400 font-medium w-32">Trace ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><SkeletonTable rows={10} cols={8} /></td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-zinc-500 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    No traces found
                  </div>
                </td>
              </tr>
            ) : rows.map((row, i) => {
              const statusClass = STATUS_COLORS[row.StatusCode] || 'text-zinc-400 bg-zinc-800';
              const kindClass = KIND_COLORS[row.SpanKind] || 'text-zinc-400';
              const isHighlighted = highlightedTraceId && row.TraceId === highlightedTraceId;
              return (
                <tr
                  key={i}
                  onClick={() => handleRowClick(row)}
                  className={`border-b border-zinc-800/40 hover:bg-zinc-800/30 cursor-pointer transition-colors ${isHighlighted ? 'bg-violet-900/20 border-violet-800/40' : ''}`}
                >
                  <td className="px-4 py-2.5 font-mono text-zinc-400 whitespace-nowrap">{formatTs(row.Timestamp)}</td>
                  <td className="px-3 py-2.5 text-violet-300 font-medium">{row.ServiceName || '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-200">{row.SpanName || '—'}</td>
                  <td className={`px-3 py-2.5 font-medium text-[10px] ${kindClass}`}>
                    {row.SpanKind?.replace('SPAN_KIND_', '') || '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono">
                    <span className={parseInt(row.Duration) > 1000000000 ? 'text-red-400' : parseInt(row.Duration) > 100000000 ? 'text-amber-400' : 'text-green-400'}>
                      {formatDuration(row.Duration)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusClass}`}>
                      {row.StatusCode?.replace('STATUS_CODE_', '') || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400 font-mono">{row.round_id ?? '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-zinc-500 text-[10px]">
                    {row.TraceId ? row.TraceId.slice(0, 12) + '…' : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-zinc-800/60">
        <Pagination
          pageSize={pageSize}
          onPageSizeChange={(s) => { setPageSize(s); setCursor(null); setCursorStack([]); }}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={rows.length >= pageSize}
          hasPrev={cursorStack.length > 0}
          total={totalCount}
          queryDuration={queryDuration}
        />
        <div className="px-4 pb-3">
          <QueryInspector sql={lastSql} duration={queryDuration} rowCount={totalCount} />
        </div>
      </div>

      {selectedTrace && (
        <TraceDetailDrawer trace={selectedTrace} from={from} to={to} onClose={() => setSelectedTrace(null)} />
      )}
    </div>
  );
}