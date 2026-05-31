import { describe, expect, it, vi } from 'vitest';

import {
  ACCESS_TOKEN_KEY,
  MEMBER_ID_KEY,
  REFRESH_TOKEN_KEY,
  buildDefaultLoginRedirectPath,
  buildLoginPath,
  buildRegisterRequiredLoginPath,
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from './session';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}

describe('auth session', () => {
  it('stores, reads, and clears auth tokens', () => {
    const storage = createStorage();

    writeAuthSession(
      {
        accessToken: 'access',
        refreshToken: 'refresh',
        memberId: 10,
      },
      storage,
    );

    expect(storage.setItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY, 'access');
    expect(storage.setItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'refresh');
    expect(storage.setItem).toHaveBeenCalledWith(MEMBER_ID_KEY, '10');
    expect(readAuthSession(storage)).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      memberId: 10,
    });

    clearAuthSession(storage);

    expect(readAuthSession(storage)).toBeNull();
  });

  it('builds split login routes with preserved query strings', () => {
    expect(buildLoginPath('/blog/sample')).toBe('/login/oauth?redirect=%2Fblog%2Fsample');
    expect(buildDefaultLoginRedirectPath('?redirect=%2Fblog%2Fsample', '#top')).toBe(
      '/login/oauth?redirect=%2Fblog%2Fsample#top',
    );
    expect(buildRegisterRequiredLoginPath('/releases/sample')).toBe(
      '/login/oauth?registerRequired=1&redirect=%2Freleases%2Fsample',
    );
  });
});
