export type Actor =
  | { kind: 'user' | 'grant' | 'reviewer'; id: string }
  | { kind: 'system' }
  | { kind: 'cli' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export function actorSetting(actor: Actor): string {
  if (actor.kind === 'system' || actor.kind === 'cli') return actor.kind;
  if (!isUuid(actor.id)) throw new TypeError(`${actor.kind} actor id must be a uuid`);
  return `${actor.kind}:${actor.id.toLowerCase()}`;
}
