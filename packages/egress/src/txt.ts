import { Resolver } from 'node:dns/promises';
import { EgressError } from './errors.ts';

export interface TxtResolver {
  resolveTxt(name: string): Promise<string[][]>;
  cancel(): void;
}

export interface ResolveTxtOptions {
  readonly timeoutMs: number;
  readonly resolver?: TxtResolver;
}

const NO_RECORDS: ReadonlySet<string> = new Set(['ENODATA', 'ENOTFOUND']);

function errnoCode(error: unknown): string | undefined {
  const code: unknown = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

export async function resolveTxt(name: string, options: ResolveTxtOptions): Promise<string[]> {
  const resolver = options.resolver ?? new Resolver({ timeout: options.timeoutMs, tries: 1 });
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      resolver.cancel();
      reject(new EgressError('timeout', 'dns query timed out'));
    }, options.timeoutMs);
  });
  try {
    const records = await Promise.race([resolver.resolveTxt(name), timeout]);
    return records.map((chunks) => chunks.join(''));
  } catch (cause) {
    if (cause instanceof EgressError) throw cause;
    const code = errnoCode(cause);
    if (code !== undefined && NO_RECORDS.has(code)) return [];
    if (code === 'ETIMEOUT') throw new EgressError('timeout', 'dns query timed out', { cause });
    throw new EgressError('dns_failure', 'dns txt query failed', { cause });
  } finally {
    clearTimeout(timer);
  }
}
