import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, LogOut, Activity, Link2, Clock, IndianRupee, Lock, Unlock,
  ShieldCheck, ShieldX, ChevronDown, ChevronRight, Loader2, RefreshCw, Network, Sparkles,
} from 'lucide-react';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const STATUSES = ['New', 'Under Investigation', 'Resolved'];
const PRIORITY = {
  High: 'border-red-500/50 bg-red-500/10 text-red-300',
  Medium: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  Low: 'border-zinc-600 bg-zinc-800 text-zinc-300',
};
const STATUS_STYLE = {
  New: 'border-sky-500/50 bg-sky-500/10 text-sky-300',
  'Under Investigation': 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  Resolved: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
};
const CAT_COLOR = {
  'UPI Fraud': 'bg-emerald-500',
  'Digital Arrest Scam': 'bg-red-500',
  'Phishing Link': 'bg-amber-500',
  'Fake APK': 'bg-sky-500',
  Other: 'bg-zinc-500',
};

function Metric({ Icon, label, value, accent }) {
  return (
    <div className="rounded-sm border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-zinc-500">
        <span>{label}</span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-100">{value}</p>
    </div>
  );
}

export default function CyberDeptDashboard({ api, user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [syndicates, setSyndicates] = useState([]);
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState({});
  const [details, setDetails] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [s, i, syn] = await Promise.all([api('/stats'), api('/incidents'), api('/syndicates').catch(() => ({ syndicates: [] }))]);
      setStats(s);
      setIncidents(i.incidents);
      setSyndicates(Array.isArray(syn.syndicates) ? syn.syndicates : []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 10000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [refresh]);

  const toggleDecrypt = async (id) => {
    if (details[id]) {
      setDetails((d) => {
        const c = { ...d };
        delete c[id];
        return c;
      });
      return;
    }
    setBusy(id);
    try {
      const data = await api(`/incidents/${id}?decrypt=true`);
      setDetails((d) => ({ ...d, [id]: data.incident.details || { description: 'Decryption failed: payload integrity check did not pass.', amount: 0, utr: '-' } }));
      setOpen((o) => ({ ...o, [id]: true }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const updateStatus = async (id, status) => {
    setBusy(id);
    try {
      await api(`/incidents/${id}/status`, { method: 'PUT', body: { status } });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const issueFreeze = async (id) => {
    setBusy(id);
    try {
      const data = await api(`/incidents/${id}/freeze`, { method: 'POST' });
      setIncidents((list) => list.map((x) => (x.id === id ? data.incident : x)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const visible = filter === 'All' ? incidents : incidents.filter((i) => i.status === filter);
  const maxCat = stats ? Math.max(1, ...Object.values(stats.byCategory)) : 1;
  const counts = (s) => (s === 'All' ? incidents.length : incidents.filter((i) => i.status === s).length);

  return (
    <div className="min-h-screen bg-zinc-950 font-mono text-zinc-200">
      <header className="border-b border-zinc-800 bg-zinc-900/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-emerald-500/40 bg-emerald-500/10"><ShieldAlert className="h-5 w-5 text-emerald-400" /></span>
            <div>
              <p className="text-sm font-semibold tracking-wide text-zinc-100">CYBER SHIELD // COMMAND CENTER</p>
              <p className="text-[11px] uppercase tracking-widest text-zinc-500">{user.unit}</p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <span className="hidden items-center gap-2 text-emerald-400 sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE · {now.toLocaleTimeString('en-IN', { hour12: false })}</span>
            <span className="text-zinc-400">{user.name} · {user.id}</span>
            <button onClick={refresh} title="Refresh" className="text-zinc-400 hover:text-zinc-100"><RefreshCw className="h-4 w-4" /></button>
            <button onClick={onLogout} className="flex items-center gap-1 rounded-sm border border-zinc-700 px-3 py-1.5 uppercase tracking-wider text-zinc-300 hover:border-red-500 hover:text-red-300"><LogOut className="h-3.5 w-3.5" /> Logout</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {error && <p role="alert" className="rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-300">{error}</p>}

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric Icon={Activity} label="Total incidents" value={stats ? stats.totalIncidents : '-'} accent="text-sky-400" />
          <Metric Icon={Link2} label="High-risk phishing URLs" value={stats ? stats.highRiskUrls : '-'} accent="text-red-400" />
          <Metric Icon={Clock} label="Pending reviews" value={stats ? stats.pendingReviews : '-'} accent="text-amber-400" />
          <Metric Icon={IndianRupee} label="Est. losses prevented" value={stats ? inr.format(stats.lossesPrevented) : '-'} accent="text-emerald-400" />
        </section>

        <section className="rounded-sm border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400">
              <Network className="h-4 w-4 text-red-400" /> Active Syndicate Threat Clusters
            </h2>
            <span className="inline-flex items-center gap-1 rounded-sm border border-violet-500/50 bg-violet-500/10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-violet-300">
              <Sparkles className="h-3 w-3" /> AI-Correlated
            </span>
          </div>
          {syndicates.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-500">No correlated clusters detected yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {syndicates.map((s) => (
                <article key={s.id} className="rounded-sm border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-600">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{s.id}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{s.category}</p>
                    </div>
                    <span className={`rounded-sm border px-2 py-0.5 text-[11px] uppercase ${PRIORITY[s.riskLevel]}`}>{s.riskLevel} risk</span>
                  </div>
                  <p className="mt-4 text-[11px] uppercase tracking-widest text-zinc-500">Pooled losses</p>
                  <p className="text-2xl font-semibold tabular-nums text-emerald-300">{inr.format(s.totalLoss)}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{s.incidentCount} linked incident{s.incidentCount === 1 ? '' : 's'}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.incidentIds.map((id) => (
                      <span key={id} className="rounded-sm border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[11px] text-zinc-300">{id}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-sm border border-zinc-800 bg-zinc-900/60 p-4 lg:col-span-1">
            <h2 className="border-b border-zinc-800 pb-3 text-xs uppercase tracking-widest text-zinc-400">Threat analytics</h2>
            <div className="mt-4 space-y-4">
              {stats && Object.entries(stats.byCategory).map(([cat, n]) => (
                <div key={cat}>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-zinc-300">{cat}</span><span className="tabular-nums text-zinc-400">{n}</span></div>
                  <div className="h-2 rounded-sm bg-zinc-800"><div className={`h-full rounded-sm ${CAT_COLOR[cat]}`} style={{ width: `${(n / maxCat) * 100}%` }} /></div>
                </div>
              ))}
              {!stats && <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />}
            </div>
          </section>

          <section className="rounded-sm border border-zinc-800 bg-zinc-900/60 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-4">
              <h2 className="text-xs uppercase tracking-widest text-zinc-400">Incident triage</h2>
              <div className="flex gap-1">
                {['All', ...STATUSES].map((s) => (
                  <button key={s} onClick={() => setFilter(s)} className={`rounded-sm border px-2.5 py-1 text-[11px] uppercase tracking-wider ${filter === s ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
                    {s} <span className="text-zinc-500">{counts(s)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="w-8 px-3 py-2" />
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Reporter</th>
                    <th className="px-3 py-2">UTR</th>
                    <th className="px-3 py-2">Integrity</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-zinc-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                  )}
                  {!loading && visible.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-zinc-500">No incidents in this view.</td></tr>
                  )}
                  {visible.map((i) => (
                    <React.Fragment key={i.id}>
                      <tr className="border-b border-zinc-800/70 hover:bg-zinc-800/30">
                        <td className="px-3 py-2.5">
                          <button onClick={() => setOpen((o) => ({ ...o, [i.id]: !o[i.id] }))} className="text-zinc-500 hover:text-zinc-200" aria-label="Toggle details">
                            {open[i.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-zinc-100">{i.id}</td>
                        <td className="px-3 py-2.5">{i.category}</td>
                        <td className="px-3 py-2.5"><span className={`rounded-sm border px-2 py-0.5 text-[11px] uppercase ${PRIORITY[i.priority]}`}>{i.priority}</span></td>
                        <td className="px-3 py-2.5 text-zinc-400">{i.maskedMobile}</td>
                        <td className="px-3 py-2.5 text-zinc-400">{i.maskedUtr}</td>
                        <td className="px-3 py-2.5">
                          {i.payloadVerified ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400"><ShieldCheck className="h-4 w-4" /> GCM verified</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-400"><ShieldX className="h-4 w-4" /> Tamper detected</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={i.status}
                            disabled={busy === i.id}
                            onChange={(e) => updateStatus(i.id, e.target.value)}
                            className={`rounded-sm border bg-zinc-950 px-2 py-1 text-[11px] uppercase outline-none ${STATUS_STYLE[i.status]}`}
                          >
                            {STATUSES.map((s) => <option key={s} value={s} className="bg-zinc-900 text-zinc-100">{s}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button onClick={() => toggleDecrypt(i.id)} disabled={busy === i.id} className="inline-flex items-center gap-1 rounded-sm border border-zinc-700 px-2 py-1 text-[11px] uppercase tracking-wider text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 disabled:opacity-50">
                            {busy === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : details[i.id] ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            {details[i.id] ? 'Hide' : 'Decrypt'}
                          </button>
                        </td>
                      </tr>
                      {open[i.id] && (
                        <tr className="border-b border-zinc-800/70 bg-zinc-950/70">
                          <td />
                          <td colSpan={8} className="px-3 py-4">
                            <div className="grid gap-4 text-xs md:grid-cols-2">
                              <div>
                                <p className="mb-1 uppercase tracking-widest text-zinc-500">Ciphertext (AES-256-GCM)</p>
                                <p className="break-all rounded-sm border border-zinc-800 bg-zinc-900 p-2 text-zinc-500">{i.cipherPreview}</p>
                                <p className="mt-2 text-zinc-500">Incident date: <span className="text-zinc-300">{i.incidentDate}</span> · Filed: <span className="text-zinc-300">{new Date(i.createdAt).toLocaleString('en-IN')}</span></p>
                              </div>
                              <div>
                                <p className="mb-1 uppercase tracking-widest text-zinc-500">Decrypted payload (audited)</p>
                                {details[i.id] ? (
                                  <div className="space-y-1 rounded-sm border border-emerald-500/30 bg-emerald-500/5 p-3">
                                    <p>Amount: <span className="text-emerald-300">{inr.format(details[i.id].amount)}</span></p>
                                    <p>UTR: <span className="text-emerald-300">{details[i.id].utr}</span></p>
                                    <p className="whitespace-pre-wrap text-zinc-200">{details[i.id].description}</p>
                                  </div>
                                ) : (
                                  <p className="flex items-center gap-2 rounded-sm border border-zinc-800 bg-zinc-900 p-3 text-zinc-500"><Lock className="h-4 w-4" /> Locked. Press Decrypt to view. Access is logged.</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 border-t border-zinc-800 pt-4">
                              {i.bankInterdictionStatus === 'FREEZE_REQUESTED' ? (
                                <p className="inline-flex items-center gap-2 rounded-sm border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                                  ⚡ Bank Freeze Dispatched (1930 Protocol Active)
                                  {i.frozenAt && <span className="font-normal normal-case text-zinc-400">· {new Date(i.frozenAt).toLocaleTimeString('en-IN', { hour12: false })}</span>}
                                </p>
                              ) : details[i.id] ? (
                                <button
                                  onClick={() => issueFreeze(i.id)}
                                  disabled={busy === i.id}
                                  className="flex items-center gap-2 rounded-sm border border-red-500 bg-red-800 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-950/60 transition hover:bg-red-700 disabled:opacity-60"
                                >
                                  {busy === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : '🚨'} Issue 1930 Bank Interdiction &amp; Account Freeze
                                </button>
                              ) : (
                                <p className="flex items-center gap-2 text-xs text-zinc-500">
                                  <Lock className="h-3.5 w-3.5" /> Decrypt the payload and review the case before issuing a freeze.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}