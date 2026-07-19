// Settings: language, travelers (rename), who-am-I, album URL,
// itinerary reset / export / import (JSON file sharing between the three phones).
import { useRef } from 'react';
import { useI18n, type Lang } from '../i18n';
import { useTheme, type Theme } from '../lib/theme';
import { useTravelers } from '../lib/travelers';
import { usePersistentState } from '../lib/storage';
import { useOverrides } from '../lib/overrides';
import type { UserOverrides } from '../types';

export default function SettingsView() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { travelers, rename, whoAmI, setWhoAmI } = useTravelers();
  const [albumUrl, setAlbumUrl] = usePersistentState<string>('albumUrl', '');
  const [tripPin, setTripPin] = usePersistentState<string>('tripPin', '');
  const { overrides, setOverrides, resetAll } = useOverrides();
  // useRef = a stable reference to a DOM element (the hidden file input).
  const fileInput = useRef<HTMLInputElement>(null);

  const exportItinerary = () => {
    const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'route66-itinerary.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importItinerary = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as UserOverrides;
      // Minimal shape validation before trusting the file.
      if (
        !parsed ||
        !Array.isArray(parsed.removedPoiIds) ||
        typeof parsed.editedPois !== 'object' ||
        typeof parsed.addedPois !== 'object' ||
        typeof parsed.poiOrder !== 'object'
      ) {
        throw new Error('bad shape');
      }
      if (confirm(t('importConfirm'))) setOverrides(parsed);
    } catch {
      alert(t('importError'));
    }
  };

  const input =
    'w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2 text-sm';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">⚙️ {t('settingsTitle')}</h1>

      {/* Language */}
      <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3">
        <h3 className="font-semibold text-sm mb-2">{t('language')}</h3>
        <div className="flex gap-2">
          {(['en', 'es'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                lang === l ? 'bg-red-700 text-white' : 'bg-stone-200 dark:bg-stone-700'
              }`}
            >
              {l === 'en' ? '🇺🇸 English' : '🇪🇸 Español'}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3">
        <h3 className="font-semibold text-sm mb-2">{t('theme')}</h3>
        <div className="flex gap-2">
          {(
            [
              { value: 'light', icon: '☀️', labelKey: 'themeLight' },
              { value: 'dark', icon: '🌙', labelKey: 'themeDark' },
              { value: 'system', icon: '📱', labelKey: 'themeSystem' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value as Theme)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                theme === opt.value
                  ? 'bg-red-700 text-white'
                  : 'bg-stone-200 dark:bg-stone-700'
              }`}
            >
              {opt.icon} {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Travelers (rename fixes typos on the spot; ids stay stable) */}
      <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-2">
        <h3 className="font-semibold text-sm">{t('travelers')}</h3>
        {travelers.map((tr) => (
          <input
            key={tr.id}
            className={input}
            value={tr.name}
            onChange={(e) => rename(tr.id, e.target.value)}
          />
        ))}
        <h3 className="font-semibold text-sm pt-1">{t('whoAmI')}</h3>
        <select className={input} value={whoAmI ?? ''} onChange={(e) => setWhoAmI(e.target.value || null)}>
          <option value="">—</option>
          {travelers.map((tr) => (
            <option key={tr.id} value={tr.id}>{tr.name}</option>
          ))}
        </select>
      </div>

      {/* Shared album URL */}
      <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-1">
        <h3 className="font-semibold text-sm">{t('albumUrl')}</h3>
        <input
          className={input}
          type="url"
          placeholder="https://photos.app.goo.gl/…"
          value={albumUrl}
          onChange={(e) => setAlbumUrl(e.target.value)}
        />
        <p className="text-xs text-stone-500 dark:text-stone-400">{t('albumUrlHint')}</p>
      </div>

      {/* Trip PIN — unlocks the shared-expenses sync on this phone */}
      <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-1">
        <h3 className="font-semibold text-sm">🔑 {t('tripPinLabel')}</h3>
        <input
          className={input}
          type="text"
          autoComplete="off"
          value={tripPin}
          onChange={(e) => setTripPin(e.target.value)}
        />
        <p className="text-xs text-stone-500 dark:text-stone-400">{t('tripPinHint')}</p>
      </div>

      {/* Itinerary data management */}
      <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-2">
        <button onClick={exportItinerary} className="w-full rounded-lg bg-stone-200 dark:bg-stone-700 py-2 text-sm font-medium">
          ⬇️ {t('exportItinerary')}
        </button>
        <button onClick={() => fileInput.current?.click()} className="w-full rounded-lg bg-stone-200 dark:bg-stone-700 py-2 text-sm font-medium">
          ⬆️ {t('importItinerary')}
        </button>
        {/* hidden input; the button above triggers it */}
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importItinerary(f);
            e.target.value = ''; // allow re-importing the same file
          }}
        />
        <button
          onClick={() => confirm(t('resetConfirm')) && resetAll()}
          className="w-full rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 py-2 text-sm font-medium"
        >
          🔄 {t('resetItinerary')}
        </button>
      </div>
    </div>
  );
}
