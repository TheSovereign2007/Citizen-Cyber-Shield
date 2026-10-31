import React, { useState } from 'react';
import { Search, Loader2, CheckCircle2, Circle, Landmark } from 'lucide-react';
import { useT } from '../i18n';

const STEPS = ['New', 'Under Investigation', 'Resolved'];
const PRIORITY = {
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-emerald-100 text-emerald-800',
};

export default function TrackComplaint({ api }) {
  const { t } = useT();
  const [id, setId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const track = async (e) => {
    e.preventDefault();
    const clean = id.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!/^INC-[A-Z0-9]{6}$/.test(clean)) {
      setResult(null);
      return setError(t('badId'));
    }
    setError('');
    setLoading(true);
    try {
      setResult(await api(`/public/status/${clean}`));
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const current = result ? STEPS.indexOf(result.status) : -1;
  const when = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl shadow-stone-200/70 ring-1 ring-stone-100">
      <h2 className="text-2xl font-bold text-stone-900">{t('trackTitle')}</h2>
      <p className="mt-1 text-lg text-stone-600">{t('trackSub')}</p>

      <label htmlFor="track-id" className="mt-5 block text-lg font-semibold text-stone-800">{t('enterId')}</label>
      <form onSubmit={track} className="mt-2 flex gap-3">
        <input
          id="track-id"
          value={id}
          onChange={(e) => setId(e.target.value)}
          maxLength={10}
          placeholder="INC-598CFC"
                    className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-3 text-xl font-medium uppercase tracking-wider text-stone-900 outline-none placeholder:text-stone-300 focus:border-rose-600 focus:bg-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex shrink-0 items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-lg font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:bg-stone-300"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} {t('trackBtn')}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-lg text-red-700">{error}</p>}

      {result && (
        <div className="mt-6 rounded-2xl bg-stone-50 p-5 ring-1 ring-stone-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-bold tracking-wider text-rose-600">{result.id}</span>
            <span className="rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-700">{t(`cat.${result.category}`)}</span>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${PRIORITY[result.priority] || PRIORITY.Low}`}>{t(`prio.${result.priority}`)} {t('priority')}</span>
          </div>

          <ol className="mt-6 flex items-start">
            {STEPS.map((s, n) => (
              <li key={s} className="flex flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <span className={`h-1 flex-1 ${n === 0 ? 'opacity-0' : n <= current ? 'bg-rose-600' : 'bg-stone-300'}`} />
                  {n <= current ? <CheckCircle2 className="h-8 w-8 shrink-0 text-rose-600" /> : <Circle className="h-8 w-8 shrink-0 text-stone-300" />}
                  <span className={`h-1 flex-1 ${n === STEPS.length - 1 ? 'opacity-0' : n < current ? 'bg-rose-600' : 'bg-stone-300'}`} />
                </div>
                <span className={`mt-2 text-sm font-semibold uppercase tracking-wide ${n === current ? 'text-rose-700' : n < current ? 'text-stone-700' : 'text-stone-400'}`}>{t(`st.${s}`)}</span>
              </li>
            ))}
          </ol>

          {result.bankInterdictionStatus === 'FREEZE_REQUESTED' && (
            <p className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-900">
              <Landmark className="h-5 w-5 shrink-0" /> {t('freezeNote')}
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-3 text-base">
            <div><dt className="text-stone-500">{t('filedOn')}</dt><dd className="font-semibold text-stone-900">{when(result.createdAt)}</dd></div>
            <div><dt className="text-stone-500">{t('lastUpdated')}</dt><dd className="font-semibold text-stone-900">{when(result.updatedAt)}</dd></div>
            <div><dt className="text-stone-500">{t('reporter')}</dt><dd className="font-semibold text-stone-900">{result.reporter}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
