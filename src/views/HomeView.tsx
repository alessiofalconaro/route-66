// Home: "Where are we?" — pick a city or a driving leg (or use GPS).
import { useState } from 'react';
import { CITIES, LEGS, segmentById } from '../data/tripData';
import { detectNearestCity } from '../lib/geo';
import { useI18n } from '../i18n';
import CityView from '../components/CityView';
import SegmentView from '../components/SegmentView';

// The current selection: either a city or a leg (a "discriminated union" —
// the `mode` field tells TypeScript which shape the object has).
type Selection = { mode: 'city'; id: string } | { mode: 'leg'; id: string } | null;

export default function HomeView() {
  const { t } = useI18n();
  const [selection, setSelection] = useState<Selection>(null);
  const [locating, setLocating] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);

  const useLocation = async () => {
    setLocating(true);
    setLocationFailed(false);
    const cityId = await detectNearestCity(); // null on any failure
    setLocating(false);
    if (cityId) {
      setSelection({ mode: 'city', id: cityId });
    } else {
      setLocationFailed(true);
    }
  };

  const select =
    'w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2.5 text-sm';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-red-700 text-white p-4">
        <h1 className="text-xl font-bold">{t('tripTitle')}</h1>
        <p className="text-sm opacity-90">{t('tripDates')}</p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-stone-900 shadow-sm p-4 space-y-3">
        <h2 className="font-bold">{t('whereAreWe')}</h2>

        <label className="block text-sm font-medium">
          🏙️ {t('inACity')}
          <select
            className={select}
            value={selection?.mode === 'city' ? selection.id : ''}
            onChange={(e) => e.target.value && setSelection({ mode: 'city', id: e.target.value })}
          >
            <option value="">{t('chooseCity')}</option>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          🚗 {t('drivingLeg')}
          <select
            className={select}
            value={selection?.mode === 'leg' ? selection.id : ''}
            onChange={(e) => e.target.value && setSelection({ mode: 'leg', id: e.target.value })}
          >
            <option value="">{t('chooseLeg')}</option>
            {LEGS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </label>

        <button
          onClick={useLocation}
          disabled={locating}
          className="w-full rounded-lg bg-stone-800 dark:bg-stone-700 text-white py-2.5 text-sm font-medium disabled:opacity-60"
        >
          📍 {locating ? t('locating') : t('useLocation')}
        </button>
        {locationFailed && (
          <p className="text-xs text-stone-500 dark:text-stone-400">{t('locationFailed')}</p>
        )}
      </div>

      {/* Render the selected view */}
      {selection?.mode === 'city' && <CityView cityId={selection.id} />}
      {selection?.mode === 'leg' && (() => {
        const seg = segmentById(selection.id);
        return seg ? <SegmentView segment={seg} /> : null;
      })()}
    </div>
  );
}
