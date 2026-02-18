import React from 'react';

const PAGE_SIZES = [25, 50, 100, 200];

export default function Pagination({ pageSize, onPageSizeChange, onNext, onPrev, hasNext, hasPrev, total, queryDuration }) {
  return (
    <div className="px-4 py-2.5 flex items-center gap-4 text-xs text-zinc-500">
      <div className="flex items-center gap-1.5">
        <span>Rows:</span>
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md">
          {PAGE_SIZES.map(s => (
            <button
              key={s}
              onClick={() => onPageSizeChange(s)}
              className={`px-2 py-1 transition-colors ${pageSize === s ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {total != null && (
        <span className="text-zinc-600">{parseInt(total).toLocaleString()} total</span>
      )}
      {queryDuration != null && (
        <span className="text-zinc-700">{queryDuration}ms</span>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="px-3 py-1.5 rounded-md bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-300"
        >
          ← Prev
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="px-3 py-1.5 rounded-md bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-300"
        >
          Next →
        </button>
      </div>
    </div>
  );
}