import { HOTELS } from '../data/tripData';
import { useI18n } from '../i18n';
import HotelCard from '../components/HotelCard';

export default function HotelsView() {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold">🛏️ {t('hotelsTitle')}</h1>
        <p className="text-xs text-stone-500">{t('nights16')}</p>
      </div>
      {HOTELS.map((h) => (
        <HotelCard key={h.id} hotel={h} />
      ))}
    </div>
  );
}
