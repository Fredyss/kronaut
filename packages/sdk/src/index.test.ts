import { describe, expect, it } from 'vitest';
import { ApiRequestError, authLogin, createApiClient } from './index.ts';

describe('createApiClient', () => {
  it('sends same-origin credentials and maps an error body to ApiError', async () => {
    const seen: Request[] = [];
    const client = createApiClient({
      baseUrl: 'http://kronaut.test',
      fetch: async (input) => {
        seen.push(input as Request);
        return Response.json(
          {
            error: {
              code: 'unauthenticated',
              message: 'No.',
              requestId: 'req-12345678',
              details: [{ path: 'body.email', code: 'unknown' }],
            },
          },
          { status: 401 },
        );
      },
    });

    const failure = await authLogin({ client, body: { email: 'a@b.test', password: 'x' } }).catch(
      (error: unknown) => error,
    );

    expect(seen[0]?.credentials).toBe('same-origin');
    expect(seen[0]?.url).toBe('http://kronaut.test/v1/auth/login');
    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).toMatchObject({
      status: 401,
      code: 'unauthenticated',
      body: {
        error: {
          code: 'unauthenticated',
          message: 'No.',
          requestId: 'req-12345678',
          details: [{ path: 'body.email', code: 'unknown' }],
        },
      },
    });
  });
});
