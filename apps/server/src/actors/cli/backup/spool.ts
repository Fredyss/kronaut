import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import type { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const ALGORITHM = 'aes-256-gcm';

export interface SpooledFile {
  readonly size: number;
  read(): AsyncGenerator<Buffer>;
}

// The dump must be spooled because a tar header needs its size up front; the spool is sealed
// under a throwaway key so a crash never leaves a readable plaintext dump on disk.
export async function spool(
  path: string,
  produce: (sink: Writable) => Promise<void>,
): Promise<SpooledFile> {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const handle = await open(path, 'wx', 0o600);
  const written = pipeline(cipher, handle.createWriteStream());
  try {
    await Promise.all([produce(cipher), written]);
  } catch (error) {
    cipher.destroy();
    await written.catch(() => undefined);
    throw error;
  }
  const tag = cipher.getAuthTag();
  const { size } = await stat(path);
  return {
    size,
    async *read() {
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      for await (const chunk of createReadStream(path)) {
        yield decipher.update(chunk as Buffer);
      }
      yield decipher.final();
    },
  };
}
