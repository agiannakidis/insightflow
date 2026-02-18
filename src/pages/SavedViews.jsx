import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AuthProvider, useAuth } from '../components/auth/AuthContext';
import LoginPage from '../components/auth/LoginPage';
import { createPageUrl } from '@/utils';

const PAGE_ICONS = {
  logs: '📋',
  traces: '⚡',
  correlation: '🔗',
  overview: '📊',
};

function SavedViewsInner() {
  const { user } = useAuth();
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    const all = await base44.entities.SavedView.list('-created_date', 100);
    setViews(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    setDeleting(id);
    await base44.entities.SavedView.delete(id);
    setViews(v => v.filter(x => x.id !== id));
    setDeleting(null);
  };

  const handleOpen = (view) => {
    const pageMap = { logs: 'Logs', traces: 'Traces', correlation: 'Correlation', overview: 'Overview' };
    const pageName = pageMap[view.page] || 'Logs';
    let filters = {};
    try { filters = JSON.parse(view.filters); } catch {}
    const encoded = btoa(JSON.stringify(filters));
    window.location.href = createPageUrl(`${pageName}?f=${encoded}`);
  };

  const formatDate = (d) => {
    try { return new Date(d).toLocaleString(); } catch { return d; }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-white">Saved Views</h1>
        </div>
        <a href={createPageUrl('Overview')} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Back to Overview
        </a>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-zinc-900/50 border border-zinc-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : views.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">No saved views yet</p>
            <p className="text-zinc-600 text-xs mt-1">Use the "Save View" button in any explorer to save your current filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {views.map(view => (
              <div key={view.id} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-zinc-700/60 transition-colors group">
                <span className="text-lg">{PAGE_ICONS[view.page] || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{view.name}</span>
                    {view.is_public && (
                      <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded">Public</span>
                    )}
                    <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded capitalize">{view.page}</span>
                  </div>
                  {view.description && <p className="text-xs text-zinc-500 mt-0.5 truncate">{view.description}</p>}
                  <p className="text-[10px] text-zinc-600 mt-0.5">{formatDate(view.created_date)}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpen(view)}
                    className="text-xs text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-md px-3 py-1.5 transition-colors"
                  >
                    Open
                  </button>
                  {(user?.role === 'admin' || view.owner_id === user?.id) && (
                    <button
                      onClick={() => handleDelete(view.id)}
                      disabled={deleting === view.id}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
                    >
                      {deleting === view.id ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SavedViews() {
  return (
    <AuthProvider>
      <AuthGate>
        <SavedViewsInner />
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