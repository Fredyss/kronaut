import type { ProviderManifest } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { comment, main, SKY, thread } from './testing.ts';
import { validate } from './validate.ts';
import { validateSettings } from './validate-settings.ts';

const TUBE: ProviderManifest = {
  ...SKY,
  requiredSettings: ['title', 'playlist'],
  postTypes: SKY.postTypes.map((type) =>
    type.id === 'post' ? { ...type, forbiddenChars: '<>' } : type,
  ),
};

describe('validateSettings', () => {
  it('reports each required setting that is missing, not a string or blank', () => {
    expect(validateSettings(TUBE, { title: 'Hello', playlist: 'x' })).toStrictEqual([]);
    expect(validateSettings(TUBE, { title: ' \n\t', playlist: 3 })).toStrictEqual([
      { code: 'setting_required', field: 'title' },
      { code: 'setting_required', field: 'playlist' },
    ]);
    expect(validateSettings(TUBE, {})).toHaveLength(2);
    expect(validateSettings(TUBE, null)).toHaveLength(2);
    expect(
      validateSettings(TUBE, Object.create({ title: 'inherited', playlist: 'x' })),
    ).toHaveLength(2);
  });

  it('reports nothing for a manifest without required settings', () => {
    expect(validateSettings(SKY, undefined)).toStrictEqual([]);
  });
});

describe('validate: forbidden characters', () => {
  it('reports a main item whose text holds a forbidden character', () => {
    expect(validate(TUBE, 'post', [main('a < b')])).toStrictEqual([
      { code: 'forbidden_characters', itemIndex: 0 },
    ]);
    expect(validate(TUBE, 'post', [main('a > b')])).toStrictEqual([
      { code: 'forbidden_characters', itemIndex: 0 },
    ]);
    expect(validate(TUBE, 'post', [main('a ≤ b')])).toStrictEqual([]);
  });

  it('checks only main items, and only on post types that forbid characters', () => {
    expect(validate(TUBE, 'post', [main(), thread('<b>'), comment('<i>')])).toStrictEqual([]);
    expect(validate(TUBE, 'gallery', [main('<b>')])).toStrictEqual([]);
  });
});
