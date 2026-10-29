import { type ChannelsQueueUpdateData, channelsQueueUpdate } from '@kronaut/sdk';
import { Button, Input, toast } from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import { type Channel, errorCode, errorStatus } from '../api.ts';
import { useApiClient } from '../context.ts';
import { useWeekdayFormat } from '../format.ts';
import { apiErrorMessage, m } from '../i18n.ts';
import { idempotency, type Keyed, keyFor } from '../idempotency.ts';
import { SELECT } from '../locale-select.tsx';
import { type Queue, queueQuery } from './queue.ts';

type Slot = ChannelsQueueUpdateData['body']['slots'][number];

interface Row extends Slot {
  readonly key: string;
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const NEW_SLOT: Slot = { weekday: 1, time: '09:00' };

interface EditorProps {
  readonly workspaceId: string;
  readonly channel: Channel;
  onClose(): void;
}

function zones(current: string): string[] {
  return [...new Set([current, ...Intl.supportedValuesOf('timeZone')])].sort();
}

function useSave({ workspaceId, channel, onClose }: EditorProps) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  return useMutation({
    mutationFn: async (body: ChannelsQueueUpdateData['body']) => {
      keyed.current = keyFor(keyed.current, JSON.stringify(body));
      const headers = idempotency(keyed.current);
      const path = { workspaceId, channelId: channel.id };
      return (await channelsQueueUpdate({ client, path, body, headers })).data;
    },
    onSuccess: (queue) => {
      keyed.current = null;
      queryClient.setQueryData(queueQuery(client, workspaceId, channel.id).queryKey, queue);
      toast(m.queue_saved());
      onClose();
    },
    onError: (error) => {
      if (errorStatus(error) !== 401) toast(apiErrorMessage(errorCode(error)), 'destructive');
    },
  });
}

function SlotRow({ row, set }: { readonly row: Row; set(row: Row | null): void }) {
  const weekday = useWeekdayFormat();
  return (
    <li className="flex flex-wrap items-center gap-2">
      <select
        aria-label={m.calendar_view_day()}
        value={row.weekday}
        onChange={(event) => set({ ...row, weekday: Number(event.currentTarget.value) })}
        className={SELECT}
      >
        {WEEKDAYS.map((day) => (
          <option key={day} value={day}>
            {weekday(day)}
          </option>
        ))}
      </select>
      <Input
        type="time"
        aria-label={m.compose_time()}
        value={row.time}
        onChange={(event) => set({ ...row, time: event.currentTarget.value })}
        className="h-8 w-auto"
      />
      <Button type="button" size="sm" variant="ghost" onClick={() => set(null)}>
        {m.compose_image_remove()}
      </Button>
    </li>
  );
}

function QueueForm({ initial, ...props }: EditorProps & { readonly initial: Queue }) {
  const [zone, setZone] = useState(
    initial.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [rows, setRows] = useState<Row[]>(() =>
    initial.slots.map((slot) => ({ ...slot, key: crypto.randomUUID() })),
  );
  const save = useSave(props);
  const zoneId = useId();
  const slots = [
    ...new Map(rows.map(({ weekday, time }) => [`${weekday}T${time}`, { weekday, time }])).values(),
  ];
  const update = (key: string) => (next: Row | null) =>
    setRows((list) =>
      list.flatMap((row) => (row.key !== key ? [row] : next === null ? [] : [next])),
    );
  return (
    <form
      className="flex basis-full flex-col gap-3 rounded-lg border p-3 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (!save.isPending) save.mutate({ timezone: zone, slots });
      }}
    >
      <label htmlFor={zoneId} className="font-medium">
        {m.queue_zone()}
      </label>
      <select
        id={zoneId}
        value={zone}
        onChange={(event) => setZone(event.currentTarget.value)}
        className={SELECT}
      >
        {zones(zone).map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </select>
      <p className="text-muted-foreground">{m.queue_evergreen()}</p>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <SlotRow key={row.key} row={row} set={update(row.key)} />
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRows((list) => [...list, { ...NEW_SLOT, key: crypto.randomUUID() }])}
        >
          {m.queue_add()}
        </Button>
        <Button type="submit" size="sm" disabled={save.isPending}>
          {m.settings_save()}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={props.onClose}>
          {m.inbox_cancel()}
        </Button>
      </div>
    </form>
  );
}

export function QueueEditor(props: EditorProps) {
  const client = useApiClient();
  const queue = useQuery(queueQuery(client, props.workspaceId, props.channel.id));
  if (queue.isError) {
    return (
      <p role="alert" className="basis-full text-destructive text-sm">
        {m.error_generic()}
      </p>
    );
  }
  return queue.data === undefined ? null : <QueueForm {...props} initial={queue.data} />;
}
