import { describe, expect, it } from 'vitest';
import { ConfigError, envValue, loadServerConfig, parseRole } from './config.ts';

const SECRET = Buffer.alloc(32, 7).toString('base64');
const BASE = {
  KRONAUT_PUBLIC_URL: 'https://app.example.test',
  KRONAUT_MEDIA_URL: 'https://media.example.test',
  KRONAUT_DATABASE_URL: 'postgres://app@db/kronaut',
  KRONAUT_INSTANCE_ID: '0192F7A0-0000-7000-8000-000000000001',
  KRONAUT_SECRET: SECRET,
  KRONAUT_WORKER_ID: 'worker-1',
};

function load(env: Record<string, string | undefined>, argv: string[] = []) {
  return loadServerConfig({ ...BASE, ...env }, argv, () => {
    throw new Error('no files');
  });
}

function failure(fn: () => unknown): ConfigError {
  try {
    fn();
  } catch (error) {
    if (error instanceof ConfigError) return error;
    throw error;
  }
  throw new Error('expected a ConfigError');
}

describe('loadServerConfig', () => {
  it('loads the defaults', () => {
    const config = load({});
    expect(config.role).toBe('all');
    expect(config.port).toBe(3000);
    expect(config.instanceId).toBe('0192f7a0-0000-7000-8000-000000000001');
    expect(config.secret).toHaveLength(32);
    expect(config.access).toBeNull();
    expect(config.logLevel).toBe('info');
    expect(config.publicUrl.origin).toBe('https://app.example.test');
  });

  it('gives the media role no database', () => {
    expect(load({ KRONAUT_DATABASE_URL: undefined }, ['--role=media']).databaseUrl).toBeNull();
    expect(load({}, ['--role=media']).databaseUrl).toBeNull();
    expect(failure(() => load({ KRONAUT_DATABASE_URL: undefined })).variable).toBe(
      'KRONAUT_DATABASE_URL',
    );
  });

  it('names the variable and never echoes a secret', () => {
    const error = failure(() => load({ KRONAUT_SECRET: Buffer.alloc(16).toString('base64') }));
    expect(error.variable).toBe('KRONAUT_SECRET');
    expect(error.message).not.toContain(Buffer.alloc(16).toString('base64'));
  });

  it('requires https outside localhost', () => {
    expect(failure(() => load({ KRONAUT_PUBLIC_URL: 'http://app.example.test' })).variable).toBe(
      'KRONAUT_PUBLIC_URL',
    );
    expect(
      load({
        KRONAUT_PUBLIC_URL: 'http://localhost:3000',
        KRONAUT_MEDIA_URL: 'http://127.0.0.1:3001',
      }).publicUrl.port,
    ).toBe('3000');
  });

  it('keeps media on its own origin', () => {
    expect(failure(() => load({ KRONAUT_MEDIA_URL: 'https://app.example.test' })).variable).toBe(
      'KRONAUT_MEDIA_URL',
    );
  });

  it('rejects base urls with a path', () => {
    expect(failure(() => load({ KRONAUT_PUBLIC_URL: 'https://app.example.test/x' })).variable).toBe(
      'KRONAUT_PUBLIC_URL',
    );
  });

  it('needs both Access settings or neither', () => {
    expect(failure(() => load({ ACCESS_AUD: 'aud' })).variable).toBe('ACCESS_TEAM_DOMAIN');
    expect(
      load({ ACCESS_AUD: 'aud', ACCESS_TEAM_DOMAIN: 'https://team.cloudflareaccess.com/' }).access,
    ).toEqual({ aud: 'aud', teamDomain: 'team.cloudflareaccess.com' });
    expect(
      failure(() => load({ ACCESS_AUD: 'aud', ACCESS_TEAM_DOMAIN: 'evil.example' })).variable,
    ).toBe('ACCESS_TEAM_DOMAIN');
  });
});

const SMTP = { KRONAUT_SMTP_HOST: 'smtp.example.com', KRONAUT_SMTP_FROM: 'kronaut@example.com' };

describe('smtp config', () => {
  it('is null without a host', () => {
    expect(load({}).smtp).toBeNull();
    expect(load({ KRONAUT_SMTP_FROM: 'kronaut@example.com' }).smtp).toBeNull();
  });

  it('defaults to port 587 with STARTTLS and no login', () => {
    expect(load(SMTP).smtp).toEqual({
      host: 'smtp.example.com',
      port: 587,
      user: null,
      password: null,
      from: 'kronaut@example.com',
      tls: 'starttls',
    });
  });

  it('defaults to implicit TLS on 465 and honours an explicit mode', () => {
    expect(load({ ...SMTP, KRONAUT_SMTP_PORT: '465' }).smtp?.tls).toBe('tls');
    expect(
      load({ ...SMTP, KRONAUT_SMTP_PORT: '465', KRONAUT_SMTP_TLS: 'starttls' }).smtp?.tls,
    ).toBe('starttls');
    expect(load({ ...SMTP, KRONAUT_SMTP_PORT: '25', KRONAUT_SMTP_TLS: 'none' }).smtp).toMatchObject(
      {
        port: 25,
        tls: 'none',
      },
    );
    expect(failure(() => load({ ...SMTP, KRONAUT_SMTP_TLS: 'ssl' })).variable).toBe(
      'KRONAUT_SMTP_TLS',
    );
    expect(failure(() => load({ ...SMTP, KRONAUT_SMTP_PORT: '0' })).variable).toBe(
      'KRONAUT_SMTP_PORT',
    );
  });

  it('requires a valid FROM address once the host is set', () => {
    expect(failure(() => load({ KRONAUT_SMTP_HOST: 'smtp.example.com' })).variable).toBe(
      'KRONAUT_SMTP_FROM',
    );
    expect(failure(() => load({ ...SMTP, KRONAUT_SMTP_FROM: 'kronaut' })).variable).toBe(
      'KRONAUT_SMTP_FROM',
    );
  });

  it('needs a password with a user, and a user with a password', () => {
    expect(failure(() => load({ ...SMTP, KRONAUT_SMTP_USER: 'mailer' })).variable).toBe(
      'KRONAUT_SMTP_PASSWORD',
    );
    expect(failure(() => load({ ...SMTP, KRONAUT_SMTP_PASSWORD: 'pw' })).variable).toBe(
      'KRONAUT_SMTP_USER',
    );
  });

  it('treats an empty password file as no password', () => {
    const env = { ...BASE, ...SMTP, KRONAUT_SMTP_PASSWORD_FILE: '/run/secrets/smtp_password' };
    const empty = () => '\n';
    expect(loadServerConfig(env, [], empty).smtp).toMatchObject({ user: null, password: null });
    expect(
      failure(() => loadServerConfig({ ...env, KRONAUT_SMTP_USER: 'mailer' }, [], empty)).variable,
    ).toBe('KRONAUT_SMTP_PASSWORD');
    expect(
      loadServerConfig({ ...BASE, KRONAUT_SMTP_PASSWORD_FILE: '/x' }, [], empty).smtp,
    ).toBeNull();
  });

  it('reads the password from _FILE and never echoes it', () => {
    const canary = `CANARY_SMTP_${'x'.repeat(16)}`;
    const env = { ...BASE, ...SMTP, KRONAUT_SMTP_USER: 'mailer' };
    const config = loadServerConfig(
      { ...env, KRONAUT_SMTP_PASSWORD_FILE: '/run/secrets/smtp' },
      [],
      (path) => (path === '/run/secrets/smtp' ? `${canary}\n` : ''),
    );
    expect(config.smtp).toMatchObject({ user: 'mailer', password: canary });

    const errors = [
      failure(() => load({ ...SMTP, KRONAUT_SMTP_PASSWORD: canary })),
      failure(() => load({ ...SMTP, KRONAUT_SMTP_PASSWORD: canary, KRONAUT_SMTP_TLS: 'x' })),
      failure(() =>
        load({
          ...SMTP,
          KRONAUT_SMTP_USER: 'mailer',
          KRONAUT_SMTP_PASSWORD: canary,
          KRONAUT_SMTP_PASSWORD_FILE: '/run/secrets/smtp',
        }),
      ),
    ];
    for (const error of errors) {
      expect(`${error.message} ${error.stack ?? ''}`).not.toContain(canary);
    }
  });
});

describe('envValue', () => {
  it('reads _FILE and trims it', () => {
    expect(envValue({ X_FILE: '/run/x' }, 'X', () => ' value\n')).toBe('value');
  });

  it('refuses both forms', () => {
    expect(failure(() => envValue({ X: 'a', X_FILE: '/run/x' }, 'X', () => 'b')).variable).toBe(
      'X',
    );
  });

  it('treats empty as unset', () => {
    expect(envValue({ X: '' }, 'X')).toBeUndefined();
  });
});

describe('parseRole', () => {
  it('accepts both argv forms', () => {
    expect(parseRole(['--role=worker'])).toBe('worker');
    expect(parseRole(['--role', 'media'])).toBe('media');
    expect(parseRole([])).toBe('all');
    expect(failure(() => parseRole(['--role=admin'])).variable).toBe('--role');
  });
});
