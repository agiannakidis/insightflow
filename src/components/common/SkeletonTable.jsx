import React from 'react';

export default function SkeletonTable({ rows = 10, cols = 6 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex gap-4 px-4 py-3 border-b border-zinc-800/50 ${i % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'}`}>
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-3.5 rounded bg-zinc-800 animate-pulse"
              style={{ width: `${Math.random() * 60 + 40}px`, animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}