import {
  loginWithApple,
  loginWithGoogle,
  loginWithKakaoCode,
  persistOAuthLoginResponse,
} from './api';
import {
  buildRegisterRequiredLoginPath,
  getCurrentRedirectTarget,
  getRedirectParam,
} from './session';

declare global {
  interface Window {
    Kakao?: {
      init: (appKey: string) => void;
      isInitialized: () => boolean;
      Auth: {
        authorize: (options: {
          redirectUri: string;
          state?: string;
          scope?: string;
          prompt?: string;
        }) => void;
      };
    };
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (error: { type: string; message?: string }) => void;
          }) => { requestAccessToken: (overridable?: { prompt?: string }) => void };
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{ authorization: { code: string } }>;
      };
    };
  }
}

export const KAKAO_REDIRECT_PATH = '/oauth/kakao/callback';
export const KAKAO_STATE_STORAGE_KEY = 'kakao_oauth_state';
export const OAUTH_REDIRECT_TARGET_STORAGE_KEY = 'oauth_redirect_target';
export const AUTH_MODAL_SUCCESS_EVENT = 'umc-auth-modal-success';
export const AUTH_REGISTER_REQUIRED_EVENT = 'umc-auth-register-required';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function generateOAuthState(): string {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('보안 난수 생성기를 사용할 수 없습니다.');
}

export function getKakaoRedirectUri(): string {
  return `${window.location.origin}${KAKAO_REDIRECT_PATH}`;
}

export function consumeKakaoState(
  received: string | null,
  storage: StorageLike = window.sessionStorage,
): boolean {
  const saved = storage.getItem(KAKAO_STATE_STORAGE_KEY);
  storage.removeItem(KAKAO_STATE_STORAGE_KEY);
  return Boolean(saved) && saved === received;
}

export function startKakaoSignIn(redirect = getRedirectParam(getCurrentRedirectTarget())): void {
  const appKey = import.meta.env.PUBLIC_KAKAO_APP_KEY as string | undefined;

  if (!appKey) {
    throw new Error('PUBLIC_KAKAO_APP_KEY가 설정되지 않았습니다.');
  }

  if (!window.Kakao) {
    throw new Error('Kakao SDK가 로드되지 않았습니다.');
  }

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(appKey);
  }

  const state = generateOAuthState();
  window.sessionStorage.setItem(KAKAO_STATE_STORAGE_KEY, state);
  writeOAuthRedirectTarget(redirect);
  window.Kakao.Auth.authorize({
    redirectUri: getKakaoRedirectUri(),
    state,
  });
}

export async function handleKakaoCallback(): Promise<'LOGIN_SUCCESS' | 'REGISTER_REQUIRED'> {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  if (error) {
    throw new Error(params.get('error_description') ?? error);
  }

  const code = params.get('code');
  if (!code) {
    throw new Error('Kakao authorization code가 없습니다.');
  }

  if (!consumeKakaoState(params.get('state'))) {
    throw new Error('Kakao 로그인 검증에 실패했습니다.');
  }

  const response = await loginWithKakaoCode({
    authorizationCode: code,
    redirectUri: getKakaoRedirectUri(),
  });

  return persistOAuthLoginResponse(response);
}

export function signInWithGoogle(): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      reject(new Error('PUBLIC_GOOGLE_CLIENT_ID가 설정되지 않았습니다.'));
      return;
    }

    waitForGoogleSdk()
      .then(() => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: (response) => {
            if (response.access_token) {
              resolve(response.access_token);
              return;
            }

            reject(
              new Error(response.error_description ?? response.error ?? 'Google 토큰이 없습니다.'),
            );
          },
          error_callback: reject,
        });
        client.requestAccessToken({ prompt: '' });
      })
      .catch(reject);
  });
}

export async function loginWithGooglePopup(): Promise<'LOGIN_SUCCESS' | 'REGISTER_REQUIRED'> {
  const accessToken = await signInWithGoogle();
  return persistOAuthLoginResponse(await loginWithGoogle(accessToken));
}

export function isGooglePopupCancelled(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'type' in error) {
    const type = (error as { type: string }).type;
    return type === 'popup_closed' || type === 'popup_failed_to_open';
  }

  return false;
}

export async function signInWithApple(): Promise<string> {
  const clientId = import.meta.env.PUBLIC_APPLE_CLIENT_ID as string | undefined;
  const redirectURI = import.meta.env.PUBLIC_APPLE_REDIRECT_URI as string | undefined;

  if (!clientId || !redirectURI) {
    throw new Error('Apple Sign In 환경변수가 설정되지 않았습니다.');
  }

  if (!window.AppleID?.auth) {
    throw new Error('Apple Sign In SDK가 로드되지 않았습니다.');
  }

  window.AppleID.auth.init({
    clientId,
    scope: 'name email',
    redirectURI,
    usePopup: true,
  });

  const response = await window.AppleID.auth.signIn();
  return response.authorization.code;
}

export async function loginWithApplePopup(): Promise<'LOGIN_SUCCESS' | 'REGISTER_REQUIRED'> {
  const authorizationCode = await signInWithApple();
  return persistOAuthLoginResponse(await loginWithApple(authorizationCode));
}

export function isApplePopupCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    (error as { error: string }).error === 'popup_closed_by_user'
  );
}

export function redirectAfterAuth(
  result: 'LOGIN_SUCCESS' | 'REGISTER_REQUIRED',
  redirect = consumeOAuthRedirectTarget(getRedirectParam('/')),
): void {
  completeAuthResult(result, { mode: 'page', redirect });
}

export function completeAuthResult(
  result: 'LOGIN_SUCCESS' | 'REGISTER_REQUIRED',
  options: { mode?: 'page' | 'modal'; redirect?: string } = {},
): void {
  const mode = options.mode ?? 'page';
  const redirect = options.redirect ?? getRedirectParam('/');

  if (result === 'LOGIN_SUCCESS') {
    if (mode === 'modal') {
      window.dispatchEvent(new CustomEvent(AUTH_MODAL_SUCCESS_EVENT));
      return;
    }

    window.location.href = redirect;
    return;
  }

  if (mode === 'modal') {
    window.dispatchEvent(new CustomEvent(AUTH_REGISTER_REQUIRED_EVENT));
    return;
  }

  window.location.href = buildRegisterRequiredLoginPath(redirect);
}

export function writeOAuthRedirectTarget(redirect: string): void {
  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    return;
  }

  window.sessionStorage.setItem(OAUTH_REDIRECT_TARGET_STORAGE_KEY, redirect);
}

export function consumeOAuthRedirectTarget(fallback = '/'): string {
  const redirect = window.sessionStorage.getItem(OAUTH_REDIRECT_TARGET_STORAGE_KEY);
  window.sessionStorage.removeItem(OAUTH_REDIRECT_TARGET_STORAGE_KEY);

  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return fallback;
  }

  return redirect;
}

function waitForGoogleSdk(timeoutMs = 5000): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let elapsed = 0;
    const interval = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(interval);
        resolve();
        return;
      }

      elapsed += 50;
      if (elapsed >= timeoutMs) {
        window.clearInterval(interval);
        reject(new Error('Google SDK 로드 시간이 초과되었습니다.'));
      }
    }, 50);
  });
}
