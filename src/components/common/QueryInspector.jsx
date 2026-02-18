import React, { useState } from 'react';

export default function QueryInspector({ sql, duration, rowCount, estimatedCount }) {
  const [open, setOpen] = useState(false);

  if (!sql) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
        <span>SQL Inspector</span>
        {duration && <span className="text-zinc-600">· {duration}ms</span>}
        {rowCount != null && <span className="text-zinc-600">· {rowCount.toLocaleString()} rows{estimatedCount ? ' (est.)' : ''}</span>}
      </button>
      {open && (
        <div className="mt-2 relative">
          <pre className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-300 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
            {sql}
          </pre>
          <button
            onClick={() => navigator.clipboard.writeText(sql)}
            className="absolute top-2 right-2 text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded px-2 py-1 transition-colors"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}