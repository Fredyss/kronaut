import { parentPort, workerData } from 'node:worker_threads';
import sharp, { type Sharp } from 'sharp';
import {
  MEDIA_IMAGE_MAX_PIXELS,
  type ReencodeFormat,
  type ReencodeJob,
  type ReencodeReply,
} from './reencode.ts';

const PIXEL_LIMIT_RE = /exceeds pixel limit/i;

function encode(pipeline: Sharp, format: ReencodeFormat): Sharp {
  if (format === 'jpeg') return pipeline.jpeg({ quality: 90 });
  if (format === 'png') return pipeline.png();
  return pipeline.webp({ quality: 90 });
}

async function run(job: ReencodeJob): Promise<ReencodeReply> {
  try {
    const pipeline = sharp(job.bytes, {
      limitInputPixels: MEDIA_IMAGE_MAX_PIXELS,
      failOn: 'error',
      animated: job.format === 'webp',
    })
      .rotate()
      .toColorspace('srgb');
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
