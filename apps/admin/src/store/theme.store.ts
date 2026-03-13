import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

/**
 * Applies or removes the `dark` class on <html> so Tailwind's darkMode: 'class'
 * picks it up. Called on every state change and on initial hydration.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',

      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'dark' ? 'light' : 'dark';
          applyTheme(next);
          return { theme: next };
        }),

      setTheme: (theme) =>
        set(() => {
          applyTheme(theme);
          return { theme };
        }),
    }),
    {
      name: 'devaseva-theme',       // localStorage key
      // Re-apply the class immediately after hydration from storage
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

/**
 * Call once at app startup (before React renders) to avoid a flash of
 * the wrong theme. Reads from localStorage directly — no React involved.
 */
export function initTheme(): void {
  try {
    const stored = localStorage.getItem('devaseva-theme');
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { theme?: Theme } };
      applyTheme(parsed?.state?.theme ?? 'dark');
    } else {
      // Default: respect OS preference, fall back to dark
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  } catch {
    applyTheme('dark');
  }
}
