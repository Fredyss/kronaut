import { describe, expect, it } from 'vitest';
import { parseProbe } from './video-probe.ts';
import { VideoToolError } from './video-run.ts';

const iphone = {
  streams: [
    {
      index: 0,
      codec_name: 'hevc',
      codec_type: 'video',
      width: 1920,
      height: 1080,
      r_frame_rate: '30/1',
      avg_frame_rate: '2997/100',
      side_data_list: [{ side_data_type: 'Display Matrix', displaymatrix: '…', rotation: -90 }],
    },
    {
      index: 1,
      codec_name: 'aac',
      codec_type: 'audio',
      r_frame_rate: '0/0',
      avg_frame_rate: '0/0',
    },
  ],
  format: { filename: 'in.mov', duration: '4.0006', format_name: 'mov,mp4,m4a,3gp,3g2,mj2' },
};

function parse(value: unknown) {
  return parseProbe(JSON.stringify(value));
}

function stream(fields: Record<string, unknown>) {
  return parse({
    streams: [{ codec_type: 'video', codec_name: 'h264', width: 640, height: 480, ...fields }],
    format: {},
  });
}

describe('parseProbe', () => {
  it('reads an iPhone portrait clip with display-matrix rotation', () => {
    expect(parse(iphone)).toEqual({
      durationMs: 4001,
      audio: true,
      video: { width: 1920, height: 1080, rotation: 270, frameRate: 29.97, codec: 'hevc' },
    });
  });

  it('normalises rotation from side data and falls back to the rotate tag', () => {
    expect(stream({ side_data_list: [{ rotation: 90 }] }).video?.rotation).toBe(90);
    expect(stream({ side_data_list: [{ rotation: -180 }] }).video?.rotation).toBe(180);
    expect(
      stream({ side_data_list: [{ side_data_type: 'Other' }], tags: { rotate: '90' } }).video
        ?.rotation,
    ).toBe(90);
    expect(stream({ tags: { rotate: '270' } }).video?.rotation).toBe(270);
    expect(stream({ tags: { rotate: '-90' } }).video?.rotation).toBe(270);
    expect(stream({}).video?.rotation).toBe(0);
  });

  it('falls back to r_frame_rate and treats 0/0 or garbage as unknown', () => {
    expect(stream({ avg_frame_rate: '0/0', r_frame_rate: '25/1' }).video?.frameRate).toBe(25);
    expect(stream({ avg_frame_rate: '0/0', r_frame_rate: '0/0' }).video?.frameRate).toBeNull();
    expect(stream({ avg_frame_rate: 'abc' }).video?.frameRate).toBeNull();
    expect(stream({ avg_frame_rate: '24' }).video?.frameRate).toBe(24);
  });

  it('reports no video, no audio and no duration when absent', () => {
    expect(parse({ streams: [{ codec_type: 'data' }], format: {} })).toEqual({
      durationMs: null,
      video: null,
      audio: false,
    });
    expect(parse({})).toEqual({ durationMs: null, video: null, audio: false });
  });

  it('uses the first video stream', () => {
    const probe = parse({
      streams: [
        { codec_type: 'audio' },
        { codec_type: 'video', codec_name: 'h264', width: 320, height: 240 },
        { codec_type: 'video', codec_name: 'mjpeg', width: 100, height: 100 },
      ],
    });
    expect(probe.video?.codec).toBe('h264');
    expect(probe.video?.width).toBe(320);
  });

  it('throws a failed VideoToolError on unparsable output', () => {
    for (const json of ['', 'not json', '[]', 'null']) {
      expect(() => parseProbe(json)).toThrow(VideoToolError);
      try {
        parseProbe(json);
      } catch (error) {
        expect((error as VideoToolError).kind).toBe('failed');
      }
    }
    expect(() => stream({ width: undefined })).toThrow(VideoToolError);
  });
});
