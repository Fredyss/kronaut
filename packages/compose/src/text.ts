import type { PostTypeSpec } from '@kronaut/core';
import { countLinks, countText } from './count.ts';
import type { DraftItem, ValidationIssue } from './validate.ts';

export { countLinks, countText } from './count.ts';
export { toPlainText } from './plain-text.ts';
export type { IssueCode, ValidationIssue } from './validate.ts';

export type TextRules = Pick<PostTypeSpec, 'text' | 'maxLinks'>;

export function checkText(
  rules: TextRules,
  items: readonly Pick<DraftItem, 'text'>[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  items.forEach((item, itemIndex) => {
    for (const { counting, max, urlWeight } of rules.text) {
      const actual = countText(item.text, counting, urlWeight === undefined ? {} : { urlWeight });
      if (actual > max) {
        issues.push({ code: 'text_too_long', itemIndex, counting, limit: max, actual });
      }
    }
    const { maxLinks } = rules;
    if (maxLinks !== undefined) {
      const actual = countLinks(item.text);
      if (actual > maxLinks) {
        issues.push({ code: 'too_many_links', itemIndex, limit: maxLinks, actual });
      }
    }
  });
  return issues;
}
