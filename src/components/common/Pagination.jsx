import React from 'react';

const PAGE_SIZES = [25, 50, 100, 200];

export default function Pagination({ pageSize, onPageSizeChange, onNext, onPrev, hasNext, hasPrev, total, queryDuration, sql }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/60">
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500">Rows per page:</span>
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(parseInt(e.target.value))}
          className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-violet-500"
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {total != null && (
          <span className="text-xs text-zinc-500">
            ~{total.toLocaleString()} results
          </span>
        )}
        {queryDuration && (
          <span className="text-xs text-zinc-600">{queryDuration}ms</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 rounded-md transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
          Prev
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 rounded-md transition-colors"
        >
          Next
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}