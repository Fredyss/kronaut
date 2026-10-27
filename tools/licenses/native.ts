export type NativeComponent = {
  name: string;
  version: string;
  license: string;
  url: string;
  sha256: string;
  args: { version: string; url: string; sha256: string };
};

export const NATIVE_COMPONENTS: readonly NativeComponent[] = [
  {
    name: 'FFmpeg',
    version: '9.0.2',
    license: 'GPL-2.0-or-later',
    url: 'https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz',
    sha256: '8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e',
    args: { version: 'FFMPEG_VERSION', url: 'FFMPEG_URL', sha256: 'FFMPEG_SHA256' },
  },
  {
    name: 'x264',
    version: 'b35605ace3ddf7c1a5d67a2eb553f034aef41d55',
    license: 'GPL-2.0-or-later',
    url: 'https://code.videolan.org/videolan/x264/-/archive/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/x264-b35605ace3ddf7c1a5d67a2eb553f034aef41d55.tar.gz',
    sha256: 'cd71a7515b0e9a012e1ac9b1f8415bebcaf6fc97d4db32286642ac4c0fbe24f9',
    args: { version: 'X264_COMMIT', url: 'X264_URL', sha256: 'X264_SHA256' },
  },
];

export function renderNative(components: readonly NativeComponent[]): string {
  const intro = `Native components

The ffmpeg and ffprobe binaries are built unmodified from the sources below and
run as separate processes; they are not linked into Kronaut.
`;
  const entries = components.map((c) =>
    [
      `${c.name} ${c.version}`,
      `License: ${c.license}`,
      `Source: ${c.url}`,
      `SHA-256: ${c.sha256}`,
    ].join('\n'),
  );
  return `${intro}\n${entries.join('\n\n')}\n`;
}
