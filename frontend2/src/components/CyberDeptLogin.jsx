import React, { useState, useEffect } from 'react';
import { ShieldAlert, Fingerprint, BadgeCheck, KeyRound, Loader2, Lock, ArrowLeft } from 'lucide-react';

export default function CyberDeptLogin({ api, onLogin, onSwitch }) {
  const [officerId, setOfficerId] = useState('');
  const [badgeNo, setBadgeNo] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [lock, setLock] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lock <= 0) return undefined;
    const t = setTimeout(() => setLock((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lock]);

  const submit = async (e) => {
    e.preventDefault();
    if (lock > 0) return;
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/login', { method: 'POST', body: { role: 'cyber_dept', officerId, badgeNo, passcode } });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
      if (err.status === 429 && err.data && err.data.retryAfter) setLock(err.data.retryAfter);
      setPasscode('');
    } finally {
      setLoading(false);
    }
  };

  const field = 'w-full rounded-sm border border-zinc-700 bg-zinc-950 py-2.5 pl-10 pr-3 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 font-mono text-zinc-200">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-emerald-500/40 bg-emerald-500/10">
            <ShieldAlert className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-wide text-zinc-100">CYBER SHIELD // COMMAND</h1>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Restricted access · Authorised personnel only</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-sm border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-xs uppercase tracking-widest text-zinc-500">
            <span>Officer authentication</span>
            <span className="flex items-center gap-1 text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> TLS · JWT · bcrypt</span>
          </div>

          <div>
            <label htmlFor="oid" className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Officer ID</label>
            <div className="relative">
              <Fingerprint className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input id="oid" value={officerId} onChange={(e) => setOfficerId(e.target.value)} placeholder="OFF-0000" autoComplete="username" maxLength={32} className={field} />
            </div>
          </div>
          <div>
            <label htmlFor="badge" className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Badge No.</label>
            <div className="relative">
              <BadgeCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input id="badge" value={badgeNo} onChange={(e) => setBadgeNo(e.target.value)} placeholder="BDG-0000" maxLength={32} className={field} />
            </div>
          </div>
          <div>
            <label htmlFor="pass" className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Security key / passcode</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input id="pass" type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="••••••••" autoComplete="current-password" maxLength={64} className={field} />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-sm border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          {lock > 0 && (
            <p className="flex items-center gap-2 rounded-sm border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <Lock className="h-3.5 w-3.5" /> Terminal locked. Retry in {lock}s
            </p>
          )}

          <button
            type="submit"
            disabled={loading || lock > 0 || !officerId || !badgeNo || !passcode}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-emerald-500 bg-emerald-500/10 py-2.5 text-sm font-semibold uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Authenticate'}
          </button>

          <p className="border-t border-zinc-800 pt-3 text-xs text-zinc-600">
            Demo: OFF-1001 / BDG-7421 / Shield@2026 · 5 failed attempts lock the terminal for 60s
          </p>
        </form>

        <button onClick={onSwitch} className="mt-6 flex items-center gap-1 text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Citizen portal
        </button>
      </div>
    </div>
  );
}