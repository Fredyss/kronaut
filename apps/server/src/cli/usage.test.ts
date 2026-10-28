import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const CLI_PATH = join(import.meta.dirname, '..', 'cli.ts');

describe('CLI language', () => {
  it('prints the usage error in Slovak under LANG=sk_SK.UTF-8', async () => {
    const env = { PATH: process.env.PATH ?? '', LANG: 'sk_SK.UTF-8' };
    await expect(
      execFileAsync(process.execPath, [CLI_PATH, 'nope'], { env }),
    ).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringMatching(
        /^neznámy príkaz\npoužitie:\n[\s\S]*--client-id <threads app id> {7}\(tajný kľúč aplikácie na stdin\)\n/,
      ),
    });
  });
});
