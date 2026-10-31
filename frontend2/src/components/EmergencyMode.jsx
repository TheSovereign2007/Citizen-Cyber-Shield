import React, { useState, useEffect } from 'react';
import { Siren, X, Phone, Landmark, ArrowLeft, ArrowRight, Wrench } from 'lucide-react';
import { useT } from '../i18n';

const SCENARIOS = [
  { id: 'upi', label: 'A' },
  { id: 'otp', label: 'B' },
  { id: 'apk', label: 'C' },
  { id: 'arrest', label: 'D' },
];

export default function EmergencyMode({ onFileReport }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);

  const close = () => {
    setOpen(false);
    setPicked(null);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const proceed = () => {
    close();
    onFileReport();
  };

  const steps = picked
    ? [
        { Icon: Phone, title: t('step1T'), text: t('step1D'), action: { href: 'tel:1930', label: t('callNow') } },
        { Icon: Landmark, title: t('step2T'), text: t('step2D') },
        { Icon: Wrench, title: t(`fx.${picked.id}.t`), text: t(`fx.${picked.id}.d`) },
      ]
    : [];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full animate-pulse items-center justify-center gap-3 rounded-3xl border-4 border-red-300 bg-gradient-to-r from-red-600 to-amber-500 px-6 py-5 text-xl font-bold text-white shadow-xl shadow-red-200 hover:animate-none hover:from-red-700 hover:to-amber-600 focus:outline-none focus:ring-4 focus:ring-red-300 sm:text-2xl"
      >
        <Siren className="h-8 w-8 shrink-0" /> 🚨 {t('panicBtn')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/70 p-0 sm:items-center sm:p-4" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('panicBtn')}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-3xl font-bold text-stone-900">{picked ? t('doStepsNow') : t('whatJustHappened')}</h2>
              <button onClick={close} aria-label="Close" className="rounded-xl p-2 text-stone-500 hover:bg-stone-100"><X className="h-6 w-6" /></button>
            </div>

            {!picked ? (
              <>
                <p className="mt-2 text-lg text-stone-600">{t('stayCalm')}</p>
                <div className="mt-5 space-y-3">
                  {SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setPicked(s)}
                      className="flex w-full items-center gap-4 rounded-2xl border-2 border-stone-200 bg-white p-4 text-left transition hover:border-red-500 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-200"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg font-bold text-red-700">{s.label}</span>
                      <span className="text-xl font-semibold text-stone-900">{t(`sc.${s.id}`)}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 rounded-xl bg-red-50 px-4 py-3 text-lg font-medium text-red-800">{picked.label}) {t(`sc.${picked.id}`)}</p>
                <ol className="mt-5 space-y-4">
                  {steps.map((s, n) => (
                    <li key={s.title} className="flex gap-4 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-100">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-lg font-bold text-white">{n + 1}</span>
                      <div>
                        <p className="flex items-center gap-2 text-xl font-bold text-stone-900"><s.Icon className="h-5 w-5 shrink-0 text-red-600" /> {s.title}</p>
                        <p className="mt-1 text-lg text-stone-700">{s.text}</p>
                        {s.action && (
                          <a href={s.action.href} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-lg font-semibold text-white hover:bg-red-700">
                            <Phone className="h-5 w-5" /> {s.action.label}
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                  <li className="flex gap-4 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-100">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-lg font-bold text-white">4</span>
                    <div className="flex-1">
                      <p className="text-xl font-bold text-stone-900">{t('step4T')}</p>
                      <p className="mt-1 text-lg text-stone-700">{t('step4D')}</p>
                      <button onClick={proceed} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-lg font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200">
                        {t('proceed')} <ArrowRight className="h-5 w-5 shrink-0" />
                      </button>
                    </div>
                  </li>
                </ol>
                <button onClick={() => setPicked(null)} className="mt-5 flex items-center gap-2 text-lg font-medium text-stone-600 hover:text-stone-900">
                  <ArrowLeft className="h-5 w-5" /> {t('chooseOther')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
