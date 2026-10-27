import { isIP } from 'node:net';
import { Agent, buildConnector } from 'undici';
import { isPublicAddress } from './address.ts';
import { EgressError } from './errors.ts';
import { createGuardedLookup, type Resolver } from './lookup.ts';

function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

export function createGuardedAgent(resolver?: Resolver, timeoutMs?: number): Agent {
  const connector = buildConnector({
    lookup: createGuardedLookup(resolver),
    ...(timeoutMs === undefined ? {} : { timeout: timeoutMs }),
  });
  const connect: buildConnector.connector = (options, callback) => {
    // net.connect never calls `lookup` for IP literals, so they are range-checked here
    const host = stripBrackets(options.hostname);
    if (isIP(host) !== 0 && !isPublicAddress(host)) {
      callback(new EgressError('blocked_address', 'ip literal is not a public address'), null);
      return;
    }
    connector(options, callback);
  };
  return new Agent({
    connect,
    ...(timeoutMs === undefined ? {} : { headersTimeout: timeoutMs, bodyTimeout: timeoutMs }),
  });
}
