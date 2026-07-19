// Home: "Where are we?" — pick a city or a driving leg (or use GPS).
// The selection lives in the URL hash (#/home/city/tulsa) so the browser's
// back gesture returns from a city/leg view to the pickers.
import { useState } from 'react';
import { CITIES, LEGS, segmentById } from '../data/tripData';
import { detectNearestCity } from '../lib/geo';
import type { Router } from '../lib/router';
import { useI18n } from '../i18n';
import CityView from '../components/CityView';
import SegmentView from '../components/SegmentView';

export default function HomeView({ router }: { router: Router }) {
  const { t } = useI18n();
  const [locating, setLocating] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);

  // Route shape: ['home'] | ['home','city',<id>] | ['home','leg',<id>]
  const mode = router.route[1]; // 'city' | 'leg' | undefined
  const selectedId = router.route[2];

  const useLocation = async () => {
    setLocating(true);
    setLocationFailed(false);
    const cityId = await detectNearestCity(); // null on any failure
    setLocating(false);
    if (cityId) {
      router.navigate(`home/city/${cityId}`);
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
            value={mode === 'city' ? selectedId : ''}
            onChange={(e) => e.target.value && router.navigate(`home/city/${e.target.value}`)}
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
            value={mode === 'leg' ? selectedId : ''}
            onChange={(e) => e.target.value && router.navigate(`home/leg/${e.target.value}`)}
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
      {mode === 'city' && selectedId && <CityView cityId={selectedId} />}
      {mode === 'leg' && selectedId && (() => {
        const seg = segmentById(selectedId);
        return seg ? <SegmentView segment={seg} /> : null;
      })()}
    </div>
  );
}
