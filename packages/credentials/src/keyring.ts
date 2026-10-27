import { readFileSync } from 'node:fs';
import { CredentialError } from './errors.ts';

const KEY_BYTES = 32;
const MIN_VERSION = 1;
const MAX_VERSION = 32767;
const ENV_NAME = /^KRONAUT_KEK_([0-9]+)(_FILE)?$/;
const VERSION_DIGITS = /^[1-9][0-9]*$/;
const BASE64_BODY = /^[A-Za-z0-9+/]{43}$/;
const BASE64URL_BODY = /^[A-Za-z0-9_-]{43}$/;

export interface Keyring {
  readonly current: number;
  versions(): readonly number[];
  key(version: number): Uint8Array;
}

export function createKeyring(keys: ReadonlyMap<number, Uint8Array>): Keyring {
  const stored = new Map<number, Uint8Array>();
  for (const [version, key] of keys) {
    if (!Number.isInteger(version) || version < MIN_VERSION || version > MAX_VERSION) {
      throw new CredentialError('invalid_key');
    }
    if (!(key instanceof Uint8Array) || key.length !== KEY_BYTES) {
      throw new CredentialError('invalid_key');
    }
    stored.set(version, Uint8Array.from(key));
  }
  const versions = [...stored.keys()].sort((a, b) => a - b);
  const current = versions.at(-1);
  if (current === undefined) {
    throw new CredentialError('invalid_key');
  }
  return {
    current,
    versions: () => [...versions],
    key(version: number): Uint8Array {
      const key = stored.get(version);
      if (key === undefined) {
        throw new CredentialError('unknown_kek');
      }
      return Uint8Array.from(key);
    },
  };
}

function defaultReadFile(path: string): string {
  return readFileSync(path, 'utf8');
}

function decodeKey(value: string): Buffer {
  const body = value.endsWith('=') ? value.slice(0, -1) : value;
  const standard = BASE64_BODY.test(body);
  if (!standard && !BASE64URL_BODY.test(body)) {
    throw new CredentialError('invalid_key');
  }
  const decoded = Buffer.from(body, standard ? 'base64' : 'base64url');
  const canonical = standard
    ? decoded.toString('base64').replace(/=+$/, '')
    : decoded.toString('base64url');
  if (decoded.length !== KEY_BYTES || canonical !== body) {
    decoded.fill(0);
    throw new CredentialError('invalid_key');
  }
  return decoded;
}

interface KeySource {
  readonly file: boolean;
  readonly value: string;
}

function envSources(env: Readonly<Record<string, string | undefined>>): Map<number, KeySource> {
  const sources = new Map<number, KeySource>();
  for (const [name, value] of Object.entries(env)) {
    const match = ENV_NAME.exec(name);
    if (match === null || value === undefined) {
      continue;
    }
    const digits = match[1] ?? '';
    if (!VERSION_DIGITS.test(digits)) {
      throw new CredentialError('invalid_key');
    }
    const version = Number(digits);
    if (sources.has(version)) {
      throw new CredentialError('invalid_key');
    }
    sources.set(version, { file: match[2] !== undefined, value });
  }
  return sources;
}

function readSource(source: KeySource, readFile: (path: string) => string): string {
  let raw: string;
  if (source.file) {
    try {
      raw = readFile(source.value).trim();
    } catch {
      throw new CredentialError('invalid_key');
    }
  } else {
    raw = source.value;
  }
  return raw;
}

export function keyringFromEnv(
  env: Readonly<Record<string, string | undefined>>,
  readFile: (path: string) => string = defaultReadFile,
): Keyring {
  const sources = envSources(env);

  const decoded = new Map<number, Buffer>();
  try {
    for (const [version, source] of sources) {
      decoded.set(version, decodeKey(readSource(source, readFile)));
    }
    return createKeyring(decoded);
  } finally {
    for (const key of decoded.values()) {
      key.fill(0);
    }
  }
}
