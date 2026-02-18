import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../components/auth/AuthContext';
import LoginPage from '../components/auth/LoginPage';
import { FilterProvider, useFilters } from '../components/filters/FilterContext';
import GlobalFilterBar from '../components/filters/GlobalFilterBar';
import LogsTable from '../components/logs/LogsTable';
import TracesTable from '../components/traces/TracesTable';

function CorrelationInner() {
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const { updateFilter } = useFilters();

  const handleSelectLog = (log) => {
    setSelectedLog(log);
    if (log.trace_id) {
      setSelectedTrace(null);
      updateFilter('trace_id', log.trace_id);
    }
  };

  const handleSelectTrace = (trace) => {
    setSelectedTrace(trace);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <GlobalFilterBar page="correlation" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Logs */}
        <div className="flex-1 border-r border-zinc-800/60 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Logs</span>
            {selectedLog && (
              <span className="ml-2 text-xs text-zinc-500">
                Selected: <span className="text-violet-400 font-mono">{selectedLog.trace_id?.slice(0, 12)}…</span>
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            <LogsTable
              onSelectLog={handleSelectLog}
              compact
            />
          </div>
        </div>

        {/* Right: Traces */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Traces</span>
            {selectedTrace && (
              <span className="ml-2 text-xs text-zinc-500">
                Selected: <span className="text-violet-400 font-mono">{selectedTrace.SpanName}</span>
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            <TracesTable
              onSelectTrace={handleSelectTrace}
              selectedTraceId={selectedLog?.trace_id}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Correlation() {
  return (
    <AuthProvider>
      <AuthGate>
        <FilterProvider>
          <CorrelationInner />
        </FilterProvider>
      </AuthGate>
    </AuthProvider>
  );
}

function AuthGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <LoginPage />;
  return children;
}