import { Button } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useId } from 'react';
import { meQuery } from '../api.ts';
import { ChannelsFieldset } from '../compose/channel-picker.tsx';
import { ContentSection } from '../compose/content-section.tsx';
import { Failure } from '../compose/failure.tsx';
import { useComposeForm } from '../compose/use-compose-form.ts';
import { submitLabel } from '../compose/when.ts';
import { WhenFieldset } from '../compose/when-fieldset.tsx';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';

const route = getRouteApi('/app/compose');

function SubmitRow({
  label,
  disabled,
  describedBy,
  onRequest,
}: {
  readonly label: string;
  readonly disabled: boolean;
  readonly describedBy: string | undefined;
  readonly onRequest: (() => void) | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={disabled} aria-describedby={describedBy}>
        {label}
      </Button>
      {onRequest === undefined ? null : (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-describedby={describedBy}
          onClick={onRequest}
        >
          {m.compose_request_approval()}
        </Button>
      )}
    </div>
  );
}

function Composer({
  workspaceId,
  at,
}: {
  readonly workspaceId: string;
  readonly at?: string | undefined;
}) {
  const {
    channels,
    list,
    content,
    selected,
    setSelected,
    when,
    formError,
    blocked,
    flagged,
    setLimitFlags,
    failure,
    pending,
    onSubmit,
    approval,
    requestInstead,
    queue,
  } = useComposeForm(workspaceId, at);
  const dateId = useId();
  const timeId = useId();
  const limitsId = useId();

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit} noValidate>
      <ContentSection
        state={content}
        flagged={flagged}
        pending={pending}
        limitsId={limitsId}
        onIssuesChange={setLimitFlags}
      />

      <ChannelsFieldset
        channels={channels.data}
        failed={channels.isError}
        mediaFor={content.mediaFor}
        customized={(id) => content.contents.customized.has(id)}
        selected={selected}
        setSelected={setSelected}
        pending={pending}
      />

      <WhenFieldset
        when={when}
        dateId={dateId}
        timeId={timeId}
        pending={pending}
        note={approval.request ? approval.note : undefined}
        queue={approval.request ? undefined : queue}
      />

      {formError === null ? null : (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      )}
      {failure === null ? null : <Failure error={failure} channels={list} />}

      <SubmitRow
        label={submitLabel(when.mode, pending, approval.request)}
        disabled={pending || blocked}
        describedBy={blocked ? limitsId : undefined}
        onRequest={approval.offer ? requestInstead : undefined}
      />
    </form>
  );
}

export function ComposePage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  const { at } = route.useSearch();
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">{m.compose_title()}</h1>
        <p className="text-muted-foreground text-sm">{m.compose_subtitle()}</p>
      </header>
      {workspace === undefined ? null : <Composer workspaceId={workspace.id} at={at} />}
    </section>
  );
}
