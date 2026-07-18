import type { Poi, Category } from '../types';
import { mapsUrl } from '../lib/maps';
import { useI18n } from '../i18n';

// One emoji per category — works offline, no image downloads needed.
const CATEGORY_ICON: Record<Category, string> = {
  route66: '🛣️',
  nature: '🏞️',
  museum: '🏛️',
  photo: '📸',
  food: '🍔',
  city: '🏙️',
  nba: '🏀',
  fuel: '⛽',
  hotel: '🛏️',
  other: '📍',
};

interface Props {
  poi: Poi;
  // Editing controls are only rendered when the parent passes these callbacks.
  editing?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function PoiCard({ poi, editing, onEdit, onRemove, onMoveUp, onMoveDown }: Props) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl bg-white shadow-sm p-3 flex gap-3">
      {/* Photo if configured, category emoji otherwise */}
      {poi.photo ? (
        <img
          src={poi.photo}
          alt={poi.name}
          loading="lazy"
          className="w-16 h-16 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-stone-100 flex items-center justify-center text-3xl shrink-0">
          {CATEGORY_ICON[poi.category]}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="font-semibold leading-snug flex-1">{poi.name}</h3>
          {poi.category === 'nba' && (
            <span className="text-[10px] font-bold bg-orange-100 text-orange-800 rounded px-1.5 py-0.5">
              {t('nbaBadge')}
            </span>
          )}
        </div>
        <p className="text-xs text-stone-500">
          {poi.city}
          {poi.dwellMinutes ? ` · ${poi.dwellMinutes} ${t('minutes')}` : ''}
        </p>
        {poi.note && <p className="text-xs text-stone-600 mt-1">{poi.note}</p>}

        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={mapsUrl(poi.mapsQuery)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium bg-red-700 text-white rounded-lg px-3 py-1.5 active:bg-red-800"
          >
            🗺️ {t('openInMaps')}
          </a>

          {editing && (
            <span className="inline-flex gap-1">
              <button onClick={onMoveUp} aria-label={t('moveUp')} className="px-2 py-1 rounded-lg bg-stone-200 text-sm">
                ↑
              </button>
              <button onClick={onMoveDown} aria-label={t('moveDown')} className="px-2 py-1 rounded-lg bg-stone-200 text-sm">
                ↓
              </button>
              <button onClick={onEdit} className="px-2 py-1 rounded-lg bg-stone-200 text-sm">
                ✏️
              </button>
              <button onClick={onRemove} aria-label={t('removeStop')} className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-sm">
                🗑️
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
