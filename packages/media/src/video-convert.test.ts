import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { convertVideo, extractPoster, POSTER_MAX_SIDE } from './video-convert.ts';
import { probeVideo } from './video-probe.ts';
import { VideoToolError } from './video-run.ts';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const SLOW_MS = 120_000;

let dir: string;

function lavfi(output: string, size: string, audio: boolean): void {
  const args = ['-hide_banner', '-nostdin', '-loglevel', 'error', '-y'];
  args.push('-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=30:duration=4`);
  if (audio) args.push('-f', 'lavfi', '-i', 'sine=frequency=440:duration=4');
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv444p', ...(audio ? ['-c:a', 'aac'] : []), output);
  const result = spawnSync('ffmpeg', args);
  if (result.status !== 0) throw new Error(result.stderr.toString());
}

function streams(path: string): Record<string, string>[] {
  const result = spawnSync('ffprobe', [
    ...['-v', 'error', '-print_format', 'json', '-show_entries'],
    ...['stream=codec_type,codec_name,profile,pix_fmt,width,height,sample_rate,channels', path],
  ]);
  return (JSON.parse(result.stdout.toString()) as { streams: Record<string, string>[] }).streams;
}

function topLevelBoxes(bytes: Buffer): string[] {
  const types: string[] = [];
  let offset = 0;
  while (offset + 8 <= bytes.byteLength) {
    let size = bytes.readUInt32BE(offset);
    if (size === 1) size = Number(bytes.readBigUInt64BE(offset + 8));
    if (size === 0) size = bytes.byteLength - offset;
    types.push(bytes.toString('latin1', offset + 4, offset + 8));
    if (size < 8) break;
    offset += size;
  }
  return types;
}

async function expectKind(promise: Promise<unknown>, kind: string): Promise<void> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(VideoToolError);
  expect((error as VideoToolError).kind).toBe(kind);
}

describe.skipIf(!hasFfmpeg)('video tools against ffmpeg', () => {
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'kronaut-video-'));
    lavfi(join(dir, 'landscape.mp4'), '1280x720', true);
    lavfi(join(dir, 'portrait.mp4'), '1080x1920', false);
  }, SLOW_MS);

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it.each([
    { name: 'landscape', audio: true, width: 1280, height: 720 },
    { name: 'portrait', audio: false, width: 1080, height: 1920 },
  ])(
    'converts the $name source to the master profile with a poster',
    async ({ name, audio, width, height }) => {
      const input = join(dir, `${name}.mp4`);
      const output = join(dir, `${name}-master.mp4`);
      const probe = await probeVideo(input);
      expect(probe.video).toMatchObject({ width, height, rotation: 0, frameRate: 30 });
      expect(probe.audio).toBe(audio);
      expect(probe.durationMs).toBeGreaterThanOrEqual(3900);

      await convertVideo(input, output, probe);
      const [video, ...rest] = streams(output);
      expect(video).toMatchObject({ codec_type: 'video', codec_name: 'h264', profile: 'High' });
      expect(video).toMatchObject({ pix_fmt: 'yuv420p', width, height });
      if (audio) {
        expect(rest).toEqual([
          expect.objectContaining({ codec_name: 'aac', sample_rate: '48000', channels: 2 }),
        ]);
      } else {
        expect(rest).toEqual([]);
      }
      const boxes = topLevelBoxes(await readFile(output));
      expect(boxes).toContain('mdat');
      expect(boxes.indexOf('moov')).toBeGreaterThan(-1);
      expect(boxes.indexOf('moov')).toBeLessThan(boxes.indexOf('mdat'));

      const poster = await extractPoster(output, probe.durationMs ?? 0);
      const meta = await sharp(poster).metadata();
      expect(meta.format).toBe('webp');
      expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(POSTER_MAX_SIDE);
    },
    SLOW_MS,
  );

  it('reports a missing binary', async () => {
    const input = join(dir, 'landscape.mp4');
    await expectKind(probeVideo(input, { ffprobe: join(dir, 'no-ffprobe') }), 'missing');
    await expectKind(extractPoster(input, 4000, { ffmpeg: join(dir, 'no-ffmpeg') }), 'missing');
  });

  it('reports a garbage input as failed', async () => {
    const garbage = join(dir, 'garbage.mp4');
    await writeFile(garbage, randomBytes(4096));
    await expectKind(probeVideo(garbage), 'failed');
  });

  it('kills a run that exceeds its timeout', async () => {
    const input = join(dir, 'landscape.mp4');
    const probe = await probeVideo(input);
    await expectKind(
      convertVideo(input, join(dir, 'slow.mp4'), probe, { timeoutMs: 1 }),
      'timeout',
    );
  });
});
