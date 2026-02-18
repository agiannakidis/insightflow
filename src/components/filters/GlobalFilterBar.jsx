import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFilters } from './FilterContext';
import { base44 } from '@/api/base44Client';

const TIME_PRESETS = ['15m', '1h', '6h', '24h', '7d', '30d'];

function MultiSelect({ label, value = [], onChange, options = [], placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${value.length ? 'bg-violet-600/20 border border-violet-500/40 text-violet-300' : 'bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 hover:border-zinc-600'}`}
      >
        <span>{label}</span>
        {value.length > 0 && <span className="bg-violet-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{value.length}</span>}
        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl min-w-[180px] py-1 max-h-60 overflow-y-auto">
          {options.length === 0 && <div className="px-3 py-2 text-xs text-zinc-500">No options</div>}
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 cursor-pointer">
              <input type="checkbox" checked={value.includes(opt)} onChange={e => {
                onChange(e.target.checked ? [...value, opt] : value.filter(v => v !== opt));
              }} className="accent-violet-500" />
              <span className="text-xs text-zinc-300">{opt}</span>
            </label>
          ))}
          {value.length > 0 && (
            <button onClick={() => { onChange([]); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-800 border-t border-zinc-800 mt-1">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function GlobalFilterBar({ page = 'logs' }) {
  const { filters, updateFilter, updateFilters, resetFilters, getShareableUrl, from, to, showWarning } = useFilters();
  const [filterOptions, setFilterOptions] = useState({});
  const [copied, setCopied] = useState(false);
  const searchTimer = useRef();
  const [searchInput, setSearchInput] = useState(filters.search || '');

  useEffect(() => {
    const fetchOpts = async (field, table) => {
      try {
        const res = await base44.functions.invoke('clickhouseQuery', { type: 'filterOptions', params: { field, table, from, to } });
        return res.data?.data?.map(r => r.val).filter(Boolean) || [];
      } catch { return []; }
    };

    const loadOpts = async () => {
      const [services, levels, containers, targets, images, statusCodes, spanKinds] = await Promise.all([
        fetchOpts('service', 'logs'),
        fetchOpts('level', 'logs'),
        fetchOpts('container_name', 'logs'),
        fetchOpts('target', 'logs'),
        fetchOpts('image', 'logs'),
        fetchOpts('StatusCode', 'traces'),
        fetchOpts('SpanKind', 'traces'),
      ]);
      setFilterOptions({ services, levels, containers, targets, images, statusCodes, spanKinds });
    };
    loadOpts();
  }, [from, to]);

  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => updateFilter('search', val), 500);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(getShareableUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasActiveFilters = filters.service?.length || filters.level?.length || filters.trace_id ||
    filters.span_id || filters.round_id || filters.operator_name || filters.container_name?.length ||
    filters.target?.length || filters.image?.length || filters.status_code?.length ||
    filters.span_kind?.length || filters.span_name || filters.search ||
    filters.duration_min || filters.duration_max;

  return (
    <div className="sticky top-0 z-40 bg-[#0d0d14]/95 backdrop-blur-md border-b border-zinc-800/60">
      {showWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span className="text-xs text-amber-300">Large time range or full-text search active — query may be slow</span>
        </div>
      )}
      <div className="px-4 py-2.5 flex flex-wrap items-center gap-2">
        {/* Time presets */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {TIME_PRESETS.map(p => (
            <button
              key={p}
              onClick={() => updateFilter('timeRange', p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${filters.timeRange === p ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => updateFilter('timeRange', 'custom')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${filters.timeRange === 'custom' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
          >
            Custom
          </button>
        </div>

        {filters.timeRange === 'custom' && (
          <div className="flex items-center gap-1">
            <input type="datetime-local" value={filters.from?.slice(0,16) || ''} onChange={e => updateFilter('from', e.target.value + ':00.000Z')}
              className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-violet-500"/>
            <span className="text-zinc-600 text-xs">→</span>
            <input type="datetime-local" value={filters.to?.slice(0,16) || ''} onChange={e => updateFilter('to', e.target.value + ':00.000Z')}
              className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-violet-500"/>
          </div>
        )}

        <div className="h-4 w-px bg-zinc-800" />

        {/* Service */}
        <MultiSelect label="Service" value={filters.service || []} onChange={v => updateFilter('service', v)} options={filterOptions.services || []} />
        
        {/* Level (logs only) */}
        {(page === 'logs' || page === 'correlation') && (
          <MultiSelect label="Level" value={filters.level || []} onChange={v => updateFilter('level', v)} options={filterOptions.levels || []} />
        )}

        {/* Traces filters */}
        {(page === 'traces' || page === 'correlation') && (
          <>
            <MultiSelect label="Status" value={filters.status_code || []} onChange={v => updateFilter('status_code', v)} options={filterOptions.statusCodes || []} />
            <MultiSelect label="Kind" value={filters.span_kind || []} onChange={v => updateFilter('span_kind', v)} options={filterOptions.spanKinds || []} />
          </>
        )}

        {/* ID filters */}
        <input
          value={filters.trace_id || ''} onChange={e => updateFilter('trace_id', e.target.value)}
          placeholder="Trace ID"
          className="bg-zinc-900 border border-zinc-700/60 text-zinc-300 text-xs placeholder-zinc-600 rounded-md px-3 py-1.5 w-36 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <input
          value={filters.round_id || ''} onChange={e => updateFilter('round_id', e.target.value)}
          placeholder="Round ID"
          className="bg-zinc-900 border border-zinc-700/60 text-zinc-300 text-xs placeholder-zinc-600 rounded-md px-3 py-1.5 w-28 focus:outline-none focus:border-violet-500 transition-colors"
        />
        {(page === 'traces' || page === 'correlation') && (
          <input
            value={filters.operator_name || ''} onChange={e => updateFilter('operator_name', e.target.value)}
            placeholder="Operator"
            className="bg-zinc-900 border border-zinc-700/60 text-zinc-300 text-xs placeholder-zinc-600 rounded-md px-3 py-1.5 w-28 focus:outline-none focus:border-violet-500 transition-colors"
          />
        )}

        {/* Search */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/60 rounded-md px-3 py-1.5 flex-1 min-w-[200px] max-w-xs">
          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={searchInput} onChange={e => handleSearchChange(e.target.value)}
            placeholder={page === 'logs' ? 'Search event_json...' : 'Search spans...'}
            className="bg-transparent text-zinc-300 text-xs placeholder-zinc-600 flex-1 focus:outline-none"
          />
          {searchInput && <button onClick={() => { setSearchInput(''); updateFilter('search', ''); }} className="text-zinc-500 hover:text-zinc-300">✕</button>}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-md hover:bg-red-500/10">
              Clear all
            </button>
          )}
          <button onClick={copyUrl} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 rounded-md transition-colors">
            {copied ? (
              <><svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg><span className="text-green-400">Copied!</span></>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg><span>Share</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}