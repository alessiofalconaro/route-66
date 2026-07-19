// Settings: language, theme, travelers, album URL, trip PIN (with live
// verification), custom-category manager, itinerary reset/export/import.
import { useRef, useState } from 'react';
import { useI18n, type Lang } from '../i18n';
import { useTheme, type Theme } from '../lib/theme';
import { useTravelers } from '../lib/travelers';
import { loadJson, saveJson, usePersistentState } from '../lib/storage';
import { useOverrides } from '../lib/overrides';
import { pullShared, pushShared } from '../lib/expenseSync';
import { scheduleItineraryPush } from '../lib/itinerarySync';
import { EMPTY_OVERRIDES, type Expense, type UserOverrides } from '../types';

export default function SettingsView() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { travelers, rename, whoAmI, setWhoAmI } = useTravelers();
  const [albumUrl, setAlbumUrl] = usePersistentState<string>('albumUrl', '');
  const [campAlbumUrl, setCampAlbumUrl] = usePersistentState<string>('campAlbumUrl', '');
  const [tripPin, setTripPin] = usePersistentState<string>('tripPin', '');
  // PIN verification: explicit — the check runs only when the user taps
  // "Confirm PIN". Once verified, the field locks; "Change PIN" unlocks it.
  const [pinVerified, setPinVerified] = usePersistentState<boolean>('tripPinVerified', false);
  const [pinStatus, setPinStatus] = useState<
    'idle' | 'checking' | 'ok' | 'bad' | 'neterr' | 'noserver'
  >('idle');

  const confirmPin = async () => {
    if (!tripPin.trim()) return;
    setPinStatus('checking');
    try {
      await pullShared(tripPin);
      setPinVerified(true); // correct → field locks
      setPinStatus('ok');
    } catch (err) {
      // 401 = wrong PIN (field stays editable); 503 = the Worker has no
      // TRIP_PIN secret yet; anything else = network issue.
      const msg = err instanceof Error ? err.message : '';
      setPinStatus(msg.includes('401') ? 'bad' : msg.includes('503') ? 'noserver' : 'neterr');
    }
  };

  const changePin = () => {
    setPinVerified(false);
    setPinStatus('idle');
  };
  const { overrides, setOverrides, resetAll } = useOverrides();
  // useRef = a stable reference to a DOM element (the hidden file input).
  const fileInput = useRef<HTMLInputElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);

  // ---- FULL backup: every r66.* key (expenses, itinerary, settings...) ----
  const exportBackup = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith('r66.')) data[key] = localStorage.getItem(key)!;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `route66-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const restoreBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Record<string, string>;
      const keys = Object.keys(data);
      if (keys.length === 0 || !keys.every((k) => k.startsWith('r66.'))) {
        throw new Error('bad backup');
      }
      if (!confirm(t('restoreConfirm'))) return;
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
      window.location.reload(); // restart so every view re-reads the data
    } catch {
      alert(t('importError'));
    }
  };

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
      // Only keep photo values that are real images or plain URLs/paths.
      const safePhoto = (p?: string) =>
        p && /^(data:image\/|https?:\/\/|\/)/.test(p) ? p : undefined;
      for (const p of Object.values(parsed.editedPois)) p.photo = safePhoto(p.photo);
      for (const pois of Object.values(parsed.addedPois))
        for (const p of pois) p.photo = safePhoto(p.photo);
      if (confirm(t('importConfirm'))) {
        setOverrides(parsed);
        // an import is an edit like any other → propagate to the other phones
        saveJson('overridesUpdatedAt', Date.now());
        scheduleItineraryPush();
      }
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
        <h3 className="font-semibold text-sm pt-1">📷 {t('campAlbumUrl')}</h3>
        <input
          className={input}
          type="url"
          placeholder="https://photos.app.goo.gl/…"
          value={campAlbumUrl}
          onChange={(e) => setCampAlbumUrl(e.target.value)}
        />
      </div>

      {/* Trip PIN — unlocks the sync on this phone */}
      <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-2">
        <h3 className="font-semibold text-sm">🔑 {t('tripPinLabel')}</h3>
        <div className="flex gap-2">
          <input
            className={`${input} flex-1 disabled:opacity-60`}
            // password = shown as •••• while typing and when locked;
            // inputMode/pattern = phones open the NUMERIC keypad only
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={tripPin}
            disabled={pinVerified}
            onChange={(e) => {
              setTripPin(e.target.value);
              setPinStatus('idle');
            }}
          />
          {pinVerified ? (
            <button
              onClick={changePin}
              className="shrink-0 rounded-lg bg-stone-200 dark:bg-stone-700 px-3 text-sm font-medium"
            >
              ✏️ {t('changePin')}
            </button>
          ) : (
            <button
              onClick={confirmPin}
              disabled={!tripPin.trim() || pinStatus === 'checking'}
              className="shrink-0 rounded-lg bg-green-600 text-white px-3 text-sm font-medium disabled:opacity-50"
            >
              {t('confirmPin')}
            </button>
          )}
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">{t('tripPinHint')}</p>
        {pinStatus === 'checking' && (
          <p className="text-xs text-stone-500 dark:text-stone-400">⏳ {t('pinChecking')}</p>
        )}
        {(pinStatus === 'ok' || (pinVerified && pinStatus === 'idle')) && (
          <p className="text-xs font-medium text-green-700 dark:text-green-400">✅ {t('pinOk')}</p>
        )}
        {pinStatus === 'bad' && (
          <p className="text-xs font-medium text-red-700 dark:text-red-400">❌ {t('pinBad')}</p>
        )}
        {pinStatus === 'neterr' && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            ⚠️ {t('pinNetErr')}
          </p>
        )}
        {pinStatus === 'noserver' && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            ⚠️ {t('pinNoServer')}
          </p>
        )}
      </div>

      <CategoryManager />

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

      {/* Full backup / restore (everything on this phone, incl. personal) */}
      <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-2">
        <button
          onClick={exportBackup}
          className="w-full rounded-lg bg-stone-200 dark:bg-stone-700 py-2 text-sm font-medium"
        >
          🗄️ {t('backupAll')}
        </button>
        <button
          onClick={() => backupInput.current?.click()}
          className="w-full rounded-lg bg-stone-200 dark:bg-stone-700 py-2 text-sm font-medium"
        >
          ♻️ {t('restoreBackup')}
        </button>
        <input
          ref={backupInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) restoreBackup(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom-category manager: rename or delete the categories the user created
// (the translated defaults are not editable). Renaming also updates every
// record using the old name — locally AND across phones via the sync.
// ---------------------------------------------------------------------------
function CategoryManager() {
  const { t } = useI18n();
  const [expCats, setExpCats] = usePersistentState<string[]>('customCategories', []);
  const [poiCats, setPoiCats] = usePersistentState<string[]>('customPoiCategories', []);
  const [pin] = usePersistentState<string>('tripPin', '');

  const renameExpenseCat = (oldName: string) => {
    const name = window.prompt(t('renamePrompt'), oldName)?.trim();
    if (!name || name === oldName) return;
    setExpCats((list) => list.map((c) => (c === oldName ? name : c)));
    // Rewrite existing records so old entries follow the rename.
    const shared = loadJson<Expense[]>('expenses', []).map((e) =>
      e.category === oldName ? { ...e, category: name } : e,
    );
    saveJson('expenses', shared);
    saveJson(
      'personalExpenses',
      loadJson<{ category: string }[]>('personalExpenses', []).map((e) =>
        e.category === oldName ? { ...e, category: name } : e,
      ),
    );
    saveJson('expensesUpdatedAt', Date.now());
    // Sync: the server merge is per-id with incoming winning, so the renamed
    // shared expenses replace the old copies on every phone.
    if (pin.trim()) {
      void pushShared(
        {
          expenses: shared,
          deletedIds: loadJson<string[]>('expensesDeletedIds', []),
          updatedAt: Date.now(),
        },
        pin,
      ).catch(() => {});
    }
  };

  const renamePoiCat = (oldName: string) => {
    const name = window.prompt(t('renamePrompt'), oldName)?.trim();
    if (!name || name === oldName) return;
    setPoiCats((list) => list.map((c) => (c === oldName ? name : c)));
    const ov = loadJson<UserOverrides>('overrides', EMPTY_OVERRIDES);
    const renamed: UserOverrides = {
      ...ov,
      editedPois: Object.fromEntries(
        Object.entries(ov.editedPois).map(([id, p]) => [
          id,
          p.category === oldName ? { ...p, category: name } : p,
        ]),
      ),
      addedPois: Object.fromEntries(
        Object.entries(ov.addedPois).map(([segId, pois]) => [
          segId,
          pois.map((p) => (p.category === oldName ? { ...p, category: name } : p)),
        ]),
      ),
    };
    saveJson('overrides', renamed);
    saveJson('overridesUpdatedAt', Date.now());
    scheduleItineraryPush();
  };

  const chipRow = (
    cats: string[],
    onRename: (name: string) => void,
    onDelete: (name: string) => void,
  ) =>
    cats.length === 0 ? (
      <p className="text-xs text-stone-500 dark:text-stone-400">{t('categoriesNone')}</p>
    ) : (
      cats.map((c) => (
        <div key={c} className="flex items-center gap-2 text-sm py-1">
          <span className="flex-1 min-w-0 truncate">{c}</span>
          <button onClick={() => onRename(c)} className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700">
            ✏️
          </button>
          <button
            onClick={() => onDelete(c)}
            className="px-2 py-1 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
          >
            🗑️
          </button>
        </div>
      ))
    );

  return (
    <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-2">
      <h3 className="font-semibold text-sm">🏷️ {t('categoriesTitle')}</h3>
      <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
        {t('categoriesExpenses')}
      </p>
      {chipRow(expCats, renameExpenseCat, (c) => setExpCats((l) => l.filter((x) => x !== c)))}
      <p className="text-xs font-medium text-stone-500 dark:text-stone-400 pt-1">
        {t('categoriesPois')}
      </p>
      {chipRow(poiCats, renamePoiCat, (c) => setPoiCats((l) => l.filter((x) => x !== c)))}
    </div>
  );
}
