import { readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { resolve } from 'node:path';
import { isMailAddress, SMTP_TLS_MODES, type SmtpConfig, type SmtpTls } from '@kronaut/egress/smtp';

export const SERVER_ROLES = ['all', 'api', 'worker', 'media'] as const;
export type ServerRole = (typeof SERVER_ROLES)[number];

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export type Env = Readonly<Record<string, string | undefined>>;
export type ReadFile = (path: string) => string;

export class ConfigError extends Error {
  readonly variable: string;

  constructor(variable: string, message: string) {
    super(`${variable}: ${message}`);
    this.name = 'ConfigError';
    this.variable = variable;
  }
}

export interface AccessConfig {
  readonly aud: string;
  readonly teamDomain: string;
}

export interface ServerConfig {
  readonly role: ServerRole;
  readonly port: number;
  readonly databaseUrl: string | null;
  readonly publicUrl: URL;
  readonly mediaUrl: URL;
  readonly dataDir: string;
  readonly instanceId: string;
  readonly secret: Uint8Array;
  readonly access: AccessConfig | null;
  readonly logLevel: LogLevel;
  readonly workerId: string;
  readonly webDir: string | null;
  readonly smtp: SmtpConfig | null;
  readonly instanceAdmins: readonly string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BASE64 = /^[A-Za-z0-9+/_-]+={0,2}$/;
const TEAM_DOMAIN = /^[a-z0-9-]+\.cloudflareaccess\.com$/;
const WORKER_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const MIN_SECRET_BYTES = 32;
const SMTPS_PORT = 465;
const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);

function defaultReadFile(path: string): string {
  return readFileSync(path, 'utf8');
}

function present(value: string | undefined): value is string {
  return value !== undefined && value !== '';
}

export function envValue(
  env: Env,
  name: string,
  readFile: ReadFile = defaultReadFile,
): string | undefined {
  const direct = env[name];
  const file = env[`${name}_FILE`];
  if (present(direct) && present(file)) {
    throw new ConfigError(name, 'set the variable or its _FILE form, not both');
  }
  if (present(file)) {
    let content: string;
    try {
      content = readFile(file);
    } catch {
      throw new ConfigError(name, 'cannot read the _FILE path');
    }
    const trimmed = content.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return present(direct) ? direct : undefined;
}

export function requireEnv(env: Env, name: string, readFile?: ReadFile): string {
  const value = envValue(env, name, readFile);
  if (value === undefined) throw new ConfigError(name, 'is required');
  return value;
}

export function parseRole(argv: readonly string[]): ServerRole {
  let value: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--role') value = argv[i + 1];
    else if (arg?.startsWith('--role=')) value = arg.slice('--role='.length);
  }
  if (value === undefined) return 'all';
  if (!(SERVER_ROLES as readonly string[]).includes(value)) {
    throw new ConfigError('--role', `must be one of ${SERVER_ROLES.join(', ')}`);
  }
  return value as ServerRole;
}

export function parseBaseUrl(name: string, value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError(name, 'must be an absolute URL');
  }
  const local = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new ConfigError(name, 'must use https');
  }
  if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') {
    throw new ConfigError(name, 'must not carry credentials, a query or a fragment');
  }
  if (url.pathname !== '/') throw new ConfigError(name, 'must not have a path');
  return url;
}

export function parseSecret(name: string, value: string): Uint8Array {
  if (!BASE64.test(value)) throw new ConfigError(name, 'must be base64');
  const decoded = Buffer.from(
    value,
    value.includes('-') || value.includes('_') ? 'base64url' : 'base64',
  );
  if (decoded.length < MIN_SECRET_BYTES) {
    decoded.fill(0);
    throw new ConfigError(name, `must decode to at least ${MIN_SECRET_BYTES} bytes`);
  }
  return new Uint8Array(decoded);
}

export function parseUuid(name: string, value: string): string {
  const lowered = value.toLowerCase();
  if (!UUID.test(lowered)) throw new ConfigError(name, 'must be a uuid');
  return lowered;
}

function parsePort(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const port = Number(value);
  if (!/^[0-9]+$/.test(value) || port < 1 || port > 65535) {
    throw new ConfigError(name, 'must be a port number');
  }
  return port;
}

function parseLogLevel(value: string | undefined): LogLevel {
  if (value === undefined) return 'info';
  if (!(LOG_LEVELS as readonly string[]).includes(value)) {
    throw new ConfigError('KRONAUT_LOG_LEVEL', `must be one of ${LOG_LEVELS.join(', ')}`);
  }
  return value as LogLevel;
}

function parseAccess(env: Env, readFile: ReadFile): AccessConfig | null {
  const aud = envValue(env, 'ACCESS_AUD', readFile);
  const teamDomain = envValue(env, 'ACCESS_TEAM_DOMAIN', readFile);
  if (aud === undefined && teamDomain === undefined) return null;
  if (aud === undefined) throw new ConfigError('ACCESS_AUD', 'is required with ACCESS_TEAM_DOMAIN');
  if (teamDomain === undefined) {
    throw new ConfigError('ACCESS_TEAM_DOMAIN', 'is required with ACCESS_AUD');
  }
  const host = teamDomain
    .replace(/^https:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase();
  if (!TEAM_DOMAIN.test(host)) {
    throw new ConfigError('ACCESS_TEAM_DOMAIN', 'must be <team>.cloudflareaccess.com');
  }
  return { aud, teamDomain: host };
}

function parseWorkerId(value: string | undefined, role: ServerRole): string {
  const id = value ?? `${hostname()}-${role}-${process.pid}`;
  if (!WORKER_ID.test(id)) throw new ConfigError('KRONAUT_WORKER_ID', 'has invalid characters');
  return id;
}

function parseSmtpTls(value: string | undefined, port: number): SmtpTls {
  if (value === undefined) return port === SMTPS_PORT ? 'tls' : 'starttls';
  const mode = SMTP_TLS_MODES.find((m) => m === value);
  if (mode === undefined) {
    throw new ConfigError('KRONAUT_SMTP_TLS', `must be one of ${SMTP_TLS_MODES.join(', ')}`);
  }
  return mode;
}

function parseSmtp(env: Env, readFile: ReadFile): SmtpConfig | null {
  const host = envValue(env, 'KRONAUT_SMTP_HOST', readFile);
  if (host === undefined) return null;
  const port = parsePort('KRONAUT_SMTP_PORT', envValue(env, 'KRONAUT_SMTP_PORT', readFile), 587);
  const user = envValue(env, 'KRONAUT_SMTP_USER', readFile) ?? null;
  const password = envValue(env, 'KRONAUT_SMTP_PASSWORD', readFile) ?? null;
  if (user !== null && password === null) {
    throw new ConfigError('KRONAUT_SMTP_PASSWORD', 'is required with KRONAUT_SMTP_USER');
  }
  if (user === null && password !== null) {
    throw new ConfigError('KRONAUT_SMTP_USER', 'is required with KRONAUT_SMTP_PASSWORD');
  }
  const from = requireEnv(env, 'KRONAUT_SMTP_FROM', readFile);
  if (!isMailAddress(from)) throw new ConfigError('KRONAUT_SMTP_FROM', 'must be an email address');
  const tls = parseSmtpTls(envValue(env, 'KRONAUT_SMTP_TLS', readFile), port);
  return { host, port, user, password, from, tls };
}

function parseInstanceAdmins(value: string | undefined): string[] {
  const emails = (value ?? '')
    .split(',')
    .map((email) => email.trim().normalize('NFC').toLowerCase())
    .filter((email) => email !== '');
  if (!emails.every(isMailAddress)) {
    throw new ConfigError('KRONAUT_INSTANCE_ADMINS', 'must be a comma-separated list of emails');
  }
  return emails;
}

function parseWebDir(value: string | undefined): string | null {
  return value === undefined ? null : resolve(value);
}

export function loadServerConfig(
  env: Env,
  argv: readonly string[],
  readFile: ReadFile = defaultReadFile,
): ServerConfig {
  const publicUrl = parseBaseUrl(
    'KRONAUT_PUBLIC_URL',
    requireEnv(env, 'KRONAUT_PUBLIC_URL', readFile),
  );
  const mediaUrl = parseBaseUrl(
    'KRONAUT_MEDIA_URL',
    requireEnv(env, 'KRONAUT_MEDIA_URL', readFile),
  );
  if (publicUrl.origin === mediaUrl.origin) {
    throw new ConfigError(
      'KRONAUT_MEDIA_URL',
      'must be a different origin from KRONAUT_PUBLIC_URL',
    );
  }
  const role = parseRole(argv);
  return {
    role,
    port: parsePort('KRONAUT_PORT', envValue(env, 'KRONAUT_PORT', readFile), 3000),
    databaseUrl: role === 'media' ? null : requireEnv(env, 'KRONAUT_DATABASE_URL', readFile),
    publicUrl,
    mediaUrl,
    dataDir: resolve(envValue(env, 'KRONAUT_DATA_DIR', readFile) ?? './data'),
    instanceId: parseUuid('KRONAUT_INSTANCE_ID', requireEnv(env, 'KRONAUT_INSTANCE_ID', readFile)),
    secret: parseSecret('KRONAUT_SECRET', requireEnv(env, 'KRONAUT_SECRET', readFile)),
    access: parseAccess(env, readFile),
    logLevel: parseLogLevel(envValue(env, 'KRONAUT_LOG_LEVEL', readFile)),
    workerId: parseWorkerId(envValue(env, 'KRONAUT_WORKER_ID', readFile), role),
    webDir: parseWebDir(envValue(env, 'KRONAUT_WEB_DIR', readFile)),
    smtp: parseSmtp(env, readFile),
    instanceAdmins: parseInstanceAdmins(envValue(env, 'KRONAUT_INSTANCE_ADMINS', readFile)),
  };
}
