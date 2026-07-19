// Expense splitter — single writer (Falco's device), proportional shares.
import { useState } from 'react';
import type { Expense } from '../types';
import { FUEL_TOTAL_USD } from '../data/tripData';
import { usePersistentState } from '../lib/storage';
import { useTravelers } from '../lib/travelers';
import { fmtUsd, netBalances, settlements } from '../lib/expenses';
import { useI18n, type TKey } from '../i18n';

const CATEGORIES: { value: Expense['category']; labelKey: TKey }[] = [
  { value: 'fuel', labelKey: 'catFuel' },
  { value: 'hotel', labelKey: 'catHotel' },
  { value: 'food', labelKey: 'catFood' },
  { value: 'tickets', labelKey: 'catTickets' },
  { value: 'souvenirs', labelKey: 'catSouvenirs' },
  { value: 'other', labelKey: 'catOther' },
];

export default function ExpensesView() {
  const { t } = useI18n();
  const { travelers, nameOf } = useTravelers();
  const [expenses, setExpenses] = usePersistentState<Expense[]>('expenses', []);

  const [form, setForm] = useState({
    payerId: travelers[0]?.id ?? 't1',
    amount: '',
    category: 'other' as Expense['category'],
    note: '',
    date: new Date().toISOString().slice(0, 10), // "YYYY-MM-DD"
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
    setExpenses((list) => [expense, ...list]);
    setForm((f) => ({ ...f, amount: '', note: '' }));
  };

  const remove = (id: string) => setExpenses((list) => list.filter((e) => e.id !== id));

  // Plain-file backup: builds a JSON file in memory and triggers a download.
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

  // --- summary stats ---
  const total = expenses.reduce((s, e) => s + e.amountUsd, 0);
  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    sum: expenses.filter((e) => e.category === c.value).reduce((s, e) => s + e.amountUsd, 0),
  }))
    .filter((c) => c.sum > 0)
    .sort((a, b) => b.sum - a.sum);
  const fuelSum = byCategory.find((c) => c.value === 'fuel')?.sum ?? 0;
  const fuelPct = Math.min(100, Math.round((fuelSum / FUEL_TOTAL_USD) * 100));

  const input =
    'w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2 text-sm';

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">💵 {t('expensesTitle')}</h1>
      <p className="text-xs text-stone-500 dark:text-stone-400">{t('expensesSingleWriter')}</p>

      {/* Summary: total, fuel vs plan, by category */}
      {expenses.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-2">
          <div className="flex justify-between items-baseline">
            <h3 className="font-semibold text-sm">{t('expSummary')}</h3>
            <span className="font-bold">{fmtUsd(total)}</span>
          </div>
          {/* fuel against the planned ~$349.40 */}
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
          {/* by category */}
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
              <span className={net[tr.id] >= 0 ? 'text-green-700 dark:text-green-400 font-medium' : 'text-red-700 dark:text-red-400 font-medium'}>
                {net[tr.id] >= 0 ? '+' : ''}{fmtUsd(net[tr.id])}
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
          <select className={input} value={form.payerId} onChange={(e) => setForm((f) => ({ ...f, payerId: e.target.value }))}>
            {travelers.map((tr) => (
              <option key={tr.id} value={tr.id}>{tr.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          {t('expenseAmount')}
          <input className={input} type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
        </label>
        <label className="block text-sm">
          {t('expenseCategory')}
          <select className={input} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Expense['category'] }))}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          {t('expenseNote')}
          <input className={input} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        </label>
        <label className="block text-sm">
          {t('expenseDate')}
          <input className={input} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </label>
        <button type="submit" className="w-full bg-red-700 text-white rounded-lg py-2 text-sm font-medium">
          ＋ {t('expenseAdd')}
        </button>
      </form>

      {/* List */}
      {expenses.map((e) => (
        <div key={e.id} className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 flex items-center gap-2 text-sm">
          <div className="flex-1 min-w-0">
            <p className="font-medium">
              {nameOf(e.payerId)} · {fmtUsd(e.amountUsd)}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {e.date} · {t(CATEGORIES.find((c) => c.value === e.category)!.labelKey)}
              {e.note ? ` · ${e.note}` : ''}
            </p>
          </div>
          <button onClick={() => remove(e.id)} aria-label={t('deleteExpense')} className="text-red-700 dark:text-red-400 px-2">
            🗑️
          </button>
        </div>
      ))}

      {expenses.length > 0 && (
        <button onClick={exportJson} className="w-full rounded-lg bg-stone-200 dark:bg-stone-700 py-2 text-sm font-medium">
          ⬇️ {t('exportExpenses')}
        </button>
      )}
    </div>
  );
}
