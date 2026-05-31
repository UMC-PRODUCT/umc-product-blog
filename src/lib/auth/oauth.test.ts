import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AUTH_REGISTER_REQUIRED_EVENT,
  KAKAO_STATE_STORAGE_KEY,
  OAUTH_REDIRECT_TARGET_STORAGE_KEY,
  completeAuthResult,
  consumeKakaoState,
  redirectAfterAuth,
} from './oauth';

function createStorage(saved: string) {
  const values = new Map([[KAKAO_STATE_STORAGE_KEY, saved]]);
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

function createRedirectStorage(saved: string) {
  const values = new Map([[OAUTH_REDIRECT_TARGET_STORAGE_KEY, saved]]);
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

describe('oauth helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('consumes and validates matching Kakao state', () => {
    const storage = createStorage('state-1');

    expect(consumeKakaoState('state-1', storage)).toBe(true);
    expect(storage.removeItem).toHaveBeenCalledWith(KAKAO_STATE_STORAGE_KEY);
  });

  it('rejects mismatched Kakao state', () => {
    expect(consumeKakaoState('wrong', createStorage('state-1'))).toBe(false);
  });

  it('redirects register-required page auth to the split oauth login page', () => {
    const storage = createRedirectStorage('/blog/sample');
    vi.stubGlobal('window', {
      location: { href: '', search: '' },
      sessionStorage: storage,
    });

    redirectAfterAuth('REGISTER_REQUIRED');

    expect(window.location.href).toBe('/login/oauth?registerRequired=1&redirect=%2Fblog%2Fsample');
  });

  it('emits a register-required event for modal auth', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('CustomEvent', class CustomEvent extends Event {});
    vi.stubGlobal('window', {
      location: { href: '', search: '?redirect=%2Fblog%2Fsample' },
      dispatchEvent,
    });

    completeAuthResult('REGISTER_REQUIRED', { mode: 'modal', redirect: '/blog/sample' });

    expect(window.location.href).toBe('');
    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: AUTH_REGISTER_REQUIRED_EVENT }),
    );
  });
});
