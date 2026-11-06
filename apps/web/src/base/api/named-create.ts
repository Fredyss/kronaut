import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { idempotency, type Keyed, keyFor } from './idempotency.ts';

type Headers = ReturnType<typeof idempotency>;

interface NamedCreate<T> {
  readonly queryKey: QueryKey;
  create(name: string, headers: Headers): Promise<T>;
  created(item: T): void;
}

export function useNamedCreate<T>({ queryKey, create, created }: NamedCreate<T>) {
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  return useMutation({
    mutationFn: (name: string) => {
      keyed.current = keyFor(keyed.current, name);
      return create(name, idempotency(keyed.current));
    },
    onSuccess: (item) => {
      keyed.current = null;
      created(item);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
