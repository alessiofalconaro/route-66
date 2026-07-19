import type { Hotel } from '../types';
import { mapsUrl } from '../lib/maps';
import { PHOTOS } from '../data/photos';
import { useI18n } from '../i18n';

export default function HotelCard({ hotel }: { hotel: Hotel }) {
  const { t } = useI18n();
  const photo = PHOTOS[hotel.id]
    ? import.meta.env.BASE_URL + PHOTOS[hotel.id]
    : undefined;
  return (
    <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3">
      <div className="flex items-start gap-2">
        {photo ? (
          <img
            src={photo}
            alt={hotel.name}
            loading="lazy"
            className="w-20 h-20 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-4xl shrink-0">
            🛏️
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold leading-snug">{hotel.name}</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {hotel.city} · {hotel.nights}
          </p>
          <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
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
