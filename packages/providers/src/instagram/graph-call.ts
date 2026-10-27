import { metaGraph } from '../_kit/meta-graph-call.ts';
import { classifyInstagram } from './graph-errors.ts';
import { GRAPH_ORIGIN, GRAPH_VERSION } from './oauth.ts';

export const graph = metaGraph({
  origin: GRAPH_ORIGIN,
  version: GRAPH_VERSION,
  classify: classifyInstagram,
});
