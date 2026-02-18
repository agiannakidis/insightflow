import React from 'react';

export default function SkeletonTable({ rows = 8, cols = 6 }) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-3 px-4 py-2.5 border-b border-zinc-800/40">
          {Array.from({ length: cols }).map((_, ci) => (
            <div
              key={ci}
              className="h-3.5 bg-zinc-800 rounded animate-pulse"
              style={{ width: `${[12, 10, 6, 8, 14, 30][ci % 6]}%`, minWidth: 40 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}