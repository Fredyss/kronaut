import { spawn } from 'node:child_process';
import { setPriority } from 'node:os';

export interface VideoToolOptions {
  readonly ffmpeg?: string;
  readonly ffprobe?: string;
  readonly timeoutMs?: number;
  readonly threads?: number;
}

export type VideoToolErrorKind = 'missing' | 'failed' | 'timeout';

export class VideoToolError extends Error {
  readonly kind: VideoToolErrorKind;

  constructor(kind: VideoToolErrorKind, message: string) {
    super(message);
    this.name = 'VideoToolError';
    this.kind = kind;
  }
}

export const VIDEO_TOOL_TIMEOUT_MS = 20 * 60_000;
export const VIDEO_TOOL_THREADS = 2;

const STDOUT_MAX_BYTES = 64 * 1024 * 1024;
const STDERR_MAX_BYTES = 64 * 1024;
const STDERR_TAIL_BYTES = 2 * 1024;
const NICENESS = 10;

class StderrTail {
  private chunks: Buffer[] = [];
  private bytes = 0;

  push(chunk: Buffer): void {
    this.chunks.push(chunk);
    this.bytes += chunk.byteLength;
    while (this.bytes > STDERR_MAX_BYTES && this.chunks.length > 1) {
      this.bytes -= this.chunks.shift()?.byteLength ?? 0;
    }
  }

  text(): string {
    const all = Buffer.concat(this.chunks);
    return all
      .subarray(Math.max(0, all.byteLength - STDERR_TAIL_BYTES))
      .toString('utf8')
      .trim();
  }
}

class StdoutBuffer {
  private chunks: Buffer[] = [];
  private bytes = 0;

  push(chunk: Buffer): boolean {
    this.bytes += chunk.byteLength;
    if (this.bytes > STDOUT_MAX_BYTES) return false;
    this.chunks.push(chunk);
    return true;
  }

  concat(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

function lowerPriority(pid: number | undefined): void {
  if (pid === undefined) return;
  try {
    setPriority(pid, NICENESS);
  } catch {}
}

export function runTool(bin: string, args: readonly string[], timeoutMs: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    lowerPriority(child.pid);
    const stdout = new StdoutBuffer();
    const stderr = new StderrTail();
    let failure: VideoToolError | null = null;
    const stop = (error: VideoToolError) => {
      failure ??= error;
      child.kill('SIGKILL');
    };
    const timer = setTimeout(
      () => stop(new VideoToolError('timeout', `${bin} timed out after ${timeoutMs} ms`)),
      timeoutMs,
    );
    child.stdout.on('data', (chunk: Buffer) => {
      if (!stdout.push(chunk)) stop(new VideoToolError('failed', `${bin} output is too large`));
    });
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.once('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(
        error.code === 'ENOENT' ? new VideoToolError('missing', `${bin} was not found`) : error,
      );
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (failure !== null) reject(failure);
      else if (code === 0) resolve(stdout.concat());
      else reject(new VideoToolError('failed', `${bin} exited with ${code}: ${stderr.text()}`));
    });
  });
}
