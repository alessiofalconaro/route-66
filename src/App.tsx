// Root component: liquid-glass bottom dock + first-run "who am I" picker.
// Dock behavior ported from budget-tracker: a sliding indicator follows the
// finger across the tabs, and a mostly-VERTICAL gesture (e.g. the iOS swipe-up
// to go to the home screen) or a system-interrupted touch (touchcancel) never
// changes tab by accident.
import { useRef, useState } from 'react';
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

  // --- dock touch handling -------------------------------------------------
  const navRef = useRef<HTMLElement>(null);
  // preview = tab highlighted while the finger is down (null = none).
  // Kept both in state (to render) and in a ref (to read inside handlers).
  const [preview, setPreview] = useState<number | null>(null);
  const previewRef = useRef<number | null>(null);
  const setPrev = (v: number | null) => {
    previewRef.current = v;
    setPreview(v);
  };
  const gesture = useRef({ x: 0, y: 0, vertical: false, suppressClick: false });

  const activeIdx = TABS.findIndex((tb) => tb.id === tab);
  const shownIdx = preview ?? activeIdx;

  /** Which tab sits under this X coordinate (tabs are equal-width slots). */
  const idxAtX = (clientX: number): number => {
    const el = navRef.current;
    if (!el) return activeIdx;
    const r = el.getBoundingClientRect();
    const slot = (r.width - 20) / TABS.length; // 10px padding each side
    const i = Math.floor((clientX - r.left - 10) / slot);
    return Math.max(0, Math.min(TABS.length - 1, i));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    gesture.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      vertical: false,
      suppressClick: false,
    };
    setPrev(idxAtX(e.touches[0].clientX));
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const tch = e.touches[0];
    const dx = tch.clientX - gesture.current.x;
    const dy = tch.clientY - gesture.current.y;
    // Mostly-vertical gesture (swipe-up to leave the app, or a scroll):
    // NOT a tab change → cancel and put the indicator back on the active tab.
    if (gesture.current.vertical || (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 14)) {
      gesture.current.vertical = true;
      if (previewRef.current !== null) setPrev(null);
      return;
    }
    const i = idxAtX(tch.clientX);
    if (i !== previewRef.current) setPrev(i);
  };

  const onTouchEnd = () => {
    // Suppress the synthetic click browsers fire ~300ms after a touch.
    gesture.current.suppressClick = true;
    setTimeout(() => (gesture.current.suppressClick = false), 500);
    if (gesture.current.vertical) {
      gesture.current.vertical = false;
      setPrev(null);
      return;
    }
    const p = previewRef.current;
    if (p !== null) setTab(TABS[p].id);
    setPrev(null);
  };

  /** Touch taken over by the system (iOS grabs the swipe-up for its home
   *  gesture): no navigation, indicator returns to the active tab. */
  const onTouchCancel = () => {
    gesture.current.vertical = false;
    gesture.current.suppressClick = true;
    setTimeout(() => (gesture.current.suppressClick = false), 500);
    setPrev(null);
  };

  /** Mouse click (desktop / non-touch). After a touch, the synthetic click
   *  is ignored — the touch handler already navigated. */
  const clickTab = (id: Tab) => {
    if (gesture.current.suppressClick) return;
    setTab(id);
  };

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      {/* Greeting bar (cosmetic use of "who am I") */}
      {whoAmI && (
        <p className="text-xs text-stone-500 dark:text-stone-400 px-4 pt-2">
          {t('greeting')}, {nameOf(whoAmI)}! 👋
        </p>
      )}

      {/* Main content; bottom padding clears the dock */}
      <main className="flex-1 p-4 pb-28">
        {tab === 'home' && <HomeView />}
        {tab === 'hotels' && <HotelsView />}
        {tab === 'fuel' && <FuelView />}
        {tab === 'chat' && <ChatView />}
        {tab === 'more' && <MoreView />}
      </main>

      {/* Liquid-glass bottom dock */}
      <nav
        ref={navRef}
        className="dock-pill fixed bottom-0 inset-x-0 z-40 max-w-lg mx-auto"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        {/* sliding indicator: width = one slot, translateX = slot index */}
        <span
          className="dock-ind"
          style={{
            width: `calc((100% - 20px) / ${TABS.length})`,
            transform: `translateX(${shownIdx * 100}%)`,
          }}
        />
        {TABS.map((tb, i) => (
          <button
            key={tb.id}
            onClick={() => clickTab(tb.id)}
            className={`relative z-10 flex-1 py-2 flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
              i === shownIdx
                ? 'text-red-700 dark:text-red-400'
                : 'text-stone-500 dark:text-stone-400'
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
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 w-full max-w-sm space-y-3">
            <h2 className="font-bold text-lg">{t('firstRunTitle')}</h2>
            {travelers.map((tr) => (
              <button
                key={tr.id}
                onClick={() => setWhoAmI(tr.id)}
                className="w-full rounded-lg bg-stone-100 dark:bg-stone-800 py-3 font-medium active:bg-stone-200 dark:active:bg-stone-700"
              >
                {tr.name}
              </button>
            ))}
            <p className="text-xs text-stone-500 dark:text-stone-400">{t('firstRunHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
