// City view for overnight cities WITHOUT a dedicated segment (e.g. Tulsa):
// aggregates the hotel + every POI across all segments whose city matches.
// Read-only by design — those POIs are edited on their own leg.
import { CITY_SEGMENT, HOTELS, SEGMENTS, segmentById } from '../data/tripData';
import { mergePois, useOverrides } from '../lib/overrides';
import { useI18n } from '../i18n';
import PoiCard from './PoiCard';
import HotelCard from './HotelCard';
import LocalInfoCard from './LocalInfoCard';
import SegmentView from './SegmentView';

export default function CityView({ cityId }: { cityId: string }) {
  const { t } = useI18n();
  const { overrides } = useOverrides();

  // Chicago, Springdale (Zion day) and LA have full segments — reuse them.
  const dedicated = segmentById(CITY_SEGMENT[cityId]);
  if (dedicated) {
    return (
      <div className="space-y-3">
        <LocalInfoCard cityId={cityId} />
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
        pois.map((p) => <PoiCard key={p.id} poi={p} />)
      )}
    </div>
  );
}
