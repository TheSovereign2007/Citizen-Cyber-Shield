import React, { useState, useRef } from 'react';
import { UploadCloud, ScanText, Loader2, CheckCircle2, FileText, X, Lock } from 'lucide-react';
import { useT } from '../i18n';
import VoiceInput from './VoiceInput';

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, '0');

function toIso(d, m, y) {
  const year = y < 100 ? 2000 + y : y;
  const dt = new Date(year, m - 1, d);
  if (dt.getFullYear() !== year || dt.getMonth() !== m - 1 || dt.getDate() !== d) return '';
  const iso = `${year}-${pad(m)}-${pad(d)}`;
  return iso > new Date().toISOString().slice(0, 10) ? '' : iso;
}

/* Pattern-matching parser: UTR, amount (INR), date, suspicious phone / UPI ID */
export function parseEvidence(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ');
  const out = { utr: '', amount: '', date: '', contact: '' };

  const labelled = text.match(/(?:UTR|UPI\s*Ref(?:erence)?(?:\s*No\.?)?|Ref(?:erence)?\s*(?:No\.?|Number|ID)|Txn\s*(?:ID|No\.?)|Transaction\s*(?:ID|No\.?))\s*[:.#-]?\s*([A-Z0-9]{10,22})/i);
  const twelve = text.match(/(?<![\dA-Za-z])\d{12}(?![\dA-Za-z])/);
  out.utr = labelled ? labelled[1].toUpperCase() : twelve ? twelve[0] : '';

  const amt = text.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i) || text.match(/(?:debited|paid|sent|transferred)\s*(?:by|of|with)?\s*(?:₹|Rs\.?|INR)?\s*([\d,]{3,}(?:\.\d{1,2})?)/i);
  if (amt) out.amount = String(Math.round(parseFloat(amt[1].replace(/,/g, '')) || 0) || '');

  let m = text.match(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/);
  if (m) out.date = toIso(+m[3], +m[2], +m[1]);
  if (!out.date && (m = text.match(/(?<!\d)(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?!\d)/))) out.date = toIso(+m[1], +m[2], +m[3]);
  if (!out.date && (m = text.match(/(?<!\d)(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ -,]*(\d{2,4})(?!\d)/)) && MONTHS[m[2].toLowerCase()]) out.date = toIso(+m[1], MONTHS[m[2].toLowerCase()], +m[3]);

  const upi = text.match(/(?<![\w.])[\w.\-]{2,}@[a-zA-Z]{2,}(?![\w]|\.[a-zA-Z])/);
  const noUtr = out.utr ? text.replace(out.utr, ' ') : text;
  const phone = noUtr.match(/(?<!\d)(?:\+?91[\s-]?)?([6-9]\d{9})(?!\d)/);
  const spaced = noUtr.match(/(?<!\d)(?:\+?91[\s-]?)?([6-9]\d{4})[\s-]?(\d{5})(?!\d)/);
  out.contact = upi ? upi[0] : phone ? phone[1] : spaced ? spaced[1] + spaced[2] : '';
  return out;
}

let tessPromise = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!tessPromise) {
    tessPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
      s.onload = () => resolve(window.Tesseract);
      s.onerror = () => {
        tessPromise = null;
        reject(new Error('Could not load the image reader. Check your internet, or paste the text instead.'));
      };
      document.head.appendChild(s);
    });
  }
  return tessPromise;
}

const FIELDS = [
  { key: 'utr', labelKey: 'fUtr', ph: '412398765012' },
  { key: 'amount', labelKey: 'fAmount', ph: '25000' },
  { key: 'date', labelKey: 'fDate', ph: '', type: 'date' },
  { key: 'contact', labelKey: 'fContact', ph: 'scammer@okaxis' },
];

export default function EvidenceUpload({ onApply }) {
  const { t } = useT();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [applied, setApplied] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const finish = (source) => {
    const parsed = parseEvidence(source);
    setData(parsed);
    setApplied(false);
    if (!Object.values(parsed).some(Boolean)) setError('We could not find any details. You can type them in below.');
    else setError('');
    if (!Object.values(parsed).some(Boolean)) setData({ utr: '', amount: '', date: '', contact: '' });
  };

  const handleFile = async (f) => {
    if (!f) return;
    setError('');
    setData(null);
    const isImage = /^image\/(png|jpe?g|webp|bmp)$/.test(f.type);
    const isText = f.type === 'text/plain' || /\.txt$/i.test(f.name);
    if (!isImage && !isText) return setError('Please upload a screenshot (PNG/JPG) or a .txt file.');
    if (f.size > 5 * 1024 * 1024) return setError('File is too large. Maximum size is 5 MB.');
    setFile(f);
    setBusy(true);
    try {
      let source;
      if (isText) {
        source = (await f.text()).slice(0, 20000);
        setText(source);
      } else {
        const T = await loadTesseract();
        const res = await T.recognize(f, 'eng');
        source = res.data.text || '';
        setText(source.slice(0, 5000));
      }
      finish(source);
    } catch (e) {
      setError(e.message || 'Could not read this file. Paste the text instead.');
    } finally {
      setBusy(false);
    }
  };

  const scanText = () => {
    if (text.trim().length < 5) return setError('Paste an SMS, receipt or message first.');
    finish(text);
  };

  const edit = (k, v) => setData((d) => ({ ...d, [k]: k === 'utr' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '') : v }));

  const apply = () => {
    onApply(data);
    setApplied(true);
  };

  const clear = () => {
    setFile(null);
    setText('');
    setData(null);
    setError('');
    setApplied(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const box = 'mt-1 w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-lg text-stone-900 outline-none focus:border-rose-600';

  return (
    <div className="rounded-3xl bg-rose-50/60 p-5 ring-1 ring-rose-100">
      <p className="text-xl font-semibold text-stone-900">{t('evTitle')} <span className="text-base font-normal text-stone-500">{t('evOptional')}</span></p>
      <p className="mt-1 text-base text-stone-600">{t('evSub')}</p>

      <div
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current && inputRef.current.click()}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${drag ? 'border-rose-600 bg-rose-100' : 'border-stone-300 bg-white hover:border-rose-400'}`}
      >
        {busy ? <Loader2 className="h-9 w-9 animate-spin text-rose-600" /> : <UploadCloud className="h-9 w-9 text-rose-600" />}
        <p className="mt-2 text-lg font-semibold text-stone-800">{busy ? t('evReading') : t('evDrop')}</p>
        <p className="text-base text-stone-500">{t('evTypes')}</p>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/bmp,.txt,text/plain" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {file && (
        <p className="mt-3 flex items-center gap-2 text-base text-stone-700">
          <FileText className="h-5 w-5 shrink-0 text-stone-500" /> <span className="truncate">{file.name}</span>
          <button onClick={clear} aria-label="Remove file" className="ml-auto rounded-lg p-1 text-stone-500 hover:bg-stone-200"><X className="h-5 w-5" /></button>
        </p>
      )}

      <label htmlFor="evtext" className="mt-4 block text-base font-medium text-stone-700">{t('evPaste')}</label>
      <textarea id="evtext" rows={4} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Rs 25,000 debited from A/c XX1234 on 28-10-2026. UTR 412398765012. Paid to scammer@okaxis" className={box} />
      <VoiceInput onText={(s) => setText((prev) => ((prev ? prev + ' ' : '') + s).slice(0, 5000))} />
      <button type="button" onClick={scanText} disabled={busy} className="mt-3 flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-lg font-semibold text-white hover:bg-stone-700 disabled:bg-stone-300">
        <ScanText className="h-5 w-5" /> {t('evExtract')}
      </button>

      <p className="mt-3 flex items-center gap-2 text-sm text-stone-500"><Lock className="h-4 w-4 shrink-0" /> {t('evPrivacy')}</p>

      {error && <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-lg text-amber-900">{error}</p>}

      {data && (
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <p className="text-xl font-bold text-stone-900">{t('evCard')}</p>
          <p className="text-base text-stone-600">{t('evCheck')}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label htmlFor={`ev-${f.key}`} className="flex items-center justify-between gap-2 text-base font-medium text-stone-700">
                  {t(f.labelKey)}
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${data[f.key] ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>{data[f.key] ? t('evDetected') : t('evNotFound')}</span>
                </label>
                <input id={`ev-${f.key}`} type={f.type || 'text'} value={data[f.key]} placeholder={f.ph} onChange={(e) => edit(f.key, e.target.value)} className={box} />
              </div>
            ))}
          </div>
          <button type="button" onClick={apply} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-lg font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200">
            {t('evUse')}
          </button>
          {applied && (
            <p className="mt-3 flex items-center gap-2 text-lg font-medium text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" /> {t('evApplied')}</p>
          )}
        </div>
      )}
    </div>
  );
}
