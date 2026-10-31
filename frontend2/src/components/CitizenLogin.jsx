import React, { useState } from 'react';
import { ShieldCheck, Smartphone, KeyRound, ArrowRight, Loader2, Lock, ArrowLeft } from 'lucide-react';
import TrackComplaint from './TrackComplaint';
import LanguageSelector from './LanguageSelector';
import { useT } from '../i18n';

export default function CitizenLogin({ api, onLogin, onSwitch }) {
  const { t } = useT();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('mobile');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validMobile = /^[6-9]\d{9}$/.test(mobile);

  const requestOtp = async (e) => {
    e.preventDefault();
    if (!validMobile) return setError(t('errMobile'));
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/otp/request', { method: 'POST', body: { mobile } });
      setDevOtp(data.devOtp || '');
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError(t('errOtp'));
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/login', { method: 'POST', body: { role: 'citizen', mobile, otp } });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LanguageSelector />
        </div>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-600 shadow-lg shadow-rose-200">
            <ShieldCheck className="h-11 w-11 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-stone-900">Citizen Cyber Shield</h1>
          <p className="mt-3 text-xl text-stone-600">{t('tagline')}</p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-stone-200/70 ring-1 ring-stone-100">
          {step === 'mobile' ? (
            <form onSubmit={requestOtp} className="space-y-5">
              <label htmlFor="mobile" className="block text-xl font-semibold text-stone-900">{t('mobileLabel')}</label>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-3 focus-within:border-rose-600 focus-within:bg-white">
                <Smartphone className="h-6 w-6 text-stone-500" />
                <span className="text-xl font-medium text-stone-500">+91</span>
                <input
                  id="mobile"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="w-full bg-transparent text-2xl font-medium text-stone-900 outline-none placeholder:text-stone-300"
                />
              </div>
              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-lg text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={loading || !validMobile}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-xl font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <>{t('sendOtp')} <ArrowRight className="h-6 w-6" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-5">
              <button type="button" onClick={() => { setStep('mobile'); setOtp(''); setError(''); }} className="flex items-center gap-1 text-lg font-medium text-stone-600 hover:text-stone-900">
                <ArrowLeft className="h-5 w-5" /> {t('changeNumber')}
              </button>
              <label htmlFor="otp" className="block text-xl font-semibold text-stone-900">{t('enterOtp')}</label>
              {devOtp && (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-lg text-amber-900 ring-1 ring-amber-200">
                  {t('demoOtp')} <span className="font-bold tracking-widest">{devOtp}</span>
                </p>
              )}
              <div className="flex items-center gap-3 rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-3 focus-within:border-rose-600 focus-within:bg-white">
                <KeyRound className="h-6 w-6 text-stone-500" />
                <input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-full bg-transparent text-3xl font-semibold tracking-[0.5em] text-stone-900 outline-none placeholder:text-stone-300"
                />
              </div>
              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-lg text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-xl font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : t('verify')}
              </button>
            </form>
          )}
          <p className="mt-6 flex items-center justify-center gap-2 text-base text-stone-500">
            <Lock className="h-4 w-4" /> {t('encNote')}
          </p>
        </div>

        <div className="mt-8">
          <TrackComplaint api={api} />
        </div>

        <button onClick={onSwitch} className="mx-auto mt-8 block text-lg font-medium text-stone-500 underline-offset-4 hover:text-stone-800 hover:underline">
          {t('officerLink')}
        </button>
      </div>
    </div>
  );
}