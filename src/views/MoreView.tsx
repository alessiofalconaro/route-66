// "More" hub: shared album link, expenses, checklist, emergency, settings.
// All of it works offline (the album link just needs signal when tapped).
import { useState } from 'react';
import { useI18n } from '../i18n';
import { usePersistentState } from '../lib/storage';
import ExpensesView from './ExpensesView';
import SettingsView from './SettingsView';

type SubView = 'menu' | 'expenses' | 'checklist' | 'emergency' | 'settings';

export default function MoreView() {
  const { t } = useI18n();
  const [sub, setSub] = useState<SubView>('menu');
  const [albumUrl] = usePersistentState<string>('albumUrl', '');

  if (sub !== 'menu') {
    return (
      <div className="space-y-3">
        <button onClick={() => setSub('menu')} className="text-sm font-medium text-red-700 dark:text-red-400">
          ← {t('moreTitle')}
        </button>
        {sub === 'expenses' && <ExpensesView />}
        {sub === 'checklist' && <ChecklistView />}
        {sub === 'emergency' && <EmergencyView />}
        {sub === 'settings' && <SettingsView />}
      </div>
    );
  }

  const item =
    'w-full rounded-xl bg-white dark:bg-stone-900 shadow-sm p-4 text-left font-medium flex items-center gap-3';

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">{t('moreTitle')}</h1>

      {/* Shared Google Photos album (link-only, no in-app hosting) */}
      {albumUrl ? (
        <a
          href={albumUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full rounded-xl bg-red-700 text-white shadow-sm p-4 text-left font-medium flex items-center gap-3"
        >
          📸 {t('albumButton')}
        </a>
      ) : (
        <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-4">
          <p className="font-medium">📸 {t('albumButton')}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{t('albumNotSet')}</p>
        </div>
      )}

      <button onClick={() => setSub('expenses')} className={item}>💵 {t('expensesTitle')}</button>
      <button onClick={() => setSub('checklist')} className={item}>✅ {t('checklistTitle')}</button>
      <button onClick={() => setSub('emergency')} className={item}>🚨 {t('emergencyTitle')}</button>
      <button onClick={() => setSub('settings')} className={item}>⚙️ {t('settingsTitle')}</button>

      {/* Static desert-heat warning (from the itinerary, no API) */}
      <div className="rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm p-3">
        <p className="font-semibold">🌡️ {t('weatherTitle')}</p>
        <p className="mt-1">{t('weatherBody')}</p>
      </div>
    </div>
  );
}

// --- Pre-departure checklist (persisted checkboxes) ---
function ChecklistView() {
  const { t } = useI18n();
  const items = [
    { id: 'idp', label: t('chkIdp') },
    { id: 'card', label: t('chkCard') },
    { id: 'jesse', label: t('chkJesse') },
    { id: 'parkpass', label: t('chkParkPass') },
    { id: 'water', label: t('chkWater') },
  ];
  const [done, setDone] = usePersistentState<string[]>('checklist', []);
  const toggle = (id: string) =>
    setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">✅ {t('checklistTitle')}</h1>
      {items.map((it) => (
        <label key={it.id} className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={done.includes(it.id)}
            onChange={() => toggle(it.id)}
            className="mt-0.5 w-5 h-5 accent-red-700"
          />
          <span className={done.includes(it.id) ? 'line-through text-stone-400' : ''}>{it.label}</span>
        </label>
      ))}
    </div>
  );
}

// --- Emergency numbers (fully offline; tel: links start a call) ---
function EmergencyView() {
  const { t } = useI18n();
  const numbers = [
    { label: t('emergency911'), phone: '911' },
    { label: t('emergencyRoadside'), phone: '+18006545060' },
    { label: t('emergencyConsulate'), phone: '+13108200622' },
    { label: t('emergencyEmbassy'), phone: '+12026124400' },
  ];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">🚨 {t('emergencyTitle')}</h1>
      {numbers.map((n) => (
        <a
          key={n.phone}
          href={`tel:${n.phone}`}
          className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-4 flex items-center justify-between font-medium"
        >
          <span>{n.label}</span>
          <span className="text-red-700 dark:text-red-400">📞 {n.phone}</span>
        </a>
      ))}
    </div>
  );
}
