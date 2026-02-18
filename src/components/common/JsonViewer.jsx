import React, { useState } from 'react';

function JsonNode({ data, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  if (data === null) return <span className="text-zinc-500">null</span>;
  if (typeof data === 'boolean') return <span className="text-amber-400">{data.toString()}</span>;
  if (typeof data === 'number') return <span className="text-blue-400">{data}</span>;
  if (typeof data === 'string') {
    const isLong = data.length > 100;
    return <span className="text-green-400">"{isLong ? data.slice(0, 100) + '…' : data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-zinc-400">[]</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(!collapsed)} className="text-zinc-400 hover:text-white text-xs">
          {collapsed ? `▶ [{…} ×${data.length}]` : '▼ ['}
        </button>
        {!collapsed && (
          <>
            <div className="ml-4">
              {data.map((item, i) => (
                <div key={i}>
                  <JsonNode data={item} depth={depth + 1} />
                  {i < data.length - 1 && <span className="text-zinc-600">,</span>}
                </div>
              ))}
            </div>
            <span className="text-zinc-400">]</span>
          </>
        )}
      </span>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-zinc-400">{'{}'}</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(!collapsed)} className="text-zinc-400 hover:text-white text-xs">
          {collapsed ? `▶ {${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '…' : ''}}` : '▼ {'}
        </button>
        {!collapsed && (
          <>
            <div className="ml-4">
              {keys.map((key, i) => (
                <div key={key}>
                  <span className="text-violet-300">"{key}"</span>
                  <span className="text-zinc-500">: </span>
                  <JsonNode data={data[key]} depth={depth + 1} />
                  {i < keys.length - 1 && <span className="text-zinc-600">,</span>}
                </div>
              ))}
            </div>
            <span className="text-zinc-400">{'}'}</span>
          </>
        )}
      </span>
    );
  }

  return <span className="text-zinc-300">{String(data)}</span>;
}

export default function JsonViewer({ data, raw }) {
  const [searchTerm, setSearchTerm] = useState('');
  const parsed = React.useMemo(() => {
    if (data) return data;
    if (!raw) return null;
    try { return JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw)); }
    catch { return raw; }
  }, [data, raw]);

  const jsonString = JSON.stringify(parsed, null, 2);
  const highlighted = searchTerm
    ? jsonString.split(searchTerm).join(`<mark class="bg-yellow-400/30 text-yellow-300">${searchTerm}</mark>`)
    : null;

  return (
    <div className="font-mono text-xs">
      <div className="mb-2">
        <input
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search in JSON..."
          className="bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder-zinc-600 rounded-md px-3 py-1.5 text-xs w-full focus:outline-none focus:border-violet-500"
        />
      </div>
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-auto max-h-[500px] leading-relaxed">
        {highlighted ? (
          <pre className="text-zinc-300" dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <JsonNode data={parsed} depth={0} />
        )}
      </div>
    </div>
  );
}