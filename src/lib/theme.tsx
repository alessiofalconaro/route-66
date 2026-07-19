// Theme (light / dark / system) with persistence.
// Tailwind's `dark:` classes activate when <html> has the "dark" class;
// this provider decides when to put it there.
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { usePersistentState } from './storage';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePersistentState<Theme>('theme', 'system');

  useEffect(() => {
    // matchMedia = asks the OS/browser "is the system in dark mode?"
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      // Also tint the browser chrome (address bar) to match.
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#0c0a09' : '#b91c1c');
    };

    apply();
    // In "system" mode, react live if the phone switches (e.g. sunset auto-dark).
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply); // cleanup on unmount
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
