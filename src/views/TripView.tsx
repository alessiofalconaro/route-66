// Trip tab: countdown / progress bar + the day-by-day timeline.
// Tapping a day opens the matching city/leg view (via the Home routes).
import { DAYS, TRIP_START, TRIP_END, todayIso, TOTAL_MILES, milesDoneBy } from '../data/days';
import type { DayEntry } from '../data/days';
import { CITIES, hotelById, segmentById } from '../data/tripData';
import type { Router } from '../lib/router';
import { useI18n, type TKey } from '../i18n';

const KIND_KEY: Record<DayEntry['kind'], TKey | null> = {
  arrival: 'dayArrival',
  cityday: 'dayCityDay',
  departure: 'dayDeparture',
  drive: null, // the leg label says it all
};

export default function TripView({ router }: { router: Router }) {
  const { t, lang } = useI18n();
  const today = todayIso();
  const locale = lang === 'es' ? 'es' : 'en-US';

  // Spanish dates come out all-lowercase ("mié, 5 ago") — capitalize each
  // word so they read like the English ones ("Mié, 5 Ago").
  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00')
      .toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })
      .replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());

  // ---- header: countdown before the trip, progress during/after ----
  const msPerDay = 86400000;
  const daysToStart = Math.ceil(
    (new Date(TRIP_START + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) /
      msPerDay,
  );
  const done = today > TRIP_END ? TOTAL_MILES : milesDoneBy(today);
  const pct = Math.round((done / TOTAL_MILES) * 100);

  const cityLabel = (id: string) => CITIES.find((c) => c.id === id)?.label ?? id;

  const titleOf = (d: DayEntry) => {
    if (d.mode === 'leg') return segmentById(d.id)?.label ?? d.id;
    return cityLabel(d.id);
  };

  const subtitleOf = (d: DayEntry) => {
    const parts: string[] = [];
    const kindKey = KIND_KEY[d.kind];
    if (kindKey) parts.push(t(kindKey));
    if (d.mode === 'leg') {
      const seg = segmentById(d.id);
      if (seg?.distanceMiles) parts.push(`~${seg.distanceMiles} ${t('miles')}`);
      const hotel = hotelById(seg?.hotelId);
      if (hotel) parts.push(`🌙 ${hotel.name}`);
    }
    return parts.join(' · ');
  };

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">📅 {t('navTrip')}</h1>

      {/* Countdown / progress */}
      <div className="rounded-2xl bg-red-700 text-white p-4">
        {daysToStart > 0 ? (
          <p className="text-lg font-bold">
            🚗 {daysToStart} {t('daysToGo')}
          </p>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <p className="font-bold">{t('tripProgress')}</p>
              <p className="text-sm">
                {done.toLocaleString(locale)} / {TOTAL_MILES.toLocaleString(locale)} {t('miles')}
              </p>
            </div>
            {/* progress bar with a dot per overnight city */}
            <div className="relative mt-3 h-2 rounded-full bg-red-900/60">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs mt-1 opacity-90">
              {today > TRIP_END ? t('tripCompleted') : `${pct}%`}
            </p>
          </>
        )}
      </div>

      {/* Timeline */}
      <h2 className="font-semibold text-sm">{t('tripPlanTitle')}</h2>
      {DAYS.map((d, i) => {
        const isToday = d.date === today;
        const isPast = d.date < today;
        return (
          <button
            key={d.date}
            onClick={() => router.navigate(`home/${d.mode}/${d.id}`)}
            className={`w-full text-left rounded-xl p-3 shadow-sm flex items-center gap-3 ${
              isToday
                ? 'bg-red-700 text-white'
                : 'bg-white dark:bg-stone-900' + (isPast ? ' opacity-60' : '')
            }`}
          >
            {/* day number bubble */}
            <div
              className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-sm ${
                isToday ? 'bg-white text-red-700' : 'bg-stone-100 dark:bg-stone-800'
              }`}
            >
              {isPast && !isToday ? '✓' : i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-xs ${
                  isToday ? 'text-red-100' : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                {fmtDate(d.date)}
                {isToday ? ` · ${t('todayLabel')}` : ''}
              </p>
              <p className="font-semibold leading-snug">
                {d.mode === 'leg' ? '🚗 ' : '🏙️ '}
                {titleOf(d)}
              </p>
              {subtitleOf(d) && (
                <p
                  className={`text-xs mt-0.5 ${
                    isToday ? 'text-red-100' : 'text-stone-500 dark:text-stone-400'
                  }`}
                >
                  {subtitleOf(d)}
                </p>
              )}
            </div>
            <span className={isToday ? 'text-red-100' : 'text-stone-400'}>›</span>
          </button>
        );
      })}
    </div>
  );
}
