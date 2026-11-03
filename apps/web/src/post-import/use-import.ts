import { postsImport } from '@kronaut/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useApiClient } from '../api/client.ts';
import { errorStatus } from '../api/errors.ts';
import { idempotency, type Keyed, keyFor } from '../api/idempotency.ts';
import { postsKey } from '../posts/queries.ts';
import type { Prepared } from './prepare.ts';
import type { ImportRow } from './rows.ts';

export function checkedRows(prepared: Prepared | null): readonly ImportRow[] | null {
  if (prepared === null || prepared.problems.length > 0 || prepared.rows.length === 0) return null;
  return prepared.rows;
}

export function useImportCheck(workspaceId: string, prepared: Prepared | null) {
  const client = useApiClient();
  const rows = checkedRows(prepared);
  return useQuery({
    queryKey: ['post-import', workspaceId, rows],
    queryFn: async () => {
      const body = { dryRun: true, rows: [...(rows ?? [])] };
      const headers = { 'Idempotency-Key': crypto.randomUUID() };
      return (await postsImport({ client, path: { workspaceId }, body, headers })).data;
    },
    enabled: rows !== null,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useImportRun(workspaceId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  return useMutation({
    mutationFn: async (rows: readonly ImportRow[]) => {
      keyed.current = keyFor(keyed.current, JSON.stringify(rows));
      const headers = idempotency(keyed.current);
      const body = { rows: [...rows] };
      return (await postsImport({ client, path: { workspaceId }, body, headers })).data;
    },
    onError: (error) => {
      if (errorStatus(error) !== null) keyed.current = null;
    },
    onSuccess: async () => {
      keyed.current = null;
      await queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) });
    },
  });
}
