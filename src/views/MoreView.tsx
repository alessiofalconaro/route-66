// "More" hub: shared album link, expenses, shopping list, checklist,
// emergency, settings. Sub-screens live in the hash (#/more/expenses) so the
// back gesture returns to this menu. All of it works offline.
import { useI18n, type TKey } from '../i18n';
import { usePersistentState } from '../lib/storage';
import type { Router } from '../lib/router';
import ExpensesView from './ExpensesView';
import SettingsView from './SettingsView';

export default function MoreView({ router }: { router: Router }) {
  const { t } = useI18n();
  const sub = router.route[1] ?? 'menu';
  const [albumUrl] = usePersistentState<string>('albumUrl', '');

  if (sub !== 'menu') {
    return (
      <div className="space-y-3">
        {/* history.back() (not a forward navigation) so swipe-back and this
            button do exactly the same thing */}
        <button onClick={router.back} className="text-sm font-medium text-red-700 dark:text-red-400">
          ← {t('moreTitle')}
        </button>
        {sub === 'expenses' && <ExpensesView />}
        {sub === 'shopping' && <ShoppingView />}
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

      <button onClick={() => router.navigate('more/expenses')} className={item}>
        💵 {t('expensesTitle')}
      </button>
      <button onClick={() => router.navigate('more/shopping')} className={item}>
        🛒 {t('shoppingTitle')}
      </button>
      <button onClick={() => router.navigate('more/checklist')} className={item}>
        ✅ {t('checklistTitle')}
      </button>
      <button onClick={() => router.navigate('more/emergency')} className={item}>
        🚨 {t('emergencyTitle')}
      </button>
      <button onClick={() => router.navigate('more/settings')} className={item}>
        ⚙️ {t('settingsTitle')}
      </button>

      {/* Static desert-heat warning (from the itinerary, no API) */}
      <div className="rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm p-3">
        <p className="font-semibold">🌡️ {t('weatherTitle')}</p>
        <p className="mt-1">{t('weatherBody')}</p>
      </div>
    </div>
  );
}

// --- Reusable persisted checklist (checkbox list saved in localStorage) ---
function CheckList({ storageKey, items }: { storageKey: string; items: { id: string; label: string }[] }) {
  const [done, setDone] = usePersistentState<string[]>(storageKey, []);
  const toggle = (id: string) =>
    setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <>
      {items.map((it) => (
        <label
          key={it.id}
          className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 flex items-start gap-3 text-sm"
        >
          <input
            type="checkbox"
            checked={done.includes(it.id)}
            onChange={() => toggle(it.id)}
            className="mt-0.5 w-5 h-5 accent-red-700"
          />
          <span className={done.includes(it.id) ? 'line-through text-stone-400' : ''}>
            {it.label}
          </span>
        </label>
      ))}
    </>
  );
}

// --- Shopping list: things to buy on arrival in Chicago ---
function ShoppingView() {
  const { t } = useI18n();
  const keys: TKey[] = [
    'shop1', 'shop2', 'shop3', 'shop4', 'shop5',
    'shop6', 'shop7', 'shop8', 'shop9', 'shop10',
  ];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">🛒 {t('shoppingTitle')}</h1>
      <p className="text-xs text-stone-500 dark:text-stone-400">{t('shoppingHint')}</p>
      <CheckList storageKey="shopping" items={keys.map((k) => ({ id: k, label: t(k) }))} />
    </div>
  );
}

// --- Pre-departure checklist ---
function ChecklistView() {
  const { t } = useI18n();
  // ids stay the same as the first release so saved ticks are not lost
  const items = [
    { id: 'idp', label: t('chkIdp') },
    { id: 'card', label: t('chkCard') },
    { id: 'jesse', label: t('chkJesse') },
    { id: 'parkpass', label: t('chkParkPass') },
    { id: 'water', label: t('chkWater') },
  ];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">✅ {t('checklistTitle')}</h1>
      <CheckList storageKey="checklist" items={items} />
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
