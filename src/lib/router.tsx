// Tiny hash-based router. Why hash (#/hotels) and not real paths: GitHub
// Pages serves a static site under /route-66/, so real paths would 404 on
// reload — the hash never reaches the server.
// Every navigation pushes a browser-history entry, so the iOS edge-swipe
// "back" gesture (and the Android back button) really go back in the app.
import { useEffect, useState } from 'react';

/** '#/home/city/tulsa' → ['home', 'city', 'tulsa'] */
function parse(): string[] {
  return window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
}

export interface Router {
  route: string[];
  /** Go to a path (pushes history → swipe-back returns here). */
  navigate: (path: string) => void;
  /** Go back one step in history (what the in-app ← buttons use). */
  back: () => void;
}

export function useHashRoute(): Router {
  const [route, setRoute] = useState<string[]>(parse);

  useEffect(() => {
    // First load with no hash: set it without creating a history entry.
    if (!window.location.hash) history.replaceState(null, '', '#/home');
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = (path: string) => {
    const hash = '#/' + path;
    if (window.location.hash === hash) return; // already there
    window.location.hash = '/' + path; // fires hashchange → setRoute
  };

  const back = () => history.back();

  return { route, navigate, back };
}
