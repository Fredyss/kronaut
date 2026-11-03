import { describe, expect, it } from 'vitest';
import { groupOf, isMuted } from './groups.ts';

describe('notification email groups', () => {
  it('maps every known kind to its group', () => {
    expect({
      failed: groupOf('destination.failed'),
      unconfirmed: groupOf('destination.unconfirmed'),
      manual: groupOf('destination.awaiting_manual'),
      requested: groupOf('post.approval_requested'),
      approved: groupOf('post.approved'),
      rejected: groupOf('post.rejected'),
      reauth: groupOf('channel.needs_reauth'),
      expiring: groupOf('channel.expiring'),
    }).toEqual({
      failed: 'failures',
      unconfirmed: 'failures',
      manual: 'failures',
      requested: 'approvals',
      approved: 'approvals',
      rejected: 'approvals',
      reauth: 'channels',
      expiring: 'channels',
    });
  });

  it('leaves an unknown kind without a group, so it is never muted', () => {
    expect(groupOf('post.published')).toBeNull();
    expect(groupOf('toString')).toBeNull();
    expect(isMuted('post.published', ['failures', 'approvals', 'channels'])).toBe(false);
  });

  it('mutes a kind only when its group is muted', () => {
    expect(isMuted('destination.failed', ['failures'])).toBe(true);
    expect(isMuted('channel.needs_reauth', ['failures'])).toBe(false);
    expect(isMuted('destination.failed', [])).toBe(false);
  });
});
