import {
  runTool,
  VIDEO_TOOL_TIMEOUT_MS,
  VideoToolError,
  type VideoToolOptions,
} from './video-run.ts';

export interface VideoStreamInfo {
  readonly width: number;
  readonly height: number;
  readonly rotation: 0 | 90 | 180 | 270;
  readonly frameRate: number | null;
  readonly codec: string;
}

export interface VideoProbe {
  readonly durationMs: number | null;
  readonly video: VideoStreamInfo | null;
  readonly audio: boolean;
}

type Json = Record<string, unknown>;

const RATE_RE = /^(\d+(?:\.\d+)?)(?:\/(\d+))?$/;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function objects(value: unknown): Json[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRate(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = RATE_RE.exec(value);
  if (match === null) return null;
  const rate = Number(match[1]) / Number(match[2] ?? '1');
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function normaliseRotation(degrees: number): VideoStreamInfo['rotation'] {
  const turned = (((Math.round(degrees / 90) * 90) % 360) + 360) % 360;
  return turned as VideoStreamInfo['rotation'];
}

function rotationOf(stream: Json): VideoStreamInfo['rotation'] {
  for (const side of objects(stream.side_data_list)) {
    const rotation = finiteNumber(side.rotation);
    if (rotation !== null) return normaliseRotation(rotation);
  }
  const tag = isObject(stream.tags) ? finiteNumber(stream.tags.rotate) : null;
  return tag === null ? 0 : normaliseRotation(tag);
}

function dimension(value: unknown): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  throw new VideoToolError('failed', 'ffprobe reported a video stream without dimensions');
}

function videoInfo(stream: Json): VideoStreamInfo {
  return {
    width: dimension(stream.width),
    height: dimension(stream.height),
    rotation: rotationOf(stream),
    frameRate: parseRate(stream.avg_frame_rate) ?? parseRate(stream.r_frame_rate),
    codec: typeof stream.codec_name === 'string' ? stream.codec_name : '',
  };
}

function parseJson(json: string): Json {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new VideoToolError('failed', 'ffprobe returned invalid JSON');
  }
  if (!isObject(parsed)) throw new VideoToolError('failed', 'ffprobe returned invalid JSON');
  return parsed;
}

export function parseProbe(json: string): VideoProbe {
  const root = parseJson(json);
  const streams = objects(root.streams);
  const video = streams.find((stream) => stream.codec_type === 'video');
  const duration = isObject(root.format) ? finiteNumber(root.format.duration) : null;
  return {
    durationMs: duration === null || duration < 0 ? null : Math.round(duration * 1000),
    video: video === undefined ? null : videoInfo(video),
    audio: streams.some((stream) => stream.codec_type === 'audio'),
  };
}

export async function probeVideo(
  path: string,
  options: VideoToolOptions = {},
): Promise<VideoProbe> {
  const stdout = await runTool(
    options.ffprobe ?? 'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path],
    options.timeoutMs ?? VIDEO_TOOL_TIMEOUT_MS,
  );
  return parseProbe(stdout.toString('utf8'));
}
