// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, storedTheme, ThemeToggle } from './theme.tsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.className = '';
});

function classes(): string[] {
  return [...document.documentElement.classList];
}

describe('theme toggle', () => {
  it('cycles system, light and dark, setting the class and remembering the choice', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Theme: system' }));
    expect(classes()).toEqual(['light']);
    expect(localStorage.getItem('kronaut.theme')).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Theme: light' }));
    expect(classes()).toEqual(['dark']);
    expect(storedTheme()).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Theme: dark' }));
    expect(classes()).toEqual([]);
    expect(localStorage.getItem('kronaut.theme')).toBeNull();
    expect(screen.getByRole('button', { name: 'Theme: system' })).toBeDefined();
  });

  it('keeps working when storage throws', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    applyTheme(storedTheme());
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Theme: system' }));
    expect(classes()).toEqual(['light']);
    expect(screen.getByRole('button', { name: 'Theme: light' })).toBeDefined();
  });
});
