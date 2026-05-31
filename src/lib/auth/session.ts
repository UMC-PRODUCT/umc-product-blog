import type { AuthSession, OAuthProvider, OAuthRegistrationState } from './types';

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const MEMBER_ID_KEY = 'member_id';
export const OAUTH_VERIFICATION_TOKEN_KEY = 'oauth_verification_token';
export const OAUTH_PROVIDER_KEY = 'oauth_provider';
export const AUTH_SESSION_CHANGE_EVENT = 'umc-auth-session-change';
export const LOGIN_OAUTH_PATH = '/login/oauth';
export const LOGIN_LOCAL_PATH = '/login/local';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getBrowserStorage(kind: 'local' | 'session'): StorageLike | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return kind === 'local' ? window.localStorage : window.sessionStorage;
}

export function readAuthSession(storage = getBrowserStorage('local')): AuthSession | null {
  const accessToken = storage?.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = storage?.getItem(REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  const memberIdValue = storage?.getItem(MEMBER_ID_KEY);
  const memberId = memberIdValue ? Number(memberIdValue) : undefined;

  return {
    accessToken,
    refreshToken,
    memberId: Number.isFinite(memberId) ? memberId : undefined,
  };
}

export function writeAuthSession(session: AuthSession, storage = getBrowserStorage('local')): void {
  storage?.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  storage?.setItem(REFRESH_TOKEN_KEY, session.refreshToken);

  if (session.memberId !== undefined) {
    storage?.setItem(MEMBER_ID_KEY, String(session.memberId));
  } else {
    storage?.removeItem(MEMBER_ID_KEY);
  }

  dispatchAuthSessionChange();
}

export function clearAuthSession(storage = getBrowserStorage('local')): void {
  storage?.removeItem(ACCESS_TOKEN_KEY);
  storage?.removeItem(REFRESH_TOKEN_KEY);
  storage?.removeItem(MEMBER_ID_KEY);
  dispatchAuthSessionChange();
}

export function isAuthenticated(): boolean {
  return readAuthSession() !== null;
}

export function writeOAuthRegistrationState(
  state: OAuthRegistrationState,
  storage = getBrowserStorage('session'),
): void {
  storage?.setItem(OAUTH_VERIFICATION_TOKEN_KEY, state.oAuthVerificationToken);
  storage?.setItem(OAUTH_PROVIDER_KEY, state.provider);
}

export function readOAuthRegistrationState(
  storage = getBrowserStorage('session'),
): OAuthRegistrationState | null {
  const oAuthVerificationToken = storage?.getItem(OAUTH_VERIFICATION_TOKEN_KEY);
  const provider = storage?.getItem(OAUTH_PROVIDER_KEY) as OAuthProvider | null;

  if (!oAuthVerificationToken || !provider) {
    return null;
  }

  return { oAuthVerificationToken, provider };
}

export function clearOAuthRegistrationState(storage = getBrowserStorage('session')): void {
  storage?.removeItem(OAUTH_VERIFICATION_TOKEN_KEY);
  storage?.removeItem(OAUTH_PROVIDER_KEY);
}

export function getCurrentRedirectTarget(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function getRedirectParam(fallback = '/'): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return fallback;
  }

  return redirect;
}

export function buildLoginPath(redirect = getCurrentRedirectTarget()): string {
  return buildLoginOauthPath(redirect);
}

export function buildLoginOauthPath(redirect = getCurrentRedirectTarget()): string {
  return `${LOGIN_OAUTH_PATH}?redirect=${encodeURIComponent(redirect)}`;
}

export function buildLoginLocalPath(redirect = getCurrentRedirectTarget()): string {
  return `${LOGIN_LOCAL_PATH}?redirect=${encodeURIComponent(redirect)}`;
}

export function buildDefaultLoginRedirectPath(search = '', hash = ''): string {
  return `${LOGIN_OAUTH_PATH}${search}${hash}`;
}

export function buildRegisterRequiredLoginPath(redirect = getRedirectParam('/')): string {
  return `${LOGIN_OAUTH_PATH}?registerRequired=1&redirect=${encodeURIComponent(redirect)}`;
}

export function redirectToLogin(redirect = getCurrentRedirectTarget()): void {
  if (typeof window !== 'undefined') {
    window.location.href = buildLoginPath(redirect);
  }
}

function dispatchAuthSessionChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGE_EVENT));
  }
}
