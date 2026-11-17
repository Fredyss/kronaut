import { m } from '../locale/i18n.ts';

export type PublishChoice =
  | { readonly kind: 'ok'; readonly publishType: string }
  | { readonly kind: 'needs_image' }
  | { readonly kind: 'needs_video' }
  | { readonly kind: 'image_too_large'; readonly maxBytes: number }
  | { readonly kind: 'image_type_unsupported' }
  | { readonly kind: 'too_many_images'; readonly max: number }
  | { readonly kind: 'video_unsupported' }
  | { readonly kind: 'unsupported' };

export interface PublishMedia {
  readonly images: number;
  readonly video: boolean;
}

export interface ProviderUi {
  name(): string;
  readonly badge: string;
  readonly loginHint: boolean;
  readonly instance: boolean;
  readonly followers?: boolean;
  readonly insights?: boolean;
  readonly googleGrant?: boolean;
  readonly removesWebhook?: boolean;
  readonly botStays?: boolean;
  readonly maxImageBytes: number;
  readonly imageTypes: readonly string[];
  publishType(media: PublishMedia): PublishChoice;
}

function imagePost(max: number | null) {
  return ({ images, video }: PublishMedia): PublishChoice => {
    if (video) return { kind: 'video_unsupported' };
    if (max !== null && images > max) return { kind: 'too_many_images', max };
    return { kind: 'ok', publishType: 'post' };
  };
}

const DISCORD: Omit<ProviderUi, 'name'> = {
  badge: 'bg-indigo-600',
  followers: false,
  loginHint: false,
  instance: false,
  maxImageBytes: 20 * 1024 * 1024,
  imageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  publishType: ({ images }) =>
    images > 10 ? { kind: 'too_many_images', max: 10 } : { kind: 'ok', publishType: 'message' },
};

const PROVIDERS: Readonly<Record<string, ProviderUi>> = {
  bluesky: {
    name: () => m.provider_bluesky(),
    badge: 'bg-sky-600',
    loginHint: true,
    instance: false,
    followers: true,
    maxImageBytes: 2_000_000,
    imageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    publishType: imagePost(null),
  },
  discord: { ...DISCORD, name: () => m.provider_discord(), removesWebhook: true },
  discord_bot: { ...DISCORD, name: () => m.provider_discord_bot(), botStays: true },
  facebook: {
    name: () => m.provider_facebook(),
    badge: 'bg-blue-600',
    loginHint: false,
    instance: false,
    insights: true,
    maxImageBytes: 10_000_000,
    imageTypes: ['image/jpeg', 'image/png'],
    publishType: (media) =>
      media.video ? { kind: 'ok', publishType: 'reel' } : imagePost(10)(media),
  },
  instagram: {
    name: () => m.provider_instagram(),
    badge: 'bg-rose-600',
    loginHint: false,
    instance: false,
    followers: true,
    insights: true,
    maxImageBytes: 8_000_000,
    imageTypes: ['image/jpeg'],
    publishType: ({ images, video }) => {
      if (video) return { kind: 'ok', publishType: 'reel' };
      if (images === 0) return { kind: 'needs_image' };
      return { kind: 'ok', publishType: images === 1 ? 'image' : 'carousel' };
    },
  },
  linkedin: {
    name: () => m.provider_linkedin(),
    badge: 'bg-sky-700',
    loginHint: false,
    instance: false,
    maxImageBytes: 8_000_000,
    imageTypes: ['image/jpeg', 'image/png'],
    publishType: (media) =>
      media.video ? { kind: 'ok', publishType: 'video' } : imagePost(20)(media),
  },
  mastodon: {
    name: () => m.provider_mastodon(),
    badge: 'bg-violet-600',
    loginHint: false,
    instance: true,
    followers: true,
    maxImageBytes: 16_000_000,
    imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'],
    publishType: (media) =>
      media.video ? { kind: 'ok', publishType: 'video' } : imagePost(4)(media),
  },
  pinterest: {
    name: () => m.provider_pinterest(),
    badge: 'bg-red-700',
    loginHint: false,
    instance: false,
    maxImageBytes: 20_000_000,
    imageTypes: ['image/jpeg', 'image/png'],
    publishType: ({ images, video }) => {
      if (video) return { kind: 'video_unsupported' };
      if (images === 0) return { kind: 'needs_image' };
      if (images > 1) return { kind: 'too_many_images', max: 1 };
      return { kind: 'ok', publishType: 'pin' };
    },
  },
  threads: {
    name: () => m.provider_threads(),
    badge: 'bg-foreground',
    loginHint: false,
    instance: false,
    followers: true,
    insights: true,
    maxImageBytes: 8_000_000,
    imageTypes: ['image/jpeg', 'image/png'],
    publishType: (media) =>
      media.video ? { kind: 'ok', publishType: 'video' } : imagePost(20)(media),
  },
  youtube: {
    name: () => m.provider_youtube(),
    badge: 'bg-red-600',
    followers: true,
    googleGrant: true,
    loginHint: false,
    instance: false,
    maxImageBytes: 0,
    imageTypes: [],
    publishType: ({ video }) =>
      video ? { kind: 'ok', publishType: 'video' } : { kind: 'needs_video' },
  },
};

export function knownProviders(): readonly string[] {
  return Object.keys(PROVIDERS);
}

export function providerUi(id: string): ProviderUi {
  const known = Object.hasOwn(PROVIDERS, id) ? PROVIDERS[id] : undefined;
  return (
    known ?? {
      name: () => id,
      badge: 'bg-muted-foreground',
      loginHint: false,
      instance: false,
      maxImageBytes: 0,
      imageTypes: [],
      publishType: () => ({ kind: 'unsupported' }),
    }
  );
}
