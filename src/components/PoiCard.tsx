import type { Poi, Category } from '../types';
import { mapsUrl } from '../lib/maps';
import { PHOTOS } from '../data/photos';
import { useI18n } from '../i18n';

// One emoji per category — works offline, no image downloads needed.
export const CATEGORY_ICON: Record<Category, string> = {
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

/** Icon for any category: default map, else the emoji the custom label
 *  starts with, else a generic pin. */
export function categoryIcon(category: string): string {
  if (category in CATEGORY_ICON) return CATEGORY_ICON[category as Category];
  const emoji = category.match(/^\p{Extended_Pictographic}/u);
  return emoji ? emoji[0] : '📍';
}

interface Props {
  poi: Poi;
  // "Seen it" checkmark (shown when the parent passes the handler).
  visited?: boolean;
  onToggleVisited?: () => void;
  // Editing controls are only rendered when the parent passes these callbacks.
  editing?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function PoiCard({
  poi,
  visited,
  onToggleVisited,
  editing,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  const { t } = useI18n();

  // Photo: explicit poi.photo, else the bundled Wikipedia image for this id.
  // BASE_URL = '/route-66/' on GitHub Pages.
  const photo =
    poi.photo ?? (PHOTOS[poi.id] ? import.meta.env.BASE_URL + PHOTOS[poi.id] : undefined);

  return (
    <div
      className={`rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 flex gap-3 ${
        visited ? 'opacity-60' : ''
      }`}
    >
      {/* Photo if we have one, category emoji otherwise — both in the same
          20×20 box so every card lines up identically */}
      {photo ? (
        <img
          src={photo}
          alt={poi.name}
          loading="lazy"
          className="w-20 h-20 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-4xl shrink-0">
          {categoryIcon(poi.category)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="font-semibold leading-snug flex-1">{poi.name}</h3>
          {poi.category === 'nba' && (
            <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 rounded px-1.5 py-0.5">
              {t('nbaBadge')}
            </span>
          )}
          {onToggleVisited && (
            <button
              onClick={onToggleVisited}
              aria-label={t('markSeen')}
              aria-pressed={visited}
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                visited
                  ? 'bg-green-600 text-white'
                  : 'border-2 border-stone-300 dark:border-stone-600 text-transparent'
              }`}
            >
              ✓
            </button>
          )}
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {poi.city}
          {poi.dwellMinutes ? ` · ${poi.dwellMinutes} ${t('minutes')}` : ''}
        </p>
        {poi.note && <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">{poi.note}</p>}

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
              <button onClick={onMoveUp} aria-label={t('moveUp')} className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 text-sm">
                ↑
              </button>
              <button onClick={onMoveDown} aria-label={t('moveDown')} className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 text-sm">
                ↓
              </button>
              <button onClick={onEdit} className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 text-sm">
                ✏️
              </button>
              <button onClick={onRemove} aria-label={t('removeStop')} className="px-2 py-1 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
                🗑️
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
