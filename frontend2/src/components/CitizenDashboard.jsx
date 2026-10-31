import React, { useState, useEffect } from 'react';
import EmergencyMode from './EmergencyMode';
import EvidenceUpload from './EvidenceUpload';
import { useT } from '../i18n';
import LanguageSelector from './LanguageSelector';
import VoiceInput from './VoiceInput';
import {
  ShieldCheck, Search, Bell, FileText, LogOut, ArrowLeft, AlertTriangle, CheckCircle2,
  Lock, Download, Loader2, ChevronRight, ShieldAlert,
} from 'lucide-react';

/* ---------- XSS-safe input sanitisation (applied before anything is analysed or sent) ---------- */
function sanitizeInput(value, max = 5000) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript\s*:/gi, 'blocked-script:')
    .replace(/data\s*:\s*text\/html/gi, 'blocked-data:')
    .slice(0, max)
    .trim();
}

/* ---------- Dependency-free PDF builder ---------- */
function wrapText(text, width = 85) {
  const out = [];
  String(text).split('\n').forEach((para) => {
    let line = '';
    para.split(' ').forEach((word) => {
      if ((line + ' ' + word).trim().length > width) {
        out.push(line);
        line = word;
      } else {
        line = (line + ' ' + word).trim();
      }
    });
    out.push(line);
  });
  return out;
}
function buildPdf(lines) {
  const clean = (s) => String(s).replace(/[^\x20-\x7E]/g, '?').replace(/([\\()])/g, '\\$1');
  const perPage = 48;
  const pages = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  const objs = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  pages.forEach((pl, i) => {
    const stream = 'BT /F1 11 Tf 50 790 Td 15 TL\n' + pl.map((l) => `(${clean(l)}) Tj T*`).join('\n') + '\nET';
    objs[4 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`;
    objs[5 + i * 2] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  let pdf = '%PDF-1.4\n';
  const offs = [];
  for (let i = 1; i < objs.length; i++) {
    offs[i] = pdf.length;
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n` + offs.slice(1).map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

const RISK = {
  green: { ring: 'ring-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-800', bar: 'bg-emerald-600', label: 'Looks safe', Icon: CheckCircle2 },
  yellow: { ring: 'ring-amber-300', bg: 'bg-amber-50', text: 'text-amber-800', bar: 'bg-amber-500', label: 'Be careful', Icon: AlertTriangle },
  red: { ring: 'ring-red-300', bg: 'bg-red-50', text: 'text-red-800', bar: 'bg-red-600', label: 'Dangerous', Icon: ShieldAlert },
};

/* ---------- Scam analyzer ---------- */
function Analyzer({ api }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const clean = sanitizeInput(text);
    if (clean.length < 3) return setError('Paste a message or link first.');
    setError('');
    setLoading(true);
    setResult(null);
    try {
      setResult(await api('/analyze', { method: 'POST', body: { text: clean } }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const s = result ? RISK[result.level] : null;

  return (
    <div>
      <h2 className="text-3xl font-bold text-stone-900">Is this message safe?</h2>
      <p className="mt-2 text-xl text-stone-600">Paste an SMS, WhatsApp message or link. We will check it for scam signs.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={5000}
        placeholder="Example: Your SBI account will be blocked today. Update KYC at http://sbi-kyc-update.xyz"
        className="mt-5 w-full rounded-3xl border-2 border-stone-200 bg-white p-5 text-xl text-stone-900 outline-none placeholder:text-stone-400 focus:border-rose-600"
      />
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-lg text-red-700">{error}</p>}
      <button onClick={run} disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-xl font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:bg-stone-300">
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Search className="h-6 w-6" /> Check now</>}
      </button>

      {result && (
        <div className={`mt-6 rounded-3xl p-6 ring-2 ${s.ring} ${s.bg}`}>
          <div className="flex items-center gap-5">
            <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white ${s.bar}`}>{result.score}</div>
            <div>
              <p className={`flex items-center gap-2 text-2xl font-bold ${s.text}`}><s.Icon className="h-7 w-7" /> {s.label}</p>
              <p className="mt-1 text-lg text-stone-700">{result.verdict}</p>
            </div>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/70">
            <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${result.score}%` }} />
          </div>
          {result.findings.length > 0 && (
            <ul className="mt-5 space-y-3">
              {result.findings.map((f, i) => (
                <li key={i} className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-lg font-semibold text-stone-900">{f.label}</p>
                  <p className="text-base text-stone-600">{f.detail}</p>
                </li>
              ))}
            </ul>
          )}
          {result.level !== 'green' && (
            <p className="mt-5 text-lg font-medium text-stone-800">Lost money? Call <span className="font-bold">1930</span> immediately.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Community alert feed ---------- */
function AlertFeed({ api }) {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/alerts').then((d) => setAlerts(d.alerts)).catch((e) => setError(e.message));
  }, [api]);
  const sev = { High: 'bg-red-100 text-red-800', Medium: 'bg-amber-100 text-amber-800', Low: 'bg-emerald-100 text-emerald-800' };
  return (
    <div>
      <h2 className="text-3xl font-bold text-stone-900">Latest scam alerts</h2>
      <p className="mt-2 text-xl text-stone-600">Real scams happening right now, explained simply.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-lg text-red-700">{error}</p>}
      <div className="mt-6 space-y-4">
        {alerts.map((a) => (
          <article key={a.id} className="rounded-3xl bg-white p-6 shadow-md shadow-stone-200/60 ring-1 ring-stone-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${sev[a.severity]}`}>{a.severity} risk</span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700">{a.category}</span>
              <span className="ml-auto text-sm text-stone-500">{a.date}</span>
            </div>
            <h3 className="mt-3 text-2xl font-bold text-stone-900">{a.title}</h3>
            <p className="mt-2 text-lg text-stone-600">{a.summary}</p>
            <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-lg font-medium text-emerald-900">What to do: {a.action}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------- 1930 incident drafter (3-step wizard) ---------- */
const CATEGORIES = ['UPI Fraud', 'Digital Arrest Scam', 'Phishing Link', 'Fake APK', 'Other'];
const today = () => new Date().toISOString().slice(0, 10);

function IncidentDrafter({ api, user }) {
  const { t } = useT();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ category: '', date: today(), amount: '', utr: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const applyEvidence = (ev) =>
    setForm((f) => {
      const note = ev.contact ? `Suspicious contact: ${ev.contact}` : '';
      return {
        ...f,
        utr: ev.utr ? ev.utr.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 22) : f.utr,
        amount: ev.amount || f.amount,
        date: ev.date || f.date,
        description: note && !f.description.includes(note) ? (f.description ? f.description + '\n' : '') + note : f.description,
      };
    });

  const validate = (st) => {
    if (st === 1) {
      if (!form.category) return t('errCat');
      if (!form.date || form.date > today()) return t('errDate');
      if (form.amount === '' || Number(form.amount) < 0) return t('errAmount');
    }
    if (st === 2) {
      if (!/^[A-Z0-9]{12,22}$/.test(form.utr)) return t('errUtr');
      if (form.description.length < 10) return t('errDesc');
    }
    return '';
  };

  const next = () => {
    const err = validate(step);
    if (err) return setError(err);
    setError('');
    setStep((s) => s + 1);
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const body = {
        category: form.category,
        date: form.date,
        amount: Number(form.amount),
        utr: sanitizeInput(form.utr, 22),
        description: sanitizeInput(form.description, 2000),
      };
      const data = await api('/incidents', { method: 'POST', body });
      setDone({ id: data.incident.id, createdAt: data.incident.createdAt });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    const lines = [
      'CYBERCRIME INCIDENT REPORT - DRAFT', 'For filing at cybercrime.gov.in or helpline 1930', '',
      `Reference: ${done.id}`, `Prepared: ${new Date(done.createdAt).toLocaleString('en-IN')}`,
      `Reporter mobile: ${user.maskedMobile}`, '',
      `Fraud type: ${form.category}`, `Date of incident: ${form.date}`,
      `Amount lost (INR): ${form.amount}`, `UTR / transaction ref: ${form.utr}`, '',
      'Description:', ...wrapText(form.description), '',
      'This draft was stored encrypted (AES-256-GCM). Keep screenshots, call logs',
      'and bank SMS as evidence. Report quickly: early reporting helps freeze funds.',
    ];
    const url = URL.createObjectURL(buildPdf(lines));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${done.id}-1930-draft.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const input = 'mt-2 w-full rounded-2xl border-2 border-stone-200 bg-white px-5 py-4 text-xl text-stone-900 outline-none placeholder:text-stone-400 focus:border-rose-600';

  if (done) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-stone-200/70 ring-1 ring-stone-100">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
        <h2 className="mt-4 text-3xl font-bold text-stone-900">{t('saved')}</h2>
        <p className="mt-2 text-xl text-stone-600">{t('refIs')}</p>
        <p className="mt-1 text-3xl font-bold tracking-wider text-rose-600">{done.id}</p>
        <p className="mt-4 flex items-center justify-center gap-2 text-lg text-stone-600"><Lock className="h-5 w-5" /> {t('encWith')}</p>
        <button onClick={downloadPdf} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-xl font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200">
          <Download className="h-6 w-6" /> {t('dlPdf')}
        </button>
        <p className="mt-5 text-lg text-stone-600">{t('callAfter')}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-stone-900">{t('cardReportTitle')}</h2>
      <p className="mt-2 text-xl text-stone-600">{t('reportSub')}</p>

      <ol className="mt-6 flex items-center gap-3" aria-label="Progress">
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex flex-1 items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold ${step >= n ? 'bg-rose-600 text-white' : 'bg-stone-200 text-stone-500'}`}>{n}</span>
            {n < 3 && <span className={`h-1 flex-1 rounded-full ${step > n ? 'bg-rose-600' : 'bg-stone-200'}`} />}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-3xl bg-white p-6 shadow-xl shadow-stone-200/70 ring-1 ring-stone-100">
        {step === 1 && (
          <div className="space-y-5">
            <EvidenceUpload onApply={applyEvidence} />
            <div>
              <p className="text-xl font-semibold text-stone-900">{t('whatHappened')}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => set('category', c)}
                    className={`rounded-2xl border-2 px-4 py-4 text-lg font-medium transition ${form.category === c ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'}`}>
                    {t(`cat.${c}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="date" className="text-xl font-semibold text-stone-900">{t('dateLabel')}</label>
              <input id="date" type="date" max={today()} value={form.date} onChange={(e) => set('date', e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor="amount" className="text-xl font-semibold text-stone-900">{t('fAmount')}</label>
              <input id="amount" type="number" inputMode="numeric" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="25000" className={input} />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="utr" className="text-xl font-semibold text-stone-900">{t('utrLabel')}</label>
              <input id="utr" value={form.utr} maxLength={22} onChange={(e) => set('utr', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="412398765012" className={input} />
              <p className="mt-2 text-base text-stone-500">{t('utrHelp')}</p>
            </div>
            <div>
              <label htmlFor="desc" className="text-xl font-semibold text-stone-900">{t('descLabel')}</label>
              <textarea id="desc" rows={6} maxLength={2000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={t('descPh')} className={input} />
              <VoiceInput onText={(s) => setForm((f) => ({ ...f, description: ((f.description ? f.description + ' ' : '') + s).slice(0, 2000) }))} />
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <p className="text-xl font-semibold text-stone-900">{t('checkDetails')}</p>
            <dl className="mt-4 divide-y divide-stone-100 text-lg">
              {[[t('fraudType'), t(`cat.${form.category}`)], [t('fDate'), form.date], [t('amountLost'), `₹ ${Number(form.amount).toLocaleString('en-IN')}`], ['UTR', form.utr]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-stone-500">{k}</dt><dd className="font-semibold text-stone-900">{v}</dd></div>
              ))}
              <div className="py-3"><dt className="text-stone-500">{t('descShort')}</dt><dd className="mt-1 whitespace-pre-wrap text-stone-900">{form.description}</dd></div>
            </dl>
            <p className="mt-2 flex items-center gap-2 rounded-2xl bg-stone-50 px-4 py-3 text-base text-stone-600"><Lock className="h-5 w-5 shrink-0" /> {t('encryptNote')}</p>
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-lg text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <button onClick={() => { setStep(step - 1); setError(''); }} className="rounded-2xl border-2 border-stone-200 px-6 py-4 text-xl font-semibold text-stone-700 hover:bg-stone-50">{t('back')}</button>
          )}
          {step < 3 ? (
            <button onClick={next} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-xl font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200">{t('continue')} <ChevronRight className="h-6 w-6" /></button>
          ) : (
            <button onClick={submit} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-xl font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:bg-stone-300">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Lock className="h-5 w-5" /> {t('encryptSave')}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Dashboard shell ---------- */
export default function CitizenDashboard({ api, user, onLogout }) {
  const { t } = useT();
  const [view, setView] = useState('home');

  const cards = [
    { id: 'analyzer', Icon: Search, title: t('cardCheckTitle'), desc: t('cardCheckDesc'), tint: 'bg-rose-100 text-rose-700' },
    { id: 'alerts', Icon: Bell, title: t('cardAlertsTitle'), desc: t('cardAlertsDesc'), tint: 'bg-amber-100 text-amber-700' },
    { id: 'report', Icon: FileText, title: t('cardReportTitle'), desc: t('cardReportDesc'), tint: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <button onClick={() => setView('home')} className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600"><ShieldCheck className="h-6 w-6 text-white" /></span>
            <span className="text-xl font-bold text-stone-900">Cyber Shield</span>
          </button>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <span className="hidden text-lg text-stone-600 md:block">{user.maskedMobile}</span>
            <button onClick={onLogout} className="flex items-center gap-2 rounded-xl px-3 py-2 text-lg font-medium text-stone-700 hover:bg-stone-100"><LogOut className="h-5 w-5" /> {t('signOut')}</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {view === 'home' ? (
          <div>
            <div className="mb-8">
              <EmergencyMode onFileReport={() => { setView('report'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-stone-900">{t('hello')}</h1>
            <p className="mt-2 text-xl text-stone-600">{t('whatToDo')}</p>
            <div className="mt-8 space-y-4">
              {cards.map(({ id, Icon, title, desc, tint }) => (
                <button key={id} onClick={() => setView(id)} className="flex w-full items-center gap-5 rounded-3xl bg-white p-6 text-left shadow-md shadow-stone-200/60 ring-1 ring-stone-100 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-rose-200">
                  <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${tint}`}><Icon className="h-8 w-8" /></span>
                  <span className="flex-1"><span className="block text-2xl font-bold text-stone-900">{title}</span><span className="mt-1 block text-lg text-stone-600">{desc}</span></span>
                  <ChevronRight className="h-7 w-7 text-stone-400" />
                </button>
              ))}
            </div>
            <div className="mt-8 rounded-3xl bg-stone-900 px-6 py-5 text-center text-white">
              <p className="text-2xl font-bold text-rose-400">{t('helplineTitle')}</p>
              <p className="mt-1 text-xl">{t('helplineSub')}</p>
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => setView('home')} className="mb-6 flex items-center gap-2 text-xl font-medium text-stone-600 hover:text-stone-900"><ArrowLeft className="h-6 w-6" /> {t('back')}</button>
            {view === 'analyzer' && <Analyzer api={api} />}
            {view === 'alerts' && <AlertFeed api={api} />}
            {view === 'report' && <IncidentDrafter api={api} user={user} />}
          </div>
        )}
      </main>
    </div>
  );
}
