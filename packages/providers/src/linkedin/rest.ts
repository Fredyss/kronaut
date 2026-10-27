import type { ProviderHttpResponse, PublishContext, StepEffect } from '@kronaut/core';
import { send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { linkedinManifest } from './manifest.ts';

const API_ORIGIN = 'https://api.linkedin.com';
const RESTLI_PROTOCOL = '2.0.0';
const UPLOAD_HOST = 'www.linkedin.com';

export interface Member {
  readonly author: string;
  readonly token: string;
}

export function restPost(
  ctx: PublishContext,
  effect: StepEffect,
  member: Member,
  request: { readonly path: string; readonly json: unknown },
): Promise<ProviderHttpResponse> {
  return send(ctx, effect, new URL(request.path, API_ORIGIN), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${member.token}`,
      'Linkedin-Version': linkedinManifest.apiVersion.version,
      'X-Restli-Protocol-Version': RESTLI_PROTOCOL,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request.json),
  });
}

export function uploadTarget(raw: string): URL {
  const url = URL.canParse(raw) ? new URL(raw) : undefined;
  const trusted =
    url !== undefined &&
    url.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    url.port === '' &&
    url.hostname === UPLOAD_HOST;
  if (!trusted) throw permanent('upload_url_unexpected');
  return url;
}
