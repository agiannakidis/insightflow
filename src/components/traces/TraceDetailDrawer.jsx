import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import JsonViewer from '../common/JsonViewer';

function formatDuration(ns) {
  if (!ns) return '—';
  const ms = ns / 1000000;
  if (ms < 1) return `${(ns / 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function SpanTree({ spans, rootId = null, depth = 0 }) {
  const children = spans.filter(s => (s.ParentSpanId || '') === (rootId || ''));
  if (children.length === 0) return null;

  const minTs = Math.min(...spans.map(s => new Date(s.Timestamp).getTime()));
  const maxTs = Math.max(...spans.map(s => new Date(s.Timestamp).getTime() + s.Duration / 1000000));
  const totalMs = maxTs - minTs || 1;

  return (
    <div>
      {children.map(span => {
        const spanStart = (new Date(span.Timestamp).getTime() - minTs) / totalMs * 100;
        const spanWidth = Math.max((span.Duration / 1000000 / totalMs) * 100, 0.5);
        const isError = span.StatusCode === 'STATUS_CODE_ERROR';
        return (
          <div key={span.SpanId}>
            <div className="flex items-center gap-2 py-1 px-2 hover:bg-zinc-800/40 rounded transition-colors" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
              <div className="w-32 shrink-0 text-xs text-zinc-300 truncate" title={span.SpanName}>{span.SpanName}</div>
              <div className="flex-1 h-5 bg-zinc-900 rounded overflow-hidden relative">
                <div
                  className={`absolute h-full rounded ${isError ? 'bg-red-500/60' : 'bg-violet-500/50'}`}
                  style={{ left: `${spanStart}%`, width: `${spanWidth}%`, minWidth: 3 }}
                />
              </div>
              <div className="w-16 text-right text-xs font-mono text-zinc-400 shrink-0">{formatDuration(span.Duration)}</div>
              <div className={`w-12 text-right text-[10px] shrink-0 ${isError ? 'text-red-400' : 'text-green-400'}`}>
                {span.StatusCode?.replace('STATUS_CODE_', '') || '—'}
              </div>
            </div>
            <SpanTree spans={spans} rootId={span.SpanId} depth={depth + 1} />
          </div>
        );
      })}
    </div>
  );
}

export default function TraceDetailDrawer({ trace, from, to, onClose }) {
  const [allSpans, setAllSpans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');
  const [correlatedLogs, setCorrelatedLogs] = useState([]);

  useEffect(() => {
    if (!trace?.TraceId) return;
    setLoading(true);
    const fetchData = async () => {
      const [spansRes, logsRes] = await Promise.all([
        base44.functions.invoke('clickhouseQuery', {
          type: 'traceDetail',
          params: { trace_id: trace.TraceId, from, to }
        }),
        base44.functions.invoke('clickhouseQuery', {
          type: 'correlatedLogs',
          params: { trace_id: trace.TraceId, from, to, limit: 50 }
        }),
      ]);
      setAllSpans(spansRes.data?.data || []);
      setCorrelatedLogs(logsRes.data?.data || []);
      setLoading(false);
    };
    fetchData().catch(() => setLoading(false));
  }, [trace?.TraceId]);

  const tabs = ['timeline', 'attributes', 'events', 'logs'];
  const LEVEL_COLORS = { error: 'text-red-400', warn: 'text-amber-400', info: 'text-blue-400', debug: 'text-zinc-500' };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl h-full bg-[#0d0d14] border-l border-zinc-800 overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-[#0d0d14] border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">{trace.SpanName}</div>
            <div className="text-xs text-zinc-500 font-mono mt-0.5">{trace.TraceId}</div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1.5 rounded-md hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Summary bar */}
        <div className="px-5 py-3 border-b border-zinc-800 flex gap-4 flex-wrap">
          <div><span className="text-[10px] text-zinc-500 uppercase">Service</span><div className="text-sm text-violet-300 font-medium">{trace.ServiceName}</div></div>
          <div><span className="text-[10px] text-zinc-500 uppercase">Duration</span><div className="text-sm text-zinc-200 font-mono">{formatDuration(trace.Duration)}</div></div>
          <div><span className="text-[10px] text-zinc-500 uppercase">Status</span><div className={`text-sm font-medium ${trace.StatusCode === 'STATUS_CODE_ERROR' ? 'text-red-400' : 'text-green-400'}`}>{trace.StatusCode?.replace('STATUS_CODE_', '') || '—'}</div></div>
          <div><span className="text-[10px] text-zinc-500 uppercase">Round ID</span><div className="text-sm text-zinc-300 font-mono">{trace.round_id ?? '—'}</div></div>
          <div><span className="text-[10px] text-zinc-500 uppercase">Operator</span><div className="text-sm text-zinc-300">{trace.operator_name || '—'}</div></div>
          <div><span className="text-[10px] text-zinc-500 uppercase">Spans</span><div className="text-sm text-zinc-300">{allSpans.length}</div></div>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-800 flex gap-0">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-xs font-medium capitalize transition-colors ${activeTab === t ? 'text-white border-b-2 border-violet-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {t}{t === 'logs' && correlatedLogs.length > 0 && ` (${correlatedLogs.length})`}
            </button>
          ))}
        </div>

        <div className="p-5">
          {loading && <div className="text-center py-8 text-zinc-500 text-sm">Loading trace data…</div>}
          
          {!loading && activeTab === 'timeline' && (
            <div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500 px-2 mb-2">
                <span className="w-32">Span</span>
                <span className="flex-1 text-center">Timeline</span>
                <span className="w-16 text-right">Duration</span>
                <span className="w-12 text-right">Status</span>
              </div>
              <SpanTree spans={allSpans} rootId={null} depth={0} />
              {allSpans.length === 0 && <div className="text-center py-8 text-zinc-500 text-sm">No spans found for this trace</div>}
            </div>
          )}

          {!loading && activeTab === 'attributes' && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-zinc-400 mb-2">Resource Attributes</div>
                <JsonViewer data={trace.ResourceAttributes || {}} />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-400 mb-2">Span Attributes</div>
                <JsonViewer data={trace.SpanAttributes || {}} />
              </div>
            </div>
          )}

          {!loading && activeTab === 'events' && (
            <div className="space-y-2">
              {(trace.EventTimestamps || []).length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">No events</div>
              ) : (trace.EventTimestamps || []).map((ts, i) => (
                <div key={i} className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-zinc-300">{trace.EventNames?.[i] || 'Event'}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{ts}</span>
                  </div>
                  {trace.EventAttributes?.[i] && <JsonViewer data={trace.EventAttributes[i]} />}
                </div>
              ))}
            </div>
          )}

          {!loading && activeTab === 'logs' && (
            <div className="space-y-1.5">
              {correlatedLogs.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">No correlated logs</div>
              ) : correlatedLogs.map((log, i) => (
                <div key={i} className="bg-zinc-900/40 border border-zinc-800/40 rounded-lg px-3 py-2 flex items-start gap-3">
                  <span className={`text-[10px] font-bold uppercase shrink-0 mt-0.5 ${LEVEL_COLORS[log.level?.toLowerCase()] || 'text-zinc-400'}`}>{log.level}</span>
                  <span className="text-xs text-zinc-400 font-mono shrink-0">{new Date(log.ts).toISOString().slice(11, 23)}</span>
                  <span className="text-xs text-zinc-300 break-all">{typeof log.event_json === 'object' ? JSON.stringify(log.event_json).slice(0, 200) : String(log.event_json || '').slice(0, 200)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}