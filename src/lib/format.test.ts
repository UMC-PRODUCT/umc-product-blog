import { describe, expect, it } from 'vitest';

import { formatDate, getInitials, getMemberProfileImageUrl } from './format';

describe('format helpers', () => {
  it('formats dates in Korean long form', () => {
    expect(formatDate(new Date('2026-06-01T00:00:00.000Z'))).toBe('2026년 6월 1일');
  });

  it('uses nickname or name to build profile initials', () => {
    expect(getInitials({ name: '김하늘', nickname: 'Haneul' })).toBe('H');
    expect(getInitials({ name: '김하늘' })).toBe('김');
    expect(getInitials({ name: '' })).toBe('U');
  });

  it('builds fixed CDN profile image URLs from profile image id and extension', () => {
    expect(
      getMemberProfileImageUrl({
        name: '박경운',
        nickname: '하늘',
        profileImageId: 'profile-image',
        profileImageExtension: 'webp',
      }),
    ).toBe('https://cdn.university.neordinary.com/product-team/profile/profile-image.webp');
    expect(
      getMemberProfileImageUrl({
        name: '박경운',
        nickname: '하늘',
        profileImageId: '하늘-박경운',
        profileImageExtension: '.png',
      }),
    ).toBe(
      'https://cdn.university.neordinary.com/product-team/profile/%ED%95%98%EB%8A%98-%EB%B0%95%EA%B2%BD%EC%9A%B4.png',
    );
    expect(getMemberProfileImageUrl({ name: '  River  ' })).toBeUndefined();
  });
});
