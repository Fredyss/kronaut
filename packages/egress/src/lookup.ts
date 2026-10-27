import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP, type LookupFunction } from 'node:net';
import { isPublicAddress } from './address.ts';
import { EgressError } from './errors.ts';

export type Resolver = (hostname: string) => Promise<readonly { address: string; family: 4 | 6 }[]>;

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

const defaultResolver: Resolver = async (hostname) => {
  const records = await dnsLookup(hostname, { all: true, verbatim: true });
  return records.map((record) => ({
    address: record.address,
    family: record.family === 6 ? 6 : 4,
  }));
};

async function resolveValidated(hostname: string, resolver: Resolver): Promise<ResolvedAddress[]> {
  let records: Awaited<ReturnType<Resolver>>;
  try {
    records = await resolver(hostname);
  } catch (cause) {
    if (cause instanceof EgressError) {
      throw cause;
    }
    throw new EgressError('dns_failure', `dns resolution failed for ${hostname}`, { cause });
  }
  if (records.length === 0) {
    throw new EgressError('dns_failure', `no dns records for ${hostname}`);
  }
  const validated: ResolvedAddress[] = [];
  for (const record of records) {
    if (!isPublicAddress(record.address)) {
      throw new EgressError('blocked_address', `${hostname} resolves to a non-public address`);
    }
    validated.push({ address: record.address, family: isIP(record.address) === 6 ? 6 : 4 });
  }
  return validated;
}

function requestedFamily(family: unknown): 4 | 6 | undefined {
  if (family === 4 || family === 'IPv4') {
    return 4;
  }
  if (family === 6 || family === 'IPv6') {
    return 6;
  }
  return undefined;
}

export function createGuardedLookup(resolver: Resolver = defaultResolver): LookupFunction {
  return (hostname, options, callback) => {
    void resolveValidated(hostname, resolver).then(
      (addresses) => {
        const wanted = requestedFamily(options.family);
        const selected =
          wanted === undefined
            ? addresses
            : addresses.filter((candidate) => candidate.family === wanted);
        const first = selected[0];
        if (first === undefined) {
          callback(new EgressError('dns_failure', `no dns records for ${hostname}`), '', undefined);
          return;
        }
        if (options.all) {
          callback(null, selected);
          return;
        }
        callback(null, first.address, first.family);
      },
      (error: unknown) => {
        callback(error as NodeJS.ErrnoException, '', undefined);
      },
    );
  };
}
