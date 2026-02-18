import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AuthProvider, useAuth } from '../components/auth/AuthContext';
import LoginPage from '../components/auth/LoginPage';

import { createPageUrl } from '@/utils';

function AdminInner() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm">Access denied — Admin only</p>
          <a href={createPageUrl('Overview')} className="text-xs text-zinc-500 hover:text-zinc-300 mt-2 inline-block">← Overview</a>
        </div>
      </div>
    );
  }

  const invoke = (action, extra = {}) =>
    base44.functions.invoke('adminUsers', { action, token, ...extra });

  const loadUsers = async () => {
    setLoading(true);
    const res = await invoke('listUsers');
    setUsers(res.data?.users || []);
    setLoading(false);
  };

  const loadAudit = async () => {
    setLoading(true);
    const res = await invoke('listAuditLog');
    setAuditLogs(res.data?.logs || []);
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'audit') loadAudit();
  }, [tab]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const handleCreateUser = async () => {
    if (!form.username || !form.password) return;
    setSubmitting(true);
    await invoke('createUser', { username: form.username, email: form.email, password: form.password, role: form.role || 'viewer' });
    flash('User created');
    setModal(null);
    setForm({});
    loadUsers();
    setSubmitting(false);
  };

  const handleDisable = async (u) => {
    await invoke(u.is_active ? 'disableUser' : 'enableUser', { userId: u.id });
    loadUsers();
  };

  const handleResetPassword = async () => {
    if (!form.newPassword) return;
    setSubmitting(true);
    await invoke('resetPassword', { userId: modal.user.id, newPassword: form.newPassword });
    flash('Password reset');
    setModal(null);
    setForm({});
    setSubmitting(false);
  };

  const handleChangeRole = async (u, role) => {
    await invoke('changeRole', { userId: u.id, newRole: role });
    loadUsers();
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString(); } catch { return d; }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-white">Admin</h1>
        </div>
        <a href={createPageUrl('Overview')} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Overview
        </a>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 flex px-6">
        {['users', 'audit'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-xs font-medium capitalize transition-colors ${tab === t ? 'text-white border-b-2 border-violet-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t === 'users' ? 'User Management' : 'Audit Log'}
          </button>
        ))}
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {msg && (
          <div className="mb-4 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-4 py-2.5">{msg}</div>
        )}

        {tab === 'users' && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setModal({ type: 'create' }); setForm({}); }}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                New User
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-zinc-900/50 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-3 text-zinc-400 font-medium">Username</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-medium">Email</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-medium">Role</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-medium">Last Login</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                        <td className="px-4 py-3 text-zinc-200 font-medium">{u.username}</td>
                        <td className="px-4 py-3 text-zinc-400">{u.email || '—'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={e => handleChangeRole(u, e.target.value)}
                            disabled={u.id === user.id}
                            className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-violet-500 disabled:opacity-50"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${u.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">{formatDate(u.last_login_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setModal({ type: 'resetPassword', user: u }); setForm({}); }}
                              className="text-xs text-zinc-400 hover:text-violet-400 transition-colors"
                            >
                              Reset PW
                            </button>
                            <button
                              onClick={() => handleDisable(u)}
                              disabled={u.id === user.id}
                              className={`text-xs transition-colors disabled:opacity-30 ${u.is_active ? 'text-zinc-400 hover:text-red-400' : 'text-zinc-400 hover:text-green-400'}`}
                            >
                              {u.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'audit' && (
          loading ? <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-zinc-900/50 rounded-xl animate-pulse" />)}</div> : (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Time</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Actor</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Action</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Details</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                      <td className="px-4 py-2.5 text-zinc-500 font-mono">{formatDate(log.created_date)}</td>
                      <td className="px-4 py-2.5 text-zinc-300">{log.actor_email}</td>
                      <td className="px-4 py-2.5">
                        <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-mono">{log.action}</span>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-400">{log.details || '—'}</td>
                      <td className="px-4 py-2.5 text-zinc-600 font-mono">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-sm font-semibold text-white mb-4">
              {modal.type === 'create' ? 'Create User' : 'Reset Password'}
            </h2>
            {modal.type === 'create' ? (
              <div className="space-y-3">
                <input placeholder="Username *" value={form.username || ''} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-violet-500" />
                <input placeholder="Email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-violet-500" />
                <input type="password" placeholder="Password *" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-violet-500" />
                <select value={form.role || 'viewer'} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-violet-500">
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg py-2.5 transition-colors">Cancel</button>
                  <button onClick={handleCreateUser} disabled={submitting} className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs rounded-lg py-2.5 transition-colors">
                    {submitting ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">Reset password for <span className="text-white">{modal.user?.username}</span></p>
                <input type="password" placeholder="New password *" value={form.newPassword || ''} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-violet-500" />
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg py-2.5 transition-colors">Cancel</button>
                  <button onClick={handleResetPassword} disabled={submitting} className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs rounded-lg py-2.5 transition-colors">
                    {submitting ? 'Saving…' : 'Reset'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  return (
    <AuthProvider>
      <AuthGate>
        <AdminInner />
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