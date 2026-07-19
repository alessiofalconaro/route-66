// Modal form used both to ADD a new stop and to EDIT an existing one.
// Categories: translated defaults + user-created ones (persisted), all shown
// as "emoji name" sorted A→Z. Photo: picked from the phone, resized and
// stored as a data-URL so it works offline like everything else.
import { useRef, useState } from 'react';
import type { Category, Poi } from '../types';
import { usePersistentState } from '../lib/storage';
import { fileToDataUrl } from '../lib/imageFile';
import { categoryIcon } from './PoiCard';
import { useI18n, type TKey } from '../i18n';

const DEFAULT_CATEGORY_LABELS: Record<Category, TKey> = {
  route66: 'pcRoute66',
  nature: 'pcNature',
  museum: 'pcMuseum',
  photo: 'pcPhoto',
  food: 'pcFood',
  city: 'pcCity',
  nba: 'pcNba',
  fuel: 'pcFuel',
  hotel: 'pcHotel',
  other: 'pcOther',
};

interface Props {
  initial?: Poi; // present = editing, absent = adding
  defaultCity: string;
  onSave: (poi: Omit<Poi, 'id'>) => void;
  onCancel: () => void;
}

export default function PoiForm({ initial, defaultCity, onSave, onCancel }: Props) {
  const { t } = useI18n();
  const [customCats, setCustomCats] = usePersistentState<string[]>('customPoiCategories', []);
  const fileInput = useRef<HTMLInputElement>(null);

  // One state object for the whole form (like a form-backing bean).
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    city: initial?.city ?? defaultCity,
    category: (initial?.category ?? 'other') as string,
    dwellMinutes: initial?.dwellMinutes?.toString() ?? '',
    note: initial?.note ?? '',
    mapsQuery: initial?.mapsQuery ?? '',
    photo: initial?.photo ?? '',
  });

  // Generic field updater: set('name')(event)
  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // Defaults + custom + (when editing) the current value, sorted A→Z by name.
  const catValues = [
    ...new Set([...Object.keys(DEFAULT_CATEGORY_LABELS), ...customCats, form.category]),
  ];
  const catOptions = catValues
    .map((value) => ({
      value,
      name: value in DEFAULT_CATEGORY_LABELS ? t(DEFAULT_CATEGORY_LABELS[value as Category]) : value,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ value: c.value, label: `${categoryIcon(c.value)} ${c.name.replace(/^\p{Extended_Pictographic}\s*/u, '')}` }));

  const onCategoryChange = (value: string) => {
    if (value === '__new__') {
      const name = window.prompt(t('addCategoryPrompt'))?.trim();
      if (name) {
        setCustomCats((list) => (list.includes(name) ? list : [...list, name]));
        setForm((f) => ({ ...f, category: name }));
      }
      return; // cancelled → keep the previous selection
    }
    setForm((f) => ({ ...f, category: value }));
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((f) => ({ ...f, photo: dataUrl }));
    } catch {
      /* unreadable file — just ignore */
    }
  };

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
      photo: form.photo || undefined,
    });
  };

  const input =
    'w-full rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm bg-white dark:bg-stone-800';

  return (
    // Fixed overlay covering the screen (a hand-rolled modal, no library)
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white dark:bg-stone-900 rounded-2xl p-4 w-full max-w-md space-y-3 max-h-[85vh] overflow-y-auto"
      >
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
          <select
            className={input}
            value={form.category}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            {catOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
            <option value="__new__">➕ {t('addCategory')}…</option>
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

        {/* Photo: preview + pick-from-phone + remove */}
        <div className="text-sm space-y-2">
          {t('stopPhoto')}
          {form.photo && (
            <img src={form.photo} alt="" className="w-full h-32 object-cover rounded-lg" />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex-1 rounded-lg bg-stone-200 dark:bg-stone-700 py-2 text-sm font-medium"
            >
              📷 {t('choosePhoto')}
            </button>
            {form.photo && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, photo: '' }))}
                className="rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-3 text-sm font-medium"
              >
                🗑️ {t('removePhoto')}
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              pickPhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        {/* Cancel left, green Save right */}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel} className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-lg py-2 font-medium">
            {t('cancel')}
          </button>
          <button type="submit" className="flex-1 bg-green-600 text-white rounded-lg py-2 font-medium">
            {t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
