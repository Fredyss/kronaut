import { describe, expect, it } from 'vitest';
import { actorSetting, isUuid } from './actor.ts';

const ID = '00000000-0000-7000-8000-0000000000a1';
const APP_ACTOR = /^((user|grant|reviewer):[0-9a-f-]{36}|system|cli)$/;

describe('actorSetting', () => {
  it('formats id-bearing actors as kind:uuid', () => {
    expect(actorSetting({ kind: 'user', id: ID })).toBe(`user:${ID}`);
    expect(actorSetting({ kind: 'grant', id: ID })).toBe(`grant:${ID}`);
    expect(actorSetting({ kind: 'reviewer', id: ID })).toBe(`reviewer:${ID}`);
  });

  it('formats system and cli without an id', () => {
    expect(actorSetting({ kind: 'system' })).toBe('system');
    expect(actorSetting({ kind: 'cli' })).toBe('cli');
  });

  it('lowercases the uuid', () => {
    expect(actorSetting({ kind: 'user', id: ID.toUpperCase() })).toBe(`user:${ID}`);
  });

  it('rejects ids that are not uuids', () => {
    for (const id of ['', 'nope', `${ID}0`, ID.slice(1), `${ID.slice(0, -1)}g`, `${ID}; drop`]) {
      expect(() => actorSetting({ kind: 'user', id })).toThrow(TypeError);
    }
  });

  it('always satisfies the app_actor() pattern', () => {
    const actors = [
      { kind: 'user', id: ID.toUpperCase() },
      { kind: 'grant', id: ID },
      { kind: 'reviewer', id: ID },
      { kind: 'system' },
      { kind: 'cli' },
    ] as const;
    for (const actor of actors) expect(actorSetting(actor)).toMatch(APP_ACTOR);
  });
});

describe('isUuid', () => {
  it('accepts canonical uuids only', () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid(ID.toUpperCase())).toBe(true);
    expect(isUuid(ID.replaceAll('-', ''))).toBe(false);
    expect(isUuid(`{${ID}}`)).toBe(false);
  });
});
