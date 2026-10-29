import { cn } from '@kronaut/ui';
import type { KeyboardEvent } from 'react';
import { m as composeText } from '../i18n/compose.ts';
import type { ContentKey } from './contents.ts';

export interface ContentTab {
  readonly key: ContentKey;
  readonly label: string;
  readonly customized: boolean;
  readonly problems: boolean;
}

interface ContentTabsProps {
  readonly tabs: readonly ContentTab[];
  readonly active: ContentKey;
  readonly idPrefix: string;
  readonly panelId: string;
  readonly onSelect: (key: ContentKey) => void;
}

export function tabId(idPrefix: string, key: ContentKey): string {
  return `${idPrefix}-tab-${key ?? 'all'}`;
}

function targetIndex(key: string, index: number, count: number): number | null {
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

export function ContentTabs({ tabs, active, idPrefix, panelId, onSelect }: ContentTabsProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = targetIndex(event.key, index, tabs.length);
    const tab = next === null ? undefined : tabs[next];
    if (tab === undefined) return;
    event.preventDefault();
    onSelect(tab.key);
    document.getElementById(tabId(idPrefix, tab.key))?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={composeText.compose_tabs_label()}
      className="flex flex-wrap gap-1 border-b"
    >
      {tabs.map((tab, index) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key ?? ''}
            id={tabId(idPrefix, tab.key)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.key)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring',
              selected
                ? 'border-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.customized ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                {composeText.compose_customized()}
              </span>
            ) : null}
            {tab.problems ? (
              <>
                <span aria-hidden="true" className="size-2 rounded-full bg-destructive" />
                <span className="sr-only">{composeText.compose_tab_problems()}</span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
