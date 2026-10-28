import { useState } from 'react';
import { useLocale } from '../context.ts';
import { m } from '../i18n.ts';
import { MAX_VIDEO_BYTES, VIDEO_TYPES } from './media.ts';
import type { ImagesState } from './use-images.ts';
import type { VideoEntry, VideosState } from './use-video.ts';
import { formatMegabytes } from './video-text.ts';

export interface VideoSlot {
  readonly id: string;
  readonly entry: VideoEntry;
  readonly remove: () => void;
  readonly setAi: (aiGenerated: boolean) => void;
  readonly altText: string;
  readonly setAlt: (altText: string) => void;
  readonly retry: () => void;
}

interface MediaTarget {
  readonly images: ImagesState;
  readonly video: string | null;
  readonly videoAlt: string;
  readonly videos: VideosState;
  readonly setVideo: (id: string | null) => void;
  readonly setVideoAlt: (altText: string) => void;
}

const isVideo = (file: File) => file.type.startsWith('video/');

function slotFor({
  video,
  videoAlt,
  videos,
  setVideo,
  setVideoAlt,
}: MediaTarget): VideoSlot | null {
  const entry = video === null ? undefined : videos.entries.get(video);
  if (video === null || entry === undefined) return null;
  return {
    id: video,
    entry,
    remove: () => setVideo(null),
    setAi: (aiGenerated) => videos.setAi(video, aiGenerated),
    altText: videoAlt,
    setAlt: setVideoAlt,
    retry: () => videos.retry(video),
  };
}

export function useMedia(target: MediaTarget) {
  const { images, video, videos, setVideo } = target;
  const { locale } = useLocale();
  const [problems, setProblems] = useState<readonly string[]>([]);
  const maxVideoSize = formatMegabytes(MAX_VIDEO_BYTES, locale);

  const pickVideo = (file: File, withImages: boolean): string | null => {
    if (withImages || images.images.length > 0) return m.compose_media_exclusive();
    if (video !== null) return m.compose_video_limit();
    if (!VIDEO_TYPES.includes(file.type)) return m.compose_video_bad_type({ name: file.name });
    if (file.size > MAX_VIDEO_BYTES) {
      return m.compose_video_too_big({ name: file.name, max: maxVideoSize });
    }
    setVideo(videos.add(file));
    return null;
  };
  const pick = (files: readonly File[]) => {
    const picked = files.filter(isVideo);
    const stills = files.filter((file) => !isVideo(file));
    const [first] = picked;
    if (picked.length > 1) setProblems([m.compose_video_limit()]);
    else if (first !== undefined) {
      const problem = pickVideo(first, stills.length > 0);
      setProblems(problem === null ? [] : [problem]);
    } else if (video !== null && stills.length > 0) setProblems([m.compose_media_exclusive()]);
    else setProblems(images.pick(stills));
  };
  return { images, problems, maxVideoSize, pick, video: slotFor(target) };
}

export type MediaState = ReturnType<typeof useMedia>;
