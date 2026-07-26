// Shortcut into the day-by-day plan, shown on a city or leg view.
// Renders nothing when that segment/city has no plan day, so it is safe to
// drop into every view unconditionally.
import { planDaysForCity, planDaysForSegment } from '../data/plan';
import { useI18n } from '../i18n';

interface Props {
  segmentId?: string;
  cityId?: string;
}

export default function PlanShortcutCard({ segmentId, cityId }: Props) {
  const { t } = useI18n();
  const days = segmentId
    ? planDaysForSegment(segmentId)
    : cityId
      ? planDaysForCity(cityId)
      : [];
  if (days.length === 0) return null;

  const key = segmentId ?? cityId;
  return (
    <a
      href={`#/plan/${key}`}
      className="block rounded-xl bg-red-700 text-white shadow-sm p-3"
    >
      <span className="text-sm font-medium">🗺️ {t('planDayCard')} →</span>
      <span className="block text-xs opacity-90">{days.map((d) => d.date).join(' · ')}</span>
    </a>
  );
}
