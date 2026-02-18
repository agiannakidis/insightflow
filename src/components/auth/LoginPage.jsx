import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { base44 } from '@/api/base44Client';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(null); // null = loading

  React.useEffect(() => {
    base44.functions.invoke('authLogin', { action: 'checkSetup' })
      .then(res => setNeedsSetup(res.data?.needsSetup === true))
      .catch(() => setNeedsSetup(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (setupMode) {
      const res = await base44.functions.invoke('authLogin', { action: 'setup', username, password });
      if (res.data?.success) {
        setSetupSuccess(true);
        setSetupMode(false);
        setUsername('');
        setPassword('');
      } else {
        setError(res.data?.error || 'Setup failed');
      }
    } else {
      const result = await login(username, password);
      if (!result.success) setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 mb-4">
            <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Observability</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {setupMode ? 'Create your admin account' : 'Sign in to your workspace'}
          </p>
        </div>

        {setupSuccess && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3.5 py-2.5 mb-4">
            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-400">Admin account created! You can now sign in.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {setupMode ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : (setupMode ? 'Create Admin Account' : 'Sign in')}
          </button>
        </form>

        <div className="mt-6 text-center">
          {setupMode ? (
            <button onClick={() => { setSetupMode(false); setError(''); }} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Back to sign in
            </button>
          ) : (
            <button onClick={() => { setSetupMode(true); setError(''); setSetupSuccess(false); }} className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors">
              First time? Set up admin account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}