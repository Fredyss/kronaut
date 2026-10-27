import { type NotificationsMarkReadData, notificationsMarkRead } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isUnauthenticated, type NotificationList, notificationsKey } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';

export type MarkReadBody = NotificationsMarkReadData['body'];

export function useMarkRead(workspaceId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const queryKey = notificationsKey(workspaceId);
  return useMutation({
    mutationFn: async (body: MarkReadBody) =>
      (
        await notificationsMarkRead({
          client,
          path: { workspaceId },
          body,
          headers: { 'Idempotency-Key': crypto.randomUUID() },
        })
      ).data,
    onSuccess: async ({ unread }) => {
      queryClient.setQueryData<NotificationList>(queryKey, (list) =>
        list === undefined ? list : { ...list, unread },
      );
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      if (!isUnauthenticated(error)) toast(m.notifications_mark_failed(), 'destructive');
    },
  });
}
