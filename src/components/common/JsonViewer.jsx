import React, { useState } from 'react';

function JsonNode({ value, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  if (value === null) return <span className="text-zinc-500">null</span>;
  if (typeof value === 'boolean') return <span className="text-amber-400">{String(value)}</span>;
  if (typeof value === 'number') return <span className="text-blue-400">{value}</span>;
  if (typeof value === 'string') return <span className="text-green-400">"{value}"</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-zinc-500">[]</span>;
    if (collapsed) return (
      <button onClick={() => setCollapsed(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">
        [{value.length} items…]
      </button>
    );
    return (
      <span>
        <button onClick={() => setCollapsed(true)} className="text-zinc-500 hover:text-zinc-300 text-xs mr-1">[−]</button>
        <span className="text-zinc-400">[</span>
        <div style={{ paddingLeft: 16 }}>
          {value.map((v, i) => (
            <div key={i} className="text-xs leading-5">
              <JsonNode value={v} depth={depth + 1} />
              {i < value.length - 1 && <span className="text-zinc-600">,</span>}
            </div>
          ))}
        </div>
        <span className="text-zinc-400">]</span>
      </span>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return <span className="text-zinc-500">{'{}'}</span>;
    if (collapsed) return (
      <button onClick={() => setCollapsed(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">
        {`{${keys.length} keys…}`}
      </button>
    );
    return (
      <span>
        {depth > 0 && <button onClick={() => setCollapsed(true)} className="text-zinc-500 hover:text-zinc-300 text-xs mr-1">{'{−}'}</button>}
        <span className="text-zinc-400">{'{'}</span>
        <div style={{ paddingLeft: 16 }}>
          {keys.map((k, i) => (
            <div key={k} className="text-xs leading-5">
              <span className="text-violet-300">"{k}"</span>
              <span className="text-zinc-400">: </span>
              <JsonNode value={value[k]} depth={depth + 1} />
              {i < keys.length - 1 && <span className="text-zinc-600">,</span>}
            </div>
          ))}
        </div>
        <span className="text-zinc-400">{'}'}</span>
      </span>
    );
  }

  return <span className="text-zinc-300">{String(value)}</span>;
}

export default function JsonViewer({ data, raw }) {
  const [search, setSearch] = useState('');
  let parsed = data;
  if (!parsed && raw) {
    try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }
  }

  if (!parsed) return <div className="text-xs text-zinc-500">No data</div>;

  if (search) {
    const str = JSON.stringify(parsed, null, 2);
    const parts = str.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="mb-2 w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-violet-500"
        />
        <pre className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
          {parts.map((p, i) => p.toLowerCase() === search.toLowerCase()
            ? <mark key={i} className="bg-yellow-400/30 text-yellow-300 rounded">{p}</mark>
            : p
          )}
        </pre>
      </div>
    );
  }

  return (
    <div>
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search..."
        className="mb-2 w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-violet-500"
      />
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-xs font-mono leading-relaxed overflow-x-auto max-h-96 overflow-y-auto">
        <JsonNode value={parsed} depth={0} />
      </div>
    </div>
  );
}