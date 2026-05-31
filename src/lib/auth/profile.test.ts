import { describe, expect, it } from 'vitest';

import {
  getAuthMemberDisplayName,
  getAuthMemberInitial,
  getAuthMemberProfileImage,
} from './profile';

describe('auth profile helpers', () => {
  it('prefers nickname for display name and initial', () => {
    const member = { name: '박경운', nickname: '하늘', profileImageLink: '' };

    expect(getAuthMemberDisplayName(member)).toBe('하늘');
    expect(getAuthMemberInitial(member)).toBe('하');
  });

  it('uses profile image links only when present', () => {
    expect(getAuthMemberProfileImage({ profileImageLink: ' https://example.com/me.webp ' })).toBe(
      'https://example.com/me.webp',
    );
    expect(getAuthMemberProfileImage({ profileImageLink: ' ' })).toBeNull();
  });
});
