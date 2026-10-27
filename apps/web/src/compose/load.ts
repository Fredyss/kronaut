export const loadEditor = () => import('./editor.tsx');
export const loadTextLimits = () => import('./text-limits.tsx');
export const loadPreview = () => import('./preview/preview.tsx');

export function preloadEditor(): void {
  void loadEditor();
}
