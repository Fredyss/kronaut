import { MockAgent } from 'undici';
import { afterEach, beforeEach, expect } from 'vitest';
import { createHttpClient } from './client.ts';
import { EgressError, type EgressErrorCode } from './errors.ts';
import type { EgressPolicy } from './policy.ts';

export const ORIGIN = 'https://api.example.com';

export let agent: MockAgent;

export function useMockAgent(): void {
  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
  });

  afterEach(async () => {
    await agent.close();
  });
}

export function clientWith(overrides: Partial<EgressPolicy> = {}) {
  return createHttpClient(
    {
      allowedHosts: ['api.example.com'],
      maxResponseBytes: 1024,
      timeoutMs: 2000,
      maxRedirects: 3,
      ...overrides,
    },
    { dispatcher: agent },
  );
}

export async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the promise to reject');
}

export async function expectEgress(
  promise: Promise<unknown>,
  code: EgressErrorCode,
): Promise<void> {
  const error = await errorOf(promise);
  expect(error).toBeInstanceOf(EgressError);
  expect((error as EgressError).code).toBe(code);
}

interface SeenRequest {
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
}

function bodyText(body: string | Uint8Array): string {
  return typeof body === 'string' ? body : new TextDecoder().decode(body);
}

export function recorder(): { seen: SeenRequest[]; reply: (opts: unknown) => string } {
  const seen: SeenRequest[] = [];
  return {
    seen,
    reply: (opts) => {
      const { method, headers, body } = opts as {
        method: string;
        headers: Record<string, string> | string[];
        body?: string | Uint8Array | null;
      };
      const normalized: Record<string, string> = {};
      if (Array.isArray(headers)) {
        for (let index = 0; index < headers.length; index += 2) {
          normalized[String(headers[index]).toLowerCase()] = String(headers[index + 1]);
        }
      } else {
        for (const [name, value] of Object.entries(headers ?? {})) {
          normalized[name.toLowerCase()] = String(value);
        }
      }
      seen.push({
        method,
        headers: normalized,
        body: body === undefined || body === null ? undefined : bodyText(body),
      });
      return 'ok';
    },
  };
}
