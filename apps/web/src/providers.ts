import { m } from './i18n.ts';

export type PublishChoice =
  | { readonly kind: 'ok'; readonly publishType: string }
  | { readonly kind: 'needs_image' }
  | { readonly kind: 'image_too_large'; readonly maxBytes: number }
  | { readonly kind: 'image_type_unsupported' }
  | { readonly kind: 'too_many_images'; readonly max: number }
  | { readonly kind: 'unsupported' };

export interface ProviderUi {
  name(): string;
  readonly badge: string;
  readonly loginHint: boolean;
  readonly instance: boolean;
  readonly maxImageBytes: number;
  readonly imageTypes: readonly string[];
  publishType(images: number): PublishChoice;
}

const PROVIDERS: Readonly<Record<string, ProviderUi>> = {
  bluesky: {
    name: () => m.provider_bluesky(),
    badge: 'bg-sky-600',
    loginHint: true,
    instance: false,
    maxImageBytes: 2_000_000,
    imageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    publishType: () => ({ kind: 'ok', publishType: 'post' }),
  },
  facebook: {
    name: () => m.provider_facebook(),
    badge: 'bg-blue-600',
    loginHint: false,
    instance: false,
    maxImageBytes: 10_000_000,
    imageTypes: ['image/jpeg', 'image/png'],
    publishType: (images) =>
      images > 10 ? { kind: 'too_many_images', max: 10 } : { kind: 'ok', publishType: 'post' },
  },
  instagram: {
    name: () => m.provider_instagram(),
    badge: 'bg-rose-600',
    loginHint: false,
    instance: false,
    maxImageBytes: 8_000_000,
    imageTypes: ['image/jpeg'],
    publishType: (images) => {
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
    publishType: (images) =>
      images > 20 ? { kind: 'too_many_images', max: 20 } : { kind: 'ok', publishType: 'post' },
  },
  mastodon: {
    name: () => m.provider_mastodon(),
    badge: 'bg-violet-600',
    loginHint: false,
    instance: true,
    maxImageBytes: 16_000_000,
    imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'],
    publishType: (images) =>
      images > 4 ? { kind: 'too_many_images', max: 4 } : { kind: 'ok', publishType: 'post' },
  },
  threads: {
    name: () => m.provider_threads(),
    badge: 'bg-foreground',
    loginHint: false,
    instance: false,
    maxImageBytes: 8_000_000,
    imageTypes: ['image/jpeg', 'image/png'],
    publishType: (images) =>
      images > 20 ? { kind: 'too_many_images', max: 20 } : { kind: 'ok', publishType: 'post' },
  },
};

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
