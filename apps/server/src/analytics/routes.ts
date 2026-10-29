import type { BoundRoute } from '../http/types.ts';
import { bindChannelMetrics } from './channel-metrics.ts';
import { bindPostMetrics } from './post-metrics.ts';

export function analyticsRoutes(): BoundRoute[] {
  return [bindPostMetrics(), bindChannelMetrics()];
}
