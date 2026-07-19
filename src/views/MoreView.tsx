// "More" hub: shared album link, expenses, shopping list, checklist,
// emergency, settings. Sub-screens live in the hash (#/more/expenses) so the
// back gesture returns to this menu. All of it works offline.
import { useState } from 'react';
import { useI18n, type TKey } from '../i18n';
import { usePersistentState } from '../lib/storage';
import { useSharedState, type ShopItem } from '../lib/stateSync';
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
        {/* Always go straight to the More menu — history.back() could land on
            another tab if the sub-section was restored/deep-linked. */}
        <button
          onClick={() => router.navigate('more')}
          className="text-sm font-medium text-red-700 dark:text-red-400"
        >
          ← {t('moreTitle')}
        </button>
        {sub === 'expenses' && <ExpensesView />}
        {sub === 'shopping' && <ShoppingView />}
        {sub === 'tips' && <DrivingTipsView />}
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
      <button onClick={() => router.navigate('more/tips')} className={item}>
        🚘 {t('drivingTipsTitle')}
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

// --- Shopping list: things to buy on arrival in Chicago -------------------
// SHARED across the three phones (state sync): items, checkmarks, order and
// deletions all propagate. Default items reference an i18n key (so they
// follow the EN/ES toggle); user-added items store their own free text.
function ShoppingView() {
  const { t } = useI18n();
  const { state, update } = useSharedState();
  const [editing, setEditing] = useState(false);
  const [newText, setNewText] = useState('');

  // Display order: the shared order list, with any unlisted items appended.
  const byId = new Map(state.shopItems.map((i) => [i.id, i]));
  const items = [
    ...state.shopOrder.map((id) => byId.get(id)).filter((i): i is ShopItem => !!i),
    ...state.shopItems.filter((i) => !state.shopOrder.includes(i.id)),
  ];

  const labelOf = (it: ShopItem) => it.label ?? (it.key ? t(it.key as TKey) : '');
  const isDone = (id: string) => state.shopDone[id]?.v ?? false;

  const toggle = (id: string) =>
    update((s) => ({
      ...s,
      shopDone: { ...s.shopDone, [id]: { v: !(s.shopDone[id]?.v ?? false), t: Date.now() } },
    }));

  const remove = (id: string) =>
    update((s) => ({
      ...s,
      shopItems: s.shopItems.filter((it) => it.id !== id),
      shopDeleted: [...s.shopDeleted, id],
      shopOrder: s.shopOrder.filter((x) => x !== id),
      shopOrderT: Date.now(),
    }));

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const order = items.map((i) => i.id);
    [order[idx], order[target]] = [order[target], order[idx]];
    update((s) => ({ ...s, shopOrder: order, shopOrderT: Date.now() }));
  };

  const add = () => {
    const text = newText.trim();
    if (!text) return;
    const id = `s-${crypto.randomUUID()}`;
    update((s) => ({
      ...s,
      shopItems: [...s.shopItems, { id, label: text }],
      shopOrder: [...items.map((i) => i.id), id],
      shopOrderT: Date.now(),
    }));
    setNewText('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <h1 className="text-xl font-bold">🛒 {t('shoppingTitle')}</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">{t('shoppingHint')}</p>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className={`text-sm font-medium rounded-lg px-3 py-1.5 ${
            editing ? 'bg-green-600 text-white' : 'bg-stone-200 dark:bg-stone-700'
          }`}
        >
          {editing ? t('doneEditing') : `✏️ ${t('editItinerary')}`}
        </button>
      </div>

      {items.map((it, idx) => (
        <div
          key={it.id}
          className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 flex items-center gap-3 text-sm"
        >
          <input
            type="checkbox"
            checked={isDone(it.id)}
            onChange={() => toggle(it.id)}
            className="w-5 h-5 accent-red-700 shrink-0"
          />
          <span
            className={`flex-1 min-w-0 ${
              isDone(it.id) ? 'line-through text-stone-400' : ''
            }`}
          >
            {labelOf(it)}
          </span>
          {editing && (
            <span className="flex gap-1 shrink-0">
              <button onClick={() => move(idx, -1)} aria-label={t('moveUp')} className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700">
                ↑
              </button>
              <button onClick={() => move(idx, 1)} aria-label={t('moveDown')} className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700">
                ↓
              </button>
              <button onClick={() => remove(it.id)} aria-label={t('removeStop')} className="px-2 py-1 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                🗑️
              </button>
            </span>
          )}
        </div>
      ))}

      {/* Add a new item (Enter or the + button) */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2.5 text-sm"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={t('addItem')}
        />
        <button
          onClick={add}
          disabled={!newText.trim()}
          className="rounded-lg bg-red-700 text-white px-4 text-sm font-medium disabled:opacity-50"
        >
          ＋
        </button>
      </div>
    </div>
  );
}

// --- US driving tips for three Italians (static, offline) ---
function DrivingTipsView() {
  const { t } = useI18n();
  const tips: TKey[] = ['tip1', 'tip2', 'tip3', 'tip4', 'tip5', 'tip6'];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">🚘 {t('drivingTipsTitle')}</h1>
      {tips.map((k) => (
        <div key={k} className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 text-sm">
          {t(k)}
        </div>
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
