import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiFetch, persistOAuthLoginResponse, resolveApiUrl } from './api';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './session';

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installWindowWithStorage(values: Record<string, string>) {
  const storage = new Map(Object.entries(values));
  const localStorage = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
  };

  vi.stubGlobal('CustomEvent', class CustomEvent extends Event {});
  vi.stubGlobal('window', {
    localStorage,
    sessionStorage: localStorage,
    location: { href: '', pathname: '/secure', search: '', hash: '' },
    dispatchEvent: vi.fn(),
  });

  return localStorage;
}

describe('auth api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves API URLs with an optional origin', () => {
    expect(resolveApiUrl('/api/v1/member/me', '')).toBe('/api/v1/member/me');
    expect(resolveApiUrl('/api/v1/member/me', 'https://api.example.com/')).toBe(
      'https://api.example.com/api/v1/member/me',
    );
  });

  it('refreshes an expired access token once and retries the original request', async () => {
    const storage = installWindowWithStorage({
      [ACCESS_TOKEN_KEY]: 'old-access',
      [REFRESH_TOKEN_KEY]: 'old-refresh',
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(401, { success: false, code: 'AUTH', message: 'expired', result: null }),
      )
      .mockResolvedValueOnce(
        response(200, {
          success: true,
          code: 'OK',
          message: 'ok',
          result: { accessToken: 'new-access', refreshToken: 'new-refresh' },
        }),
      )
      .mockResolvedValueOnce(
        response(200, {
          success: true,
          code: 'OK',
          message: 'ok',
          result: { value: 'retried' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch<{ value: string }>('/api/v1/secure')).resolves.toEqual({
      value: 'retried',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(storage.setItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY, 'new-access');
    expect(storage.setItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'new-refresh');
  });

  it('returns register-required without requiring a local signup route state', () => {
    expect(
      persistOAuthLoginResponse({
        provider: 'GOOGLE',
        success: true,
        code: 'REGISTER_REQUIRED',
      }),
    ).toBe('REGISTER_REQUIRED');
  });
});
