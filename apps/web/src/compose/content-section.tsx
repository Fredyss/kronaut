import { Button } from '@kronaut/ui';
import { lazy, Suspense, useId } from 'react';
import type { Channel } from '../api.ts';
import { useLocale } from '../context.ts';
import { m as composeText } from '../i18n/compose.ts';
import { channelHint } from './channel-picker.tsx';
import { type ContentTab, ContentTabs, tabId } from './content-tabs.tsx';
import { ImagesSection } from './images-section.tsx';
import { EditorFallback, ItemsSection, MainOnlyNotes } from './items-section.tsx';
import { loadEditor, loadTextLimits } from './load.ts';
import { limitTargets } from './targets.ts';
import type { ContentsState } from './use-contents.ts';

const PostEditor = lazy(loadEditor);
const TextLimits = lazy(loadTextLimits);

interface ContentSectionProps {
  readonly state: ContentsState;
  readonly flagged: readonly string[];
  readonly pending: boolean;
  readonly limitsId: string;
  readonly onIssuesChange: (flagged: readonly string[]) => void;
}

function tabsFor(state: ContentsState, flagged: readonly string[]): ContentTab[] {
  const customized = (channel: Channel) => state.contents.customized.has(channel.id);
  const all: ContentTab = {
    key: null,
    label: composeText.compose_tab_all(),
    customized: false,
    problems: state.tabs.some((channel) => !customized(channel) && flagged.includes(channel.id)),
  };
  return [
    all,
    ...state.tabs.map((channel) => ({
      key: channel.id,
      label: channel.displayName,
      customized: customized(channel),
      problems: flagged.includes(channel.id),
    })),
  ];
}

function checkNote(tabs: readonly ContentTab[], active: string | null, locale: string) {
  const labels = tabs.filter((tab) => tab.problems && tab.key !== active).map((tab) => tab.label);
  if (labels.length === 0) return null;
  const channels = new Intl.ListFormat(locale, { type: 'conjunction' }).format(labels);
  return composeText.compose_check_content({ channels });
}

function Inherited({
  channel,
  pending,
  onCustomize,
}: {
  readonly channel: string;
  readonly pending: boolean;
  readonly onCustomize: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed p-4 text-sm">
      <p className="text-muted-foreground">{composeText.compose_inherits()}</p>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onCustomize}>
        {composeText.compose_customize({ channel })}
      </Button>
    </div>
  );
}

function TextHeader({
  onReset,
  pending,
}: {
  readonly onReset: (() => void) | undefined;
  readonly pending: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-medium text-sm">{composeText.compose_text_label()}</span>
      {onReset === undefined ? null : (
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onReset}>
          {composeText.compose_use_default()}
        </Button>
      )}
    </div>
  );
}

export function ContentSection(props: ContentSectionProps) {
  const { state, flagged, pending, limitsId, onIssuesChange } = props;
  const idPrefix = useId();
  const editorId = useId();
  const fileId = useId();
  const panelId = `${idPrefix}-panel`;
  const showTabs = state.tabs.length > 0;
  const { active, editing } = state;
  const { locale } = useLocale();
  const channel = state.tabs.find((candidate) => candidate.id === active);
  const tabs = tabsFor(state, flagged);
  const reason =
    channel === undefined ? null : channelHint(channel, state.choiceOf(channel), locale);
  const targets = limitTargets(state);
  return (
    <div className="flex flex-col gap-4">
      {showTabs ? (
        <ContentTabs
          tabs={tabs}
          active={active}
          idPrefix={idPrefix}
          panelId={panelId}
          onSelect={state.select}
        />
      ) : null}
      <div
        id={panelId}
        {...(showTabs ? { role: 'tabpanel', 'aria-labelledby': tabId(idPrefix, active) } : {})}
        className="flex flex-col gap-8"
      >
        <div className="flex flex-col gap-2">
          {editing ? (
            <TextHeader
              pending={pending}
              onReset={channel === undefined ? undefined : () => state.reset(channel.id)}
            />
          ) : null}
          {editing || channel === undefined ? (
            <Suspense fallback={<EditorFallback />}>
              <PostEditor
                key={active ?? ''}
                id={editorId}
                label={composeText.compose_text_label()}
                disabled={pending}
                initial={state.doc}
                onChange={state.setDoc}
              />
            </Suspense>
          ) : (
            <Inherited
              channel={channel.displayName}
              pending={pending}
              onCustomize={() => state.customize(channel.id)}
            />
          )}
          <Suspense fallback={null}>
            <TextLimits
              targets={targets}
              issuesId={limitsId}
              note={checkNote(tabs, active, locale)}
              onIssuesChange={onIssuesChange}
            />
          </Suspense>
        </div>
        {reason === null ? null : <p className="text-destructive text-sm">{reason}</p>}
        {editing ? <ImagesSection fileId={fileId} media={state.media} pending={pending} /> : null}
        {editing ? <ItemsSection state={state} targets={targets} pending={pending} /> : null}
        <MainOnlyNotes state={state} />
      </div>
    </div>
  );
}
