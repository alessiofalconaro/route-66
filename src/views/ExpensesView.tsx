// Expenses — two ledgers:
// 1. SHARED (single writer: Falco's device): payer + proportional 3-way split.
// 2. PERSONAL (every device, incl. Jesse's and Geo's): your own private log.
//    Your share (1/3) of every shared expense recorded on THIS device is
//    added to it automatically, as derived rows — never duplicated in storage,
//    so editing/deleting a shared expense keeps the personal view in sync.
import { useEffect, useState } from 'react';
import type { Expense } from '../types';
import { FUEL_TOTAL_USD } from '../data/tripData';
import { usePersistentState } from '../lib/storage';
import { useTravelers } from '../lib/travelers';
import { fmtUsd, netBalances, settlements } from '../lib/expenses';
import {
  mergeSnapshots,
  pullShared,
  pushShared,
  syncConfigured,
  type SharedSnapshot,
} from '../lib/expenseSync';
import { useI18n, type TKey } from '../i18n';

const CATEGORIES: { value: Expense['category']; labelKey: TKey }[] = [
  { value: 'fuel', labelKey: 'catFuel' },
  { value: 'hotel', labelKey: 'catHotel' },
  { value: 'food', labelKey: 'catFood' },
  { value: 'tickets', labelKey: 'catTickets' },
  { value: 'souvenirs', labelKey: 'catSouvenirs' },
  { value: 'other', labelKey: 'catOther' },
];

// A personal expense has no payer — it's implicitly "me, on this phone".
interface PersonalExpense {
  id: string;
  amountUsd: number;
  category: Expense['category'];
  note: string;
  date: string;
}

const input =
  'w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2 text-sm';

export default function ExpensesView() {
  const { t } = useI18n();
  const [mode, setMode] = useState<'shared' | 'personal'>('shared');

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">💵 {t('expensesTitle')}</h1>

      {/* Shared / Personal switch */}
      <div className="flex gap-2">
        {(
          [
            { value: 'shared', labelKey: 'expShared' },
            { value: 'personal', labelKey: 'expPersonal' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              mode === opt.value ? 'bg-red-700 text-white' : 'bg-stone-200 dark:bg-stone-700'
            }`}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>

      {mode === 'shared' ? <SharedSection /> : <PersonalSection />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SHARED ledger (single writer, proportional shares)
// ---------------------------------------------------------------------------
function SharedSection() {
  const { t } = useI18n();
  const { travelers, nameOf } = useTravelers();
  // Multi-writer: every phone can add/delete; the server merges every push.
  const [expenses, setExpenses] = usePersistentState<Expense[]>('expenses', []);
  // Tombstones: ids deleted somewhere — kept so a deletion reaches every phone.
  const [deletedIds, setDeletedIds] = usePersistentState<string[]>('expensesDeletedIds', []);
  const [updatedAt, setUpdatedAt] = usePersistentState<number>('expensesUpdatedAt', 0);
  const [pin] = usePersistentState<string>('tripPin', '');
  const [syncState, setSyncState] = useState<'ok' | 'fail' | null>(null);

  const adopt = (s: SharedSnapshot) => {
    setExpenses(s.expenses);
    setDeletedIds(s.deletedIds);
    setUpdatedAt(s.updatedAt);
  };

  // On opening the screen: pull, merge with local, and push back if this
  // phone had offline changes the server hasn't seen yet.
  useEffect(() => {
    if (!syncConfigured(pin)) return;
    let cancelled = false;
    (async () => {
      try {
        const local: SharedSnapshot = { expenses, deletedIds, updatedAt };
        const remote = await pullShared(pin);
        if (cancelled) return;
        const merged = mergeSnapshots(remote, local);
        const localHasNews =
          expenses.some((e) => !remote.expenses.some((r) => r.id === e.id)) ||
          deletedIds.some((d) => !remote.deletedIds.includes(d));
        adopt(localHasNews ? await pushShared(merged, pin) : merged);
        if (!cancelled) setSyncState('ok');
      } catch {
        if (!cancelled) setSyncState('fail');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount
  }, []);

  /** Saves locally and pushes; the server returns the merged ledger and we
   *  adopt it, so anything the others added meanwhile appears right away. */
  const saveAndSync = (nextExpenses: Expense[], nextDeleted: string[]) => {
    const snapshot: SharedSnapshot = {
      expenses: nextExpenses,
      deletedIds: nextDeleted,
      updatedAt: Date.now(),
    };
    adopt(snapshot);
    if (syncConfigured(pin)) {
      pushShared(snapshot, pin)
        .then((merged) => {
          adopt(merged);
          setSyncState('ok');
        })
        .catch(() => setSyncState('fail'));
    }
  };

  const [form, setForm] = useState({
    payerId: travelers[0]?.id ?? 't1',
    amount: '',
    category: 'other' as Expense['category'],
    note: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;
    const expense: Expense = {
      id: `e-${crypto.randomUUID()}`,
      payerId: form.payerId,
      amountUsd: amount,
      category: form.category,
      note: form.note.trim(),
      date: form.date,
    };
    saveAndSync([expense, ...expenses], deletedIds);
    setForm((f) => ({ ...f, amount: '', note: '' }));
  };

  const remove = (id: string) =>
    saveAndSync(
      expenses.filter((e) => e.id !== id),
      [...deletedIds, id],
    );

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(expenses, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'route66-expenses.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const net = netBalances(expenses, travelers);
  const pays = settlements(net);

  const total = expenses.reduce((s, e) => s + e.amountUsd, 0);
  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    sum: expenses.filter((e) => e.category === c.value).reduce((s, e) => s + e.amountUsd, 0),
  }))
    .filter((c) => c.sum > 0)
    .sort((a, b) => b.sum - a.sum);
  const fuelSum = byCategory.find((c) => c.value === 'fuel')?.sum ?? 0;
  const fuelPct = Math.min(100, Math.round((fuelSum / FUEL_TOTAL_USD) * 100));

  return (
    <>
      <p className="text-xs text-stone-500 dark:text-stone-400">{t('expensesSingleWriter')}</p>
      {syncConfigured(pin) && syncState && (
        <p
          className={`text-xs ${
            syncState === 'ok'
              ? 'text-green-700 dark:text-green-400'
              : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          {syncState === 'ok' ? `↻ ${t('syncOk')}` : `⚠️ ${t('syncFail')}`}
        </p>
      )}

      {/* Summary: total, fuel vs plan, by category */}
      {expenses.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-2">
          <div className="flex justify-between items-baseline">
            <h3 className="font-semibold text-sm">{t('expSummary')}</h3>
            <span className="font-bold">{fmtUsd(total)}</span>
          </div>
          <div>
            <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400">
              <span>⛽ {t('expFuelPlan')} (~${FUEL_TOTAL_USD.toFixed(0)})</span>
              <span>
                {fmtUsd(fuelSum)} · {fuelPct}%
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-stone-200 dark:bg-stone-700">
              <div className="h-2 rounded-full bg-red-700" style={{ width: `${fuelPct}%` }} />
            </div>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 pt-1">{t('expByCategory')}</p>
          {byCategory.map((c) => (
            <div key={c.value}>
              <div className="flex justify-between text-sm">
                <span>{t(c.labelKey)}</span>
                <span className="font-medium">{fmtUsd(c.sum)}</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded-full bg-stone-200 dark:bg-stone-700">
                <div
                  className="h-1.5 rounded-full bg-stone-500 dark:bg-stone-400"
                  style={{ width: `${Math.round((c.sum / total) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Net balances + who pays whom */}
      <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3">
        <h3 className="font-semibold text-sm mb-2">{t('balances')}</h3>
        <ul className="space-y-1 text-sm">
          {travelers.map((tr) => (
            <li key={tr.id} className="flex justify-between">
              <span>{tr.name}</span>
              <span
                className={
                  net[tr.id] >= 0
                    ? 'text-green-700 dark:text-green-400 font-medium'
                    : 'text-red-700 dark:text-red-400 font-medium'
                }
              >
                {net[tr.id] >= 0 ? '+' : ''}
                {fmtUsd(net[tr.id])}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-700 text-sm space-y-1">
          {pays.length === 0 ? (
            <p className="text-stone-500 dark:text-stone-400">{t('settledUp')}</p>
          ) : (
            pays.map((p, i) => (
              <p key={i}>
                <span className="font-medium">{nameOf(p.fromId)}</span> {t('owes')}{' '}
                <span className="font-medium">{nameOf(p.toId)}</span> {fmtUsd(p.amountUsd)}
              </p>
            ))
          )}
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={add} className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-2">
        <h3 className="font-semibold text-sm">{t('expenseAdd')}</h3>
        <label className="block text-sm">
          {t('expensePayer')}
          <select
            className={input}
            value={form.payerId}
            onChange={(e) => setForm((f) => ({ ...f, payerId: e.target.value }))}
          >
            {travelers.map((tr) => (
              <option key={tr.id} value={tr.id}>{tr.name}</option>
            ))}
          </select>
        </label>
        <ExpenseFields form={form} setForm={setForm} />
        <button type="submit" className="w-full bg-red-700 text-white rounded-lg py-2 text-sm font-medium">
          ＋ {t('expenseAdd')}
        </button>
      </form>

      {/* List (newest first — merged lists arrive in arbitrary order) */}
      {[...expenses].sort((a, b) => (a.date < b.date ? 1 : -1)).map((e) => (
        <div
          key={e.id}
          className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 flex items-center gap-2 text-sm"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium">
              {nameOf(e.payerId)} · {fmtUsd(e.amountUsd)}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {e.date} · {t(CATEGORIES.find((c) => c.value === e.category)!.labelKey)}
              {e.note ? ` · ${e.note}` : ''}
            </p>
          </div>
          <button
            onClick={() => remove(e.id)}
            aria-label={t('deleteExpense')}
            className="text-red-700 dark:text-red-400 px-2"
          >
            🗑️
          </button>
        </div>
      ))}

      {expenses.length > 0 && (
        <button
          onClick={exportJson}
          className="w-full rounded-lg bg-stone-200 dark:bg-stone-700 py-2 text-sm font-medium"
        >
          ⬇️ {t('exportExpenses')}
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// PERSONAL ledger (per device — Jesse and Geo use this on their own phones)
// ---------------------------------------------------------------------------
function PersonalSection() {
  const { t } = useI18n();
  const { travelers, nameOf } = useTravelers();
  // The shared ledger is read-only here: it feeds the automatic 1/3 rows.
  const [shared] = usePersistentState<Expense[]>('expenses', []);
  const [personal, setPersonal] = usePersistentState<PersonalExpense[]>('personalExpenses', []);

  const [form, setForm] = useState({
    amount: '',
    category: 'other' as Expense['category'],
    note: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;
    setPersonal((list) => [
      {
        id: `p-${crypto.randomUUID()}`,
        amountUsd: amount,
        category: form.category,
        note: form.note.trim(),
        date: form.date,
      },
      ...list,
    ]);
    setForm((f) => ({ ...f, amount: '', note: '' }));
  };

  const remove = (id: string) => setPersonal((list) => list.filter((e) => e.id !== id));

  const catLabel = (c: Expense['category']) =>
    t(CATEGORIES.find((x) => x.value === c)!.labelKey);

  // Derived rows: your 1/3 share of every shared expense on this device.
  const autoRows = shared.map((e) => ({
    id: `auto-${e.id}`,
    amountUsd: e.amountUsd / travelers.length,
    category: e.category,
    note: `${t('expAutoShare')}: ${e.note || catLabel(e.category)} (${nameOf(e.payerId)})`,
    date: e.date,
    auto: true as const,
  }));

  const rows = [
    ...personal.map((p) => ({ ...p, auto: false as const })),
    ...autoRows,
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const total = rows.reduce((s, r) => s + r.amountUsd, 0);

  return (
    <>
      <p className="text-xs text-stone-500 dark:text-stone-400">{t('expPersonalHint')}</p>

      <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 flex justify-between items-baseline">
        <h3 className="font-semibold text-sm">{t('expPersonalTotal')}</h3>
        <span className="font-bold">{fmtUsd(total)}</span>
      </div>

      {/* Add form (no payer — it's always you) */}
      <form onSubmit={add} className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-2">
        <h3 className="font-semibold text-sm">{t('expenseAdd')}</h3>
        <ExpenseFields form={form} setForm={setForm} />
        <button type="submit" className="w-full bg-red-700 text-white rounded-lg py-2 text-sm font-medium">
          ＋ {t('expenseAdd')}
        </button>
      </form>

      {rows.map((r) => (
        <div
          key={r.id}
          className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 flex items-center gap-2 text-sm"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium">
              {r.auto ? '🔗 ' : ''}
              {fmtUsd(r.amountUsd)}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {r.date} · {catLabel(r.category)}
              {r.note ? ` · ${r.note}` : ''}
            </p>
          </div>
          {/* auto rows follow the shared ledger — delete them there */}
          {!r.auto && (
            <button
              onClick={() => remove(r.id)}
              aria-label={t('deleteExpense')}
              className="text-red-700 dark:text-red-400 px-2"
            >
              🗑️
            </button>
          )}
        </div>
      ))}
    </>
  );
}

// Shared form fields (amount / category / note / date) used by both ledgers.
function ExpenseFields<T extends { amount: string; category: Expense['category']; note: string; date: string }>({
  form,
  setForm,
}: {
  form: T;
  setForm: React.Dispatch<React.SetStateAction<T>>;
}) {
  const { t } = useI18n();
  return (
    <>
      <label className="block text-sm">
        {t('expenseAmount')}
        <input
          className={input}
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          required
        />
      </label>
      <label className="block text-sm">
        {t('expenseCategory')}
        <select
          className={input}
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Expense['category'] }))}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {t('expenseNote')}
        <input
          className={input}
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        />
      </label>
      <label className="block text-sm">
        {t('expenseDate')}
        <input
          className={input}
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
      </label>
    </>
  );
}
