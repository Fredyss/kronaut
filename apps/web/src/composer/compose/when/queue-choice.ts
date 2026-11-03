import { useQueries } from '@tanstack/react-query';
import { useApiClient } from '../../../base/api/client.ts';
import type { Channel } from '../../../records/channels/queries.ts';
import { type Queue, queueQuery } from '../../../records/channels/queue.ts';

export interface QueueEntry {
  readonly channel: Channel;
  readonly queue: Queue | undefined;
}

export interface QueueChoice {
  readonly entries: readonly QueueEntry[];
  readonly empty: Channel | undefined;
}

export function useQueueChoice(workspaceId: string, channels: readonly Channel[]): QueueChoice {
  const client = useApiClient();
  const queues = useQueries({
    queries: channels.map((channel) => queueQuery(client, workspaceId, channel.id)),
  });
  const entries = channels.map((channel, index) => ({ channel, queue: queues[index]?.data }));
  return { entries, empty: entries.find((entry) => entry.queue?.timezone === null)?.channel };
}
