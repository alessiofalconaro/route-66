import { ALL_FUEL_STOPS, FUEL_TOTAL_USD, segmentById } from '../data/tripData';
import { mapsUrl } from '../lib/maps';
import { useI18n } from '../i18n';

export default function FuelView() {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">⛽ {t('fuelTitle')}</h1>

      {/* The three key warnings, always visible */}
      <div className="rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-sm p-3 space-y-1">
        <p>⚠️ {t('fuelWarnCA')}</p>
        <p>💰 {t('fuelWarnMO')}</p>
        <p>🏜️ {t('fuelWarnQuarter')}</p>
      </div>

      <div className="rounded-xl bg-white shadow-sm p-3 text-sm">
        <span className="font-semibold">{t('fuelTotal')}:</span> ~${FUEL_TOTAL_USD.toFixed(2)} (
        {t('splitThreeWays')}: ${(FUEL_TOTAL_USD / 3).toFixed(2)})
      </div>

      {ALL_FUEL_STOPS.map((f, i) => (
        <div key={i} className="rounded-xl bg-white shadow-sm p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-semibold text-sm">
              {i + 1}. {f.station}
            </h3>
            <span className="text-sm font-bold">${f.amountUsd.toFixed(2)}</span>
          </div>
          <p className="text-xs text-stone-500">
            {f.address} · ${f.pricePerGal.toFixed(2)}{t('perGal')} · {f.fillGal.toFixed(1)} {t('gallons')}
            {' · '}
            {segmentById(f.segmentId)?.label}
          </p>
          {f.warning && <p className="text-xs text-amber-700 mt-1">{f.warning}</p>}
          <a
            href={mapsUrl(`${f.station} ${f.address}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium bg-red-700 text-white rounded-lg px-3 py-1.5 active:bg-red-800"
          >
            🗺️ {t('openInMaps')}
          </a>
        </div>
      ))}
    </div>
  );
}
