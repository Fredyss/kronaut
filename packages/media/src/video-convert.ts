import sharp from 'sharp';
import { masterArgs } from './video-args.ts';
import type { VideoProbe } from './video-probe.ts';
import {
  runTool,
  VIDEO_TOOL_THREADS,
  VIDEO_TOOL_TIMEOUT_MS,
  VideoToolError,
  type VideoToolOptions,
} from './video-run.ts';

export const POSTER_MAX_SIDE = 768;

export async function convertVideo(
  input: string,
  output: string,
  probe: VideoProbe,
  options: VideoToolOptions = {},
): Promise<void> {
  await runTool(
    options.ffmpeg ?? 'ffmpeg',
    masterArgs(input, output, probe, options.threads ?? VIDEO_TOOL_THREADS),
    options.timeoutMs ?? VIDEO_TOOL_TIMEOUT_MS,
  );
}

export async function extractPoster(
  master: string,
  durationMs: number,
  options: VideoToolOptions = {},
): Promise<Uint8Array> {
  const seconds = Math.min(1, durationMs / 2000).toFixed(3);
  const frame = await runTool(
    options.ffmpeg ?? 'ffmpeg',
    [
      ...['-hide_banner', '-nostdin', '-ss', seconds, '-i', master],
      ...['-frames:v', '1', '-c:v', 'mjpeg', '-q:v', '3', '-f', 'image2pipe', '-'],
    ],
    options.timeoutMs ?? VIDEO_TOOL_TIMEOUT_MS,
  );
  if (frame.byteLength === 0) throw new VideoToolError('failed', 'ffmpeg produced no poster frame');
  const poster = await sharp(frame)
    .resize(POSTER_MAX_SIDE, POSTER_MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return new Uint8Array(poster);
}
