import { describe, expect, it } from 'vitest';
import { masterArgs } from './video-args.ts';
import type { VideoProbe, VideoStreamInfo } from './video-probe.ts';

function probe(video: Partial<VideoStreamInfo>, audio = true): VideoProbe {
  return {
    durationMs: 4000,
    audio,
    video: { width: 1280, height: 720, rotation: 0, frameRate: 30, codec: 'h264', ...video },
  };
}

function argAfter(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function filterOf(args: readonly string[]): string {
  return argAfter(args, '-vf') ?? '';
}

describe('masterArgs', () => {
  it('builds the full master profile for a 4K 59.94 fps source with audio', () => {
    const args = masterArgs(
      'in.mov',
      'out.mp4',
      probe({ width: 3840, height: 2160, frameRate: 59.94006 }),
      2,
    );
    expect(args).toEqual([
      ...['-hide_banner', '-nostdin', '-y', '-threads', '2', '-i', 'in.mov'],
      ...['-map', '0:v:0', '-map', '0:a:0'],
      ...['-map_metadata', '-1', '-map_chapters', '-1', '-sn', '-dn'],
      '-vf',
      'scale=w=1920:h=1080:out_color_matrix=bt709:out_range=tv,fps=59.94,format=yuv420p,setsar=1',
      ...['-fps_mode', 'cfr', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium'],
      ...['-crf', '21', '-maxrate', '8M', '-bufsize', '16M'],
      ...['-g', '120', '-keyint_min', '120', '-sc_threshold', '0', '-flags', '+cgop'],
      ...['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'],
      ...['-color_range', 'tv'],
      ...['-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2'],
      ...['-threads', '2', '-movflags', '+faststart', '-use_editlist', '0'],
      ...['-f', 'mp4', 'out.mp4'],
    ]);
  });

  it('swaps the dimensions of a source rotated by 90 or 270 degrees', () => {
    for (const rotation of [90, 270] as const) {
      const args = masterArgs('in', 'out', probe({ width: 1920, height: 1080, rotation }), 2);
      expect(filterOf(args)).toMatch(/^scale=w=1080:h=1920:/);
    }
    const flipped = masterArgs('in', 'out', probe({ width: 1920, height: 1080, rotation: 180 }), 2);
    expect(filterOf(flipped)).toMatch(/^scale=w=1920:h=1080:/);
  });

  it('never upscales a small source', () => {
    const args = masterArgs('in', 'out', probe({ width: 640, height: 360 }), 2);
    expect(filterOf(args)).toMatch(/^scale=w=640:h=360:/);
  });

  it('rounds odd sizes down to even', () => {
    expect(filterOf(masterArgs('in', 'out', probe({ width: 641, height: 361 }), 2))).toMatch(
      /^scale=w=640:h=360:/,
    );
    expect(filterOf(masterArgs('in', 'out', probe({ width: 3000, height: 1999 }), 2))).toMatch(
      /^scale=w=1920:h=1278:/,
    );
  });

  it('clamps the frame rate to 24–60 and defaults to 30', () => {
    const at = (frameRate: number | null) => {
      const args = masterArgs('in', 'out', probe({ frameRate }), 2);
      return [
        filterOf(args).match(/fps=([^,]+)/)?.[1],
        argAfter(args, '-g'),
        argAfter(args, '-keyint_min'),
      ];
    };
    expect(at(null)).toEqual(['30', '60', '60']);
    expect(at(120)).toEqual(['60', '120', '120']);
    expect(at(10)).toEqual(['24', '48', '48']);
    expect(at(30000 / 1001)).toEqual(['29.97', '60', '60']);
  });

  it('drops audio when the source has none', () => {
    const args = masterArgs('in', 'out', probe({}, false), 3);
    expect(args).toContain('-an');
    expect(args).not.toContain('0:a:0');
    expect(args).not.toContain('-c:a');
    expect(argAfter(args, '-threads')).toBe('3');
  });

  it('refuses a probe without a video stream', () => {
    expect(() => masterArgs('in', 'out', { durationMs: 1, video: null, audio: true }, 2)).toThrow(
      TypeError,
    );
  });
});
