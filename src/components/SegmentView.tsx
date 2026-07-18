// Shows one segment (a city with its own POI list, or a driving leg):
// warning banner, editable POI list, fuel stops, and the night's hotel.
// This is also the itinerary EDITOR: toggle "Edit" to reorder/edit/remove/add.
import { useState } from 'react';
import type { Poi, Segment } from '../types';
import { hotelById } from '../data/tripData';
import { mergePois, useOverrides } from '../lib/overrides';
import { useI18n } from '../i18n';
import PoiCard from './PoiCard';
import HotelCard from './HotelCard';
import PoiForm from './PoiForm';

export default function SegmentView({ segment }: { segment: Segment }) {
  const { t } = useI18n();
  const { overrides, removePoi, editPoi, addPoi, movePoi } = useOverrides();
  const [editing, setEditing] = useState(false);
  // Which POI is being edited in the modal; 'new' = adding a new one.
  const [modal, setModal] = useState<Poi | 'new' | null>(null);

  const pois = mergePois(segment, overrides);
  const hotel = hotelById(segment.hotelId);
  const defaultCity = pois[0]?.city ?? hotel?.city ?? '';

  return (
    <div className="space-y-3">
      {/* Header with dates / distance + edit toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <h2 className="text-lg font-bold leading-tight">{segment.label}</h2>
          <p className="text-xs text-stone-500">
            {segment.dates}
            {segment.distanceMiles ? ` · ~${segment.distanceMiles} ${t('miles')}` : ''}
            {segment.driveHours ? ` · ~${segment.driveHours} ${t('hoursShort')}` : ''}
          </p>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className={`text-sm font-medium rounded-lg px-3 py-1.5 ${
            editing ? 'bg-red-700 text-white' : 'bg-stone-200'
          }`}
        >
          {editing ? t('doneEditing') : `✏️ ${t('editItinerary')}`}
        </button>
      </div>

      {segment.warning && (
        <div className="rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-sm p-3">
          ⚠️ {segment.warning}
        </div>
      )}

      {/* POI list */}
      {pois.length === 0 && <p className="text-sm text-stone-500">{t('noPois')}</p>}
      {pois.map((p) => (
        <PoiCard
          key={p.id}
          poi={p}
          editing={editing}
          onEdit={() => setModal(p)}
          onRemove={() => removePoi(p.id)}
          onMoveUp={() => movePoi(segment, overrides, p.id, -1)}
          onMoveDown={() => movePoi(segment, overrides, p.id, 1)}
        />
      ))}

      {editing && (
        <button
          onClick={() => setModal('new')}
          className="w-full rounded-xl border-2 border-dashed border-stone-300 py-3 text-sm font-medium text-stone-600"
        >
          ＋ {t('addStop')}
        </button>
      )}

      {/* Fuel stops for this leg */}
      {segment.fuelStops && segment.fuelStops.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm p-3">
          <h3 className="font-semibold text-sm mb-2">⛽ {t('fuelStopsTitle')}</h3>
          <ul className="space-y-2">
            {segment.fuelStops.map((f, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{f.station}</span>, {f.address} — $
                {f.pricePerGal.toFixed(2)}
                {t('perGal')} · ${f.amountUsd.toFixed(2)}
                {f.warning && <p className="text-xs text-amber-700 mt-0.5">{f.warning}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The night's hotel */}
      {hotel && (
        <div>
          <h3 className="font-semibold text-sm mb-1">🌙 {t('tonightsHotel')}</h3>
          <HotelCard hotel={hotel} />
        </div>
      )}

      {/* Add/edit modal */}
      {modal !== null && (
        <PoiForm
          initial={modal === 'new' ? undefined : modal}
          defaultCity={defaultCity}
          onCancel={() => setModal(null)}
          onSave={(data) => {
            if (modal === 'new') {
              // crypto.randomUUID() = built-in unique id generator (like Java's UUID)
              addPoi(segment.id, { ...data, id: `user-${crypto.randomUUID()}` });
            } else {
              editPoi(modal.id, data);
            }
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
