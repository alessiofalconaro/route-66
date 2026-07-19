// Root component: app shell (only <main> scrolls), liquid-glass bottom dock,
// hash routing (swipe-back works) and the first-run "who am I" picker.
// Dock behavior ported from budget-tracker: a sliding indicator follows the
// finger across the tabs, and a mostly-VERTICAL gesture (e.g. the iOS swipe-up
// to go to the home screen) or a system-interrupted touch (touchcancel) never
// changes tab by accident.
import { useEffect, useRef, useState } from 'react';
import { useI18n, type TKey } from './i18n';
import { useTravelers } from './lib/travelers';
import { useHashRoute } from './lib/router';
import { pullItinerary } from './lib/itinerarySync';
import HomeView from './views/HomeView';
import TripView from './views/TripView';
import HotelsView from './views/HotelsView';
import FuelView from './views/FuelView';
import ChatView from './views/ChatView';
import MoreView from './views/MoreView';

type Tab = 'home' | 'trip' | 'hotels' | 'fuel' | 'chat' | 'more';

const TABS: { id: Tab; icon: string; labelKey: TKey }[] = [
  { id: 'home', icon: '🏠', labelKey: 'navHome' },
  { id: 'trip', icon: '📅', labelKey: 'navTrip' },
  { id: 'hotels', icon: '🛏️', labelKey: 'navHotels' },
  { id: 'fuel', icon: '⛽', labelKey: 'navFuel' },
  { id: 'chat', icon: '🤖', labelKey: 'navChat' },
  { id: 'more', icon: '☰', labelKey: 'navMore' },
];

export default function App() {
  const { t } = useI18n();
  const { travelers, whoAmI, setWhoAmI, nameOf } = useTravelers();
  const router = useHashRoute();

  // Current tab = first segment of the hash route (#/hotels → 'hotels').
  const tab: Tab = (TABS.find((tb) => tb.id === router.route[0])?.id ?? 'home') as Tab;

  // Remember the deepest HOME route, so tapping "Home" from another tab
  // brings you back to the city/leg you were looking at. Only Home: restoring
  // deep routes on More caused a trap (re-entering More landed inside a
  // sub-section with no way back to the More menu).
  const lastHomeRoute = useRef<string>('home');
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (router.route[0] === 'home') lastHomeRoute.current = router.route.join('/');
  }, [router.route]);

  // Pull the shared itinerary once at startup (and whenever the app comes
  // back to the foreground) so edits made by the others appear. Bumping
  // syncGen remounts the views (key on <main>) so they re-read storage.
  const [syncGen, setSyncGen] = useState(0);
  useEffect(() => {
    const sync = async () => {
      if (await pullItinerary()) setSyncGen((n) => n + 1);
    };
    void sync();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  /** Dock tap. Active tab: first tap pops back to the tab's root (e.g. the
   *  More menu from a sub-section), tap again to scroll to top. Other tab:
   *  Home restores where you were; every other tab opens at its root. */
  const goTab = (id: Tab) => {
    if (id === tab) {
      if (router.route.length > 1) router.navigate(id);
      else mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    router.navigate(id === 'home' ? lastHomeRoute.current : id);
  };

  // --- dock touch handling -------------------------------------------------
  const pillRef = useRef<HTMLDivElement>(null);
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
    const el = pillRef.current;
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
    if (p !== null) goTab(TABS[p].id);
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
    goTab(id);
  };

  return (
    <div className="h-full flex flex-col max-w-lg mx-auto">
      {/* Greeting bar (cosmetic use of "who am I") */}
      {whoAmI && (
        <p className="text-xs text-stone-500 dark:text-stone-400 px-4 pt-2 shrink-0">
          {t('greeting')}, {nameOf(whoAmI)}! 👋
        </p>
      )}

      {/* THE only scrolling element (document scroll is locked in index.css).
          Bottom padding clears the dock; content scrolls under the glass. */}
      <main
        key={syncGen}
        ref={mainRef}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 pb-32"
      >
        {tab === 'home' && <HomeView router={router} />}
        {tab === 'trip' && <TripView router={router} />}
        {tab === 'hotels' && <HotelsView />}
        {tab === 'fuel' && <FuelView />}
        {tab === 'chat' && <ChatView />}
        {tab === 'more' && <MoreView router={router} />}
      </main>

      {/* Liquid-glass bottom dock (fixed, full width, safe-area inside) */}
      <nav className="dock">
        <div
          ref={pillRef}
          className="dock-pill"
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
              className={`relative z-10 flex-1 py-2.5 flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
                i === shownIdx
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              <span className="text-2xl leading-none">{tb.icon}</span>
              {t(tb.labelKey)}
            </button>
          ))}
        </div>
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
