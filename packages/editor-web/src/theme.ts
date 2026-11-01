import type { ThemeName } from '@toolsmith/shared';

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  if (theme === 'cosmic') {
    document.documentElement.style.colorScheme = 'dark';
  }
}
