// Root component: bottom tab navigation + first-run "who am I" picker.
import { useState } from 'react';
import { useI18n, type TKey } from './i18n';
import { useTravelers } from './lib/travelers';
import HomeView from './views/HomeView';
import HotelsView from './views/HotelsView';
import FuelView from './views/FuelView';
import ChatView from './views/ChatView';
import MoreView from './views/MoreView';

type Tab = 'home' | 'hotels' | 'fuel' | 'chat' | 'more';

const TABS: { id: Tab; icon: string; labelKey: TKey }[] = [
  { id: 'home', icon: '🏠', labelKey: 'navHome' },
  { id: 'hotels', icon: '🛏️', labelKey: 'navHotels' },
  { id: 'fuel', icon: '⛽', labelKey: 'navFuel' },
  { id: 'chat', icon: '🤖', labelKey: 'navChat' },
  { id: 'more', icon: '☰', labelKey: 'navMore' },
];

export default function App() {
  const { t } = useI18n();
  const { travelers, whoAmI, setWhoAmI, nameOf } = useTravelers();
  const [tab, setTab] = useState<Tab>('home');

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      {/* Greeting bar (cosmetic use of "who am I") */}
      {whoAmI && (
        <p className="text-xs text-stone-500 px-4 pt-2">
          {t('greeting')}, {nameOf(whoAmI)}! 👋
        </p>
      )}

      {/* Main content; bottom padding clears the nav bar */}
      <main className="flex-1 p-4 pb-24">
        {tab === 'home' && <HomeView />}
        {tab === 'hotels' && <HotelsView />}
        {tab === 'fuel' && <FuelView />}
        {tab === 'chat' && <ChatView />}
        {tab === 'more' && <MoreView />}
      </main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 flex max-w-lg mx-auto"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`flex-1 py-2 flex flex-col items-center gap-0.5 text-[11px] font-medium ${
              tab === tb.id ? 'text-red-700' : 'text-stone-500'
            }`}
          >
            <span className="text-xl leading-none">{tb.icon}</span>
            {t(tb.labelKey)}
          </button>
        ))}
      </nav>

      {/* First-run: pick which traveler uses this phone */}
      {whoAmI === null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3">
            <h2 className="font-bold text-lg">{t('firstRunTitle')}</h2>
            {travelers.map((tr) => (
              <button
                key={tr.id}
                onClick={() => setWhoAmI(tr.id)}
                className="w-full rounded-lg bg-stone-100 py-3 font-medium active:bg-stone-200"
              >
                {tr.name}
              </button>
            ))}
            <p className="text-xs text-stone-500">{t('firstRunHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
