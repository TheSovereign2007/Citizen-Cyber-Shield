import React from 'react';
import { Globe } from 'lucide-react';
import { useT, LANGS } from '../i18n';

export default function LanguageSelector({ className = '' }) {
  const { lang, setLang, t } = useT();
  return (
    <label className={`flex items-center gap-2 ${className}`}>
      <Globe className="h-5 w-5 text-stone-500" />
      <span className="sr-only">{t('language')}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-lg font-medium text-stone-800 outline-none focus:border-rose-600"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </label>
  );
}
