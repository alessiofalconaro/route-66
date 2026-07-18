import type { Hotel } from '../types';
import { mapsUrl } from '../lib/maps';
import { useI18n } from '../i18n';

export default function HotelCard({ hotel }: { hotel: Hotel }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl bg-white shadow-sm p-3">
      <div className="flex items-start gap-2">
        <span className="text-2xl">🛏️</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold leading-snug">{hotel.name}</h3>
          <p className="text-xs text-stone-500">
            {hotel.city} · {hotel.nights}
          </p>
          <p className="text-xs text-stone-600 mt-1">
            {t('parking')}: {hotel.parking}
            {hotel.resortFee ? ` · ${t('resortFee')}: ${hotel.resortFee}` : ''}
          </p>
          <a
            href={mapsUrl(hotel.mapsQuery)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium bg-red-700 text-white rounded-lg px-3 py-1.5 active:bg-red-800"
          >
            🗺️ {t('openInMaps')}
          </a>
        </div>
      </div>
    </div>
  );
}
