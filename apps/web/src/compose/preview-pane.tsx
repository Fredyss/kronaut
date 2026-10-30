import { lazy, Suspense } from 'react';
import { m as composeText } from '../i18n/compose.ts';
import { loadPreview } from './load.ts';
import { previewTargets } from './targets.ts';
import type { ContentsState } from './use-contents.ts';

const Previews = lazy(loadPreview);

export function PreviewPane({ state }: { readonly state: ContentsState }) {
  return (
    <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
      <Suspense fallback={null}>
        <Previews
          targets={previewTargets(state)}
          empty={
            <p className="text-muted-foreground text-sm">{composeText.compose_preview_empty()}</p>
          }
          stacked
        />
      </Suspense>
    </div>
  );
}
