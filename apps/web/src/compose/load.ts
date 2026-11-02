export const loadEditor = () => import('./content/editor.tsx');
export const loadTextLimits = () => import('./content/text-limits.tsx');
export const loadPreview = () => import('./preview/preview.tsx');

export function preloadEditor(): void {
  void loadEditor();
}
