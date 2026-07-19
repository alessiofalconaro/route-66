// Modal form used both to ADD a new stop and to EDIT an existing one.
import { useState } from 'react';
import type { Poi, Category } from '../types';
import { useI18n } from '../i18n';

const CATEGORIES: Category[] = [
  'route66', 'nature', 'museum', 'photo', 'food', 'city', 'nba', 'fuel', 'hotel', 'other',
];

interface Props {
  initial?: Poi; // present = editing, absent = adding
  defaultCity: string;
  onSave: (poi: Omit<Poi, 'id'>) => void;
  onCancel: () => void;
}

export default function PoiForm({ initial, defaultCity, onSave, onCancel }: Props) {
  const { t } = useI18n();
  // One state object for the whole form (like a form-backing bean).
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    city: initial?.city ?? defaultCity,
    category: initial?.category ?? ('other' as Category),
    dwellMinutes: initial?.dwellMinutes?.toString() ?? '',
    note: initial?.note ?? '',
    mapsQuery: initial?.mapsQuery ?? '',
  });

  // Generic field updater: set('name')('Cadillac Ranch')
  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); // stop the browser's full-page form submit
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      city: form.city.trim(),
      category: form.category,
      dwellMinutes: form.dwellMinutes ? Number(form.dwellMinutes) : undefined,
      note: form.note.trim() || undefined,
      // if no maps text given, searching for "name city" is a good default
      mapsQuery: form.mapsQuery.trim() || `${form.name.trim()} ${form.city.trim()}`,
    });
  };

  const input =
    'w-full rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm bg-white dark:bg-stone-800';

  return (
    // Fixed overlay covering the screen (a hand-rolled modal, no library)
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white dark:bg-stone-900 rounded-2xl p-4 w-full max-w-md space-y-3 max-h-[85vh] overflow-y-auto">
        <h3 className="font-bold text-lg">{initial ? t('editStop') : t('addStop')}</h3>

        <label className="block text-sm">
          {t('stopName')}
          <input className={input} value={form.name} onChange={set('name')} required autoFocus />
        </label>
        <label className="block text-sm">
          {t('stopCity')}
          <input className={input} value={form.city} onChange={set('city')} />
        </label>
        <label className="block text-sm">
          {t('stopCategory')}
          <select className={input} value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          {t('stopDwell')}
          <input className={input} type="number" min="0" value={form.dwellMinutes} onChange={set('dwellMinutes')} />
        </label>
        <label className="block text-sm">
          {t('stopNote')}
          <input className={input} value={form.note} onChange={set('note')} />
        </label>
        <label className="block text-sm">
          {t('stopMapsQuery')}
          <input className={input} value={form.mapsQuery} onChange={set('mapsQuery')} placeholder={`${form.name} ${form.city}`} />
        </label>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="flex-1 bg-red-700 text-white rounded-lg py-2 font-medium">
            {t('save')}
          </button>
          <button type="button" onClick={onCancel} className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-lg py-2 font-medium">
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
