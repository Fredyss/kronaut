import { m } from '../i18n.ts';
import type { LibraryAsset } from './queries.ts';

const UNITS = [
  { unit: 'gigabyte', size: 1e9 },
  { unit: 'megabyte', size: 1e6 },
  { unit: 'kilobyte', size: 1e3 },
] as const;

export function formatBytes(bytes: number, locale: string): string {
  const step = UNITS.find(({ size }) => bytes >= size);
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: step?.unit ?? 'byte',
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(bytes / (step?.size ?? 1));
}

export function kindLabel(asset: Pick<LibraryAsset, 'kind'>): string {
  return asset.kind === 'video' ? m.media_kind_video() : m.media_kind_image();
}

export function stateLabel(asset: Pick<LibraryAsset, 'state'>): string | null {
  switch (asset.state) {
    case 'ready':
      return null;
    case 'rejected':
      return m.media_state_rejected();
    default:
      return m.media_state_processing();
  }
}
