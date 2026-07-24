// City view for overnight cities WITHOUT a dedicated segment (e.g. Tulsa):
// aggregates the hotel + every POI across all segments whose city matches.
// Read-only by design — those POIs are edited on their own leg.
import { useState } from 'react';
import { CITY_SEGMENT, HOTELS, SEGMENTS, segmentById } from '../data/tripData';
import { mergePois, useOverrides } from '../lib/overrides';
import { useVisited } from '../lib/visited';
import { useI18n } from '../i18n';
import PoiCard from './PoiCard';
import HotelCard from './HotelCard';
import LocalInfoCard from './LocalInfoCard';
import SegmentView from './SegmentView';

export default function CityView({ cityId }: { cityId: string }) {
  const { t } = useI18n();
  const { overrides } = useOverrides();
  const { isVisited, toggleVisited } = useVisited();
  const [sortToSee, setSortToSee] = useState(false);

  // Chicago, Springdale (Zion day) and LA have full segments — reuse them.
  const dedicated = segmentById(CITY_SEGMENT[cityId]);
  if (dedicated) {
    return (
      <div className="space-y-3">
        <LocalInfoCard cityId={cityId} />
        {/* Chicago has a full timed walking plan — shortcut to it */}
        {cityId === 'chicago' && (
          <a
            href="#/more/plan"
            className="block rounded-xl bg-red-700 text-white shadow-sm p-3 text-sm font-medium"
          >
            🗺️ {t('chiPlanTitle')} →
          </a>
        )}
        <SegmentView segment={dedicated} />
      </div>
    );
  }

  const hotel = HOTELS.find((h) => h.id === cityId);
  if (!hotel) return null;

  // Exact "City, ST" match — a prefix match would mix up
  // Springfield, MO with Springfield, IL.
  const cityName = hotel.city.toLowerCase();
  const pois = SEGMENTS.flatMap((s) => mergePois(s, overrides)).filter(
    (p) => p.city.toLowerCase() === cityName,
  );

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold leading-tight">{hotel.city}</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">{hotel.nights}</p>
      </div>
      <LocalInfoCard cityId={cityId} />
      <HotelCard hotel={hotel} />
      {pois.length === 0 ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">{t('emptyCityHint')}</p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 dark:text-stone-400">
              ✓ {pois.filter((p) => isVisited(p.id)).length}/{pois.length}
            </span>
            <button
              onClick={() => setSortToSee((s) => !s)}
              className={`text-xs font-medium rounded-lg px-2.5 py-1 ${
                sortToSee ? 'bg-green-600 text-white' : 'bg-stone-200 dark:bg-stone-700'
              }`}
            >
              👀 {t('sortToSee')}
            </button>
          </div>
          {(sortToSee
            ? [...pois].sort((a, b) => Number(isVisited(a.id)) - Number(isVisited(b.id)))
            : pois
          ).map((p) => (
            <PoiCard
              key={p.id}
              poi={p}
              visited={isVisited(p.id)}
              onToggleVisited={() => toggleVisited(p.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}
