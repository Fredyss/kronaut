import { parentPort, workerData } from 'node:worker_threads';
import sharp, { type Sharp, type SharpOptions } from 'sharp';
import {
  MEDIA_IMAGE_MAX_DECODED_BYTES,
  MEDIA_IMAGE_MAX_PIXELS,
  type ReencodeFormat,
  type ReencodeJob,
  type ReencodeReply,
} from './reencode.ts';

const PIXEL_LIMIT_RE = /exceeds pixel limit/i;
const SAMPLE_BYTES: Readonly<Record<string, number>> = {
  uchar: 1,
  char: 1,
  ushort: 2,
  short: 2,
  uint: 4,
  int: 4,
  float: 4,
  complex: 8,
  double: 8,
  dpcomplex: 16,
};

function inputOptions(job: ReencodeJob): SharpOptions {
  return {
    limitInputPixels: MEDIA_IMAGE_MAX_PIXELS,
    failOn: 'error',
    animated: job.format === 'webp',
  };
}

// The pixel limit alone lets a 16-bit image decode to twice the memory of an 8-bit one.
async function decodedBytes(job: ReencodeJob): Promise<number> {
  const {
    width = 0,
    height = 0,
    channels = 4,
    depth = '',
  } = await sharp(job.bytes, inputOptions(job)).metadata();
  return width * height * channels * (SAMPLE_BYTES[depth] ?? 8);
}

function encode(pipeline: Sharp, format: ReencodeFormat): Sharp {
  if (format === 'jpeg') return pipeline.jpeg({ quality: 90 });
  if (format === 'png') return pipeline.png();
  return pipeline.webp({ quality: 90 });
}

async function run(job: ReencodeJob): Promise<ReencodeReply> {
  try {
    if ((await decodedBytes(job)) > MEDIA_IMAGE_MAX_DECODED_BYTES) {
      return { ok: false, kind: 'too_many_bytes', message: 'image decodes to too many bytes' };
    }
    const pipeline = sharp(job.bytes, inputOptions(job)).rotate().toColorspace('srgb');
    const { data, info } = await encode(pipeline, job.format).toBuffer({ resolveWithObject: true });
    return {
      ok: true,
      bytes: new Uint8Array(data),
      width: info.width,
      height: info.pageHeight ?? info.height,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      kind: PIXEL_LIMIT_RE.test(message) ? 'too_many_pixels' : 'undecodable',
      message,
    };
  }
}

if (parentPort === null) throw new Error('reencode-worker must run in a worker thread');
const reply = await run(workerData as ReencodeJob);
parentPort.postMessage(reply, reply.ok ? [reply.bytes.buffer] : []);
