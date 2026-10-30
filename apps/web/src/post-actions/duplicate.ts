import { type Client, postsDuplicate } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import type { QueryClient } from '@tanstack/react-query';
import { errorCode, errorStatus, postKey, postsKey } from '../api.ts';
import { apiErrorMessage } from '../i18n.ts';
import { idempotency, keyFor } from '../idempotency.ts';

export interface DuplicateRun {
  readonly client: Client;
  readonly queryClient: QueryClient;
  readonly workspaceId: string;
  readonly postId: string;
  open(postId: string): Promise<void>;
}

export async function duplicatePost(run: DuplicateRun): Promise<void> {
  const { client, queryClient, workspaceId, postId } = run;
  try {
    const headers = idempotency(keyFor(null, postId));
    const { data } = await postsDuplicate({ client, path: { workspaceId, postId }, headers });
    queryClient.setQueryData(postKey(workspaceId, data.id), data);
    await queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) });
    await run.open(data.id);
  } catch (error) {
    if (errorStatus(error) !== 401) toast(apiErrorMessage(errorCode(error)), 'destructive');
  }
}
