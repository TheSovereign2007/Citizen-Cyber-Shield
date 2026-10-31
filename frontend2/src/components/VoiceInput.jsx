import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useT } from '../i18n';

const LOCALES = { en: 'en-IN', mr: 'mr-IN', hi: 'hi-IN' };

export default function VoiceInput({ onText }) {
  const { t, lang } = useT();
  const [on, setOn] = useState(false);
  const rec = useRef(null);
  const cb = useRef(onText);
  cb.current = onText;
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => () => { if (rec.current) rec.current.abort(); }, []);

  if (!SR) return <p className="mt-2 text-sm text-stone-500">{t('voiceUnsupported')}</p>;

  const toggle = () => {
    if (on && rec.current) return rec.current.stop();
    const r = new SR();
    r.lang = LOCALES[lang] || 'en-IN';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let s = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) s += e.results[i][0].transcript + ' ';
      if (s.trim()) cb.current(s.trim());
    };
    r.onend = () => setOn(false);
    r.onerror = () => setOn(false);
    rec.current = r;
    r.start();
    setOn(true);
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggle}
        className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-lg font-medium transition ${on ? 'animate-pulse border-red-500 bg-red-50 text-red-700' : 'border-stone-200 bg-white text-stone-700 hover:border-rose-400'}`}
      >
        {on ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />} {on ? t('voiceStop') : t('voiceStart')}
      </button>
      <p className="mt-1 text-sm text-stone-500">{on ? t('voiceListening') : t('voiceHint')}</p>
      <p className="text-sm text-stone-400">{t('voicePrivacy')}</p>
    </div>
  );
}
