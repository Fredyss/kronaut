import type { VideoProbe } from './video-probe.ts';

const MAX_SIDE = 1920;
const MIN_RATE = 24;
const MAX_RATE = 60;
const DEFAULT_RATE = 30;

function even(value: number): number {
  return Math.max(2, Math.floor(Math.round(value) / 2) * 2);
}

function targetSize(probe: VideoProbe): { width: number; height: number } {
  const video = probe.video;
  if (video === null) throw new TypeError('probe has no video stream');
  const quarter = video.rotation === 90 || video.rotation === 270;
  const width = quarter ? video.height : video.width;
  const height = quarter ? video.width : video.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  return { width: even(width * scale), height: even(height * scale) };
}

function frameRate(probe: VideoProbe): number {
  const rate = probe.video?.frameRate ?? DEFAULT_RATE;
  return Number(Math.min(MAX_RATE, Math.max(MIN_RATE, rate)).toFixed(3));
}

export function masterArgs(
  input: string,
  output: string,
  probe: VideoProbe,
  threads: number,
): string[] {
  const { width, height } = targetSize(probe);
  const rate = frameRate(probe);
  const gop = String(Math.round(2 * rate));
  const filters = [
    `scale=w=${width}:h=${height}:out_color_matrix=bt709:out_range=tv`,
    `fps=${rate}`,
    'format=yuv420p',
    'setsar=1',
  ].join(',');
  const audio = probe.audio ? ['-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2'] : ['-an'];
  return [
    ...['-hide_banner', '-nostdin', '-y', '-i', input],
    ...['-map', '0:v:0', ...(probe.audio ? ['-map', '0:a:0'] : [])],
    ...['-map_metadata', '-1', '-map_chapters', '-1', '-sn', '-dn'],
    ...['-vf', filters],
    ...['-fps_mode', 'cfr', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium'],
    ...['-crf', '21', '-maxrate', '8M', '-bufsize', '16M'],
    ...['-g', gop, '-keyint_min', gop, '-sc_threshold', '0', '-flags', '+cgop'],
    ...['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'],
    ...['-color_range', 'tv'],
    ...audio,
    ...['-threads', String(threads), '-movflags', '+faststart', '-use_editlist', '0'],
    ...['-f', 'mp4', output],
  ];
}
