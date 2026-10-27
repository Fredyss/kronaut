import { buttonVariants } from '@kronaut/ui';
import { useSyncExternalStore } from 'react';
import { m } from './i18n.ts';
import { Icon } from './icon.tsx';

export const THEMES = ['system', 'light', 'dark'] as const;

export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = 'kronaut.theme';

export function storedTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme: Theme): void {
  const classes = document.documentElement.classList;
  classes.toggle('light', theme === 'light');
  classes.toggle('dark', theme === 'dark');
}

function storeTheme(theme: Theme): void {
  try {
    if (theme === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

const listeners = new Set<() => void>();
let current: Theme | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): Theme {
  current ??= storedTheme();
  return current;
}

export function chooseTheme(theme: Theme): void {
  applyTheme(theme);
  storeTheme(theme);
  current = theme;
  for (const listener of listeners) listener();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, snapshot);
}

function themeLabel(theme: Theme): string {
  switch (theme) {
    case 'system':
      return m.theme_system();
    case 'light':
      return m.theme_light();
    case 'dark':
      return m.theme_dark();
  }
}

function ThemeIcon({ theme }: { readonly theme: Theme }) {
  if (theme === 'light') {
    return (
      <Icon>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </Icon>
    );
  }
  if (theme === 'dark') {
    return (
      <Icon>
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
      </Icon>
    );
  }
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </Icon>
  );
}

export function ThemeToggle() {
  const theme = useTheme();
  const label = themeLabel(theme);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'system';
        chooseTheme(next);
      }}
      className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'size-8' })}
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}
