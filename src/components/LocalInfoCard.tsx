// Practical info for an overnight city, all computed offline:
// local time (the route crosses 3 timezones + no-DST Arizona), sunrise/sunset
// (NOAA formula in lib/sun.ts) and the state's interstate speed limit.
import { CITY_INFO } from '../data/cityInfo';
import { CITY_POINTS } from '../lib/geo';
import { fmtTime, sunTimes } from '../lib/sun';
import { useI18n } from '../i18n';

export default function LocalInfoCard({ cityId }: { cityId: string }) {
  const { t } = useI18n();
  const info = CITY_INFO[cityId];
  const point = CITY_POINTS.find((p) => p.cityId === cityId);
  if (!info || !point) return null;

  const now = new Date();
  const sun = sunTimes(point.lat, point.lon, now);
  const row = 'flex justify-between text-sm';

  return (
    <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-1">
      <h3 className="font-semibold text-sm mb-1">ℹ️ {t('localInfoTitle')}</h3>
      <p className={row}>
        <span>🕐 {t('localTime')}</span>
        <span className="font-medium">{fmtTime(now, info.tz)}</span>
      </p>
      <p className={row}>
        <span>🌅 {t('sunriseLabel')}</span>
        <span className="font-medium">{fmtTime(sun.sunrise, info.tz)}</span>
      </p>
      <p className={row}>
        <span>🌇 {t('sunsetLabel')}</span>
        <span className="font-medium">{fmtTime(sun.sunset, info.tz)}</span>
      </p>
      <p className={row}>
        <span>🚗 {t('speedLimitLabel')}</span>
        <span className="font-medium">
          {info.speedLimitMph} mph · {info.state}
        </span>
      </p>
    </div>
  );
}
