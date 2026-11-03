import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import type { ClientSigningKey, Jwk } from '@kronaut/core';
import { type Keyring, openCredential, sealCredential } from '@kronaut/credentials';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

const KID_BYTES = 16;
const ALG = 'ES256';

export interface NewSigningKey {
  readonly id: string;
  readonly kid: string;
  readonly alg: typeof ALG;
  readonly public_jwk: Jwk;
  readonly ciphertext: Buffer;
  readonly nonce: Buffer;
  readonly wrapped_dek: Buffer;
  readonly kek_version: number;
  readonly aad_v: number;
}

export interface SigningKeys {
  readonly active: ClientSigningKey | null;
  readonly published: readonly Jwk[];
  byId(id: string): ClientSigningKey | null;
}

interface KeyRow {
  readonly id: string;
  readonly kid: string;
  readonly status: string;
  readonly public_jwk: unknown;
  readonly ciphertext: Buffer;
  readonly nonce: Buffer;
  readonly wrapped_dek: Buffer;
  readonly kek_version: number;
  readonly aad_v: number;
}

function keyAad(id: string, providerAppId: string, provider: string) {
  return { credentialId: id, workspaceId: providerAppId, provider };
}

export function createSigningKey(
  keyring: Keyring,
  providerAppId: string,
  provider: string,
): NewSigningKey {
  const id = randomUUID();
  const kid = randomBytes(KID_BYTES).toString('hex');
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pub = publicKey.export({ format: 'jwk' });
  const meta = { kid, alg: ALG, use: 'sig' };
  const publicJwk = { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y, ...meta };
  const plaintext = Buffer.from(
    JSON.stringify({ ...privateKey.export({ format: 'jwk' }), ...meta }),
    'utf8',
  );
  try {
    const sealed = sealCredential(keyring, keyAad(id, providerAppId, provider), plaintext);
    return {
      id,
      kid,
      alg: ALG,
      public_jwk: publicJwk,
      ciphertext: sealed.ciphertext,
      nonce: sealed.nonce,
      wrapped_dek: sealed.wrappedDek,
      kek_version: sealed.kekVersion,
      aad_v: sealed.aadV,
    };
  } finally {
    plaintext.fill(0);
  }
}

function openKey(
  keyring: Keyring,
  providerAppId: string,
  provider: string,
  row: KeyRow,
): ClientSigningKey {
  const plaintext = openCredential(keyring, keyAad(row.id, providerAppId, provider), {
    ciphertext: row.ciphertext,
    nonce: row.nonce,
    wrappedDek: row.wrapped_dek,
    kekVersion: row.kek_version,
    aadV: row.aad_v,
  });
  try {
    return {
      id: row.id,
      kid: row.kid,
      alg: ALG,
      privateJwk: JSON.parse(plaintext.toString('utf8')) as Jwk,
    };
  } finally {
    plaintext.fill(0);
  }
}

function statusOrder(column: 'status' | 'k.status') {
  return sql<number>`case ${sql.ref(column)} when 'active' then 0 when 'next' then 1 else 2 end`;
}

export async function loadPublishedKeys(db: TenantDb, providerAppId: string): Promise<Jwk[]> {
  const rows = await db
    .selectFrom('provider_app_keys')
    .select('public_jwk')
    .where('provider_app_id', '=', providerAppId)
    .orderBy(statusOrder('status'))
    .orderBy('created_at')
    .orderBy('id')
    .execute();
  return rows.map((row) => row.public_jwk as Jwk);
}

export async function loadSigningKeys(
  db: TenantDb,
  keyring: Keyring,
  providerAppId: string,
): Promise<SigningKeys> {
  const rows = await db
    .selectFrom('provider_app_keys as k')
    .innerJoin('provider_apps as p', 'p.id', 'k.provider_app_id')
    .select([
      'k.id',
      'k.kid',
      'k.status',
      'k.public_jwk',
      'k.ciphertext',
      'k.nonce',
      'k.wrapped_dek',
      'k.kek_version',
      'k.aad_v',
      'p.provider',
    ])
    .where('k.provider_app_id', '=', providerAppId)
    .orderBy(statusOrder('k.status'))
    .orderBy('k.created_at')
    .orderBy('k.id')
    .execute();
  const open = (row: (typeof rows)[number]) => openKey(keyring, providerAppId, row.provider, row);
  const activeRow = rows.find((row) => row.status === 'active');
  return {
    active: activeRow === undefined ? null : open(activeRow),
    published: rows.map((row) => row.public_jwk as Jwk),
    byId(id) {
      const row = rows.find((candidate) => candidate.id === id);
      return row === undefined ? null : open(row);
    },
  };
}
