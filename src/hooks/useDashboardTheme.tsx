import { useEffect, useState, useCallback } from 'react';

type DashboardTheme = 'light' | 'dark';

const STORAGE_KEY = 'dashboardTheme';

const getInitial = (): DashboardTheme => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY) as DashboardTheme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  // Default to user's system preference
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyToHtml = (theme: DashboardTheme) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

/**
 * Manages dark/light theme for the internal dashboard area only.
 * Adds the `dark` class on <html> while mounted, removes it on unmount
 * so public pages (home, marketing) keep their original styling.
 */
export function useDashboardTheme() {
  const [theme, setThemeState] = useState<DashboardTheme>(getInitial);

  useEffect(() => {
    applyToHtml(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    return () => {
      // When the dashboard unmounts (user navigates to public site), reset.
      document.documentElement.classList.remove('dark');
    };
  }, [theme]);

  const setTheme = useCallback((t: DashboardTheme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    []
  );

  return { theme, setTheme, toggleTheme };
}
