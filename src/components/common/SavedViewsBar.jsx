import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useFilters } from '../filters/FilterContext';
import { useAuth } from '../auth/AuthContext';
import { createPageUrl } from '@/utils';

export default function SavedViewsBar({ page }) {
  const { filters, getShareableUrl } = useFilters();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', is_public: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    await base44.entities.SavedView.create({
      name: form.name,
      description: form.description,
      page,
      filters: JSON.stringify(filters),
      owner_id: user?.id,
      is_public: form.is_public,
    });
    setSaving(false);
    setSaved(true);
    setModal(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyCurl = () => {
    const curl = `curl -X POST '${window.location.origin}/api/functions/clickhouseQuery' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify({ type: page === 'logs' ? 'logsList' : 'tracesList', params: filters }, null, 2)}'`;
    navigator.clipboard.writeText(curl);
  };

  return (
    <>
      <div className="px-4 py-2 border-b border-zinc-800/40 flex items-center gap-2 bg-[#0a0a0f]/80">
        <a href={createPageUrl('SavedViews')} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Saved Views
        </a>
        <span className="text-zinc-700">·</span>
        <button
          onClick={() => { setModal(true); setForm({ name: '', description: '', is_public: false }); }}
          className="text-xs text-zinc-500 hover:text-violet-400 transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
          {saved ? <span className="text-green-400">Saved!</span> : 'Save View'}
        </button>
        <span className="text-zinc-700">·</span>
        <button onClick={handleCopyCurl} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Copy as cURL
        </button>
        <span className="text-zinc-700">·</span>
        <button
          onClick={() => navigator.clipboard.writeText(JSON.stringify(filters, null, 2))}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Copy Filters JSON
        </button>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-sm font-semibold text-white mb-4">Save View</h2>
            <div className="space-y-3">
              <input
                placeholder="View name *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-violet-500"
              />
              <input
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-violet-500"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_public}
                  onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))}
                  className="accent-violet-500"
                />
                <span className="text-xs text-zinc-400">Make public (visible to all users)</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setModal(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg py-2.5 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.name}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs rounded-lg py-2.5 transition-colors">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}