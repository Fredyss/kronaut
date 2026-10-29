import { type Client, seriesGet, seriesStop } from '@kronaut/sdk';
import { Button, toast } from '@kronaut/ui';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { errorCode, errorStatus } from '../api.ts';
import { useApiClient } from '../context.ts';
import { useWallFormat } from '../format.ts';
import { apiErrorMessage, m } from '../i18n.ts';
import { idempotency, type Keyed, keyFor } from '../idempotency.ts';
import { useRuleText } from './rule-text.ts';

interface SeriesScope {
  readonly workspaceId: string;
  readonly seriesId: string;
}

function seriesQuery(client: Client, path: SeriesScope) {
  return queryOptions({
    queryKey: ['series', path.workspaceId, path.seriesId],
    queryFn: async () => (await seriesGet({ client, path })).data,
  });
}

function useStop(path: SeriesScope) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  return useMutation({
    mutationFn: async () => {
      keyed.current = keyFor(keyed.current, path.seriesId);
      return (await seriesStop({ client, path, headers: idempotency(keyed.current) })).data;
    },
    onSuccess: (series) => {
      keyed.current = null;
      queryClient.setQueryData(seriesQuery(client, path).queryKey, series);
    },
    onError: (error) => {
      if (errorStatus(error) !== 401) toast(apiErrorMessage(errorCode(error)), 'destructive');
    },
  });
}

function StopConfirm({
  pending,
  onConfirm,
  onClose,
}: {
  readonly pending: boolean;
  onConfirm(): void;
  onClose(): void;
}) {
  const confirm = useRef<HTMLButtonElement>(null);
  useEffect(() => confirm.current?.focus(), []);
  return (
    <fieldset
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3 text-sm"
    >
      <legend className="sr-only">{m.series_stop()}</legend>
      <p>{m.series_stop_body()}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          ref={confirm}
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={onConfirm}
        >
          {m.series_stop()}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {m.inbox_cancel()}
        </Button>
      </div>
    </fieldset>
  );
}

export function SeriesSection(scope: SeriesScope) {
  const client = useApiClient();
  const series = useQuery(seriesQuery(client, scope)).data;
  const ruleText = useRuleText();
  const wall = useWallFormat();
  const stop = useStop(scope);
  const [confirming, setConfirming] = useState(false);
  if (series === undefined) return null;
  const live = series.state === 'active' || series.state === 'paused';
  return (
    <section className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
      <h2 className="font-medium">{m.repeat_label()}</h2>
      {ruleText(series.rule).map((line) => (
        <p key={line}>{line}</p>
      ))}
      {series.state === 'active' && series.nextLocal !== null ? (
        <p className="text-muted-foreground">
          {m.series_next({ when: wall(series.nextLocal), tz: series.timezone })}
        </p>
      ) : null}
      {series.state === 'active' ? null : (
        <p className="text-muted-foreground">{m.series_state({ state: series.state })}</p>
      )}
      {!live ? null : confirming ? (
        <StopConfirm
          pending={stop.isPending}
          onConfirm={() => stop.mutate(undefined, { onSettled: () => setConfirming(false) })}
          onClose={() => setConfirming(false)}
        />
      ) : (
        <div>
          <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
            {m.series_stop()}
          </Button>
        </div>
      )}
    </section>
  );
}
