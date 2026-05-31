import {
  clearAuthSession,
  clearOAuthRegistrationState,
  readAuthSession,
  redirectToLogin,
  writeAuthSession,
} from './session';
import type {
  ApiResponse,
  AuthMember,
  AuthSession,
  CompleteEmailVerificationResponse,
  EmailLoginRequest,
  EmailLoginResponse,
  IdPwRegisterMemberRequest,
  LoginIdAvailabilityResponse,
  OAuthLoginResponse,
  OAuthRegisterMemberRequest,
  RegisterResponse,
  SchoolNameListResponse,
  SendEmailVerificationResponse,
  TermResponse,
  TermType,
} from './types';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, options: { status: number; code?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
  }
}

export type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  redirectOnAuthFailure?: boolean;
  baseUrl?: string;
};

let refreshInFlight: Promise<AuthSession | null> | null = null;

export function getConfiguredApiBaseUrl(): string {
  return (import.meta.env.PUBLIC_API_BASE_URL ?? '').trim();
}

export function resolveApiUrl(path: string, baseUrl = getConfiguredApiBaseUrl()): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!baseUrl.trim()) {
    return normalizedPath;
  }

  return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const {
    auth = true,
    retryOnUnauthorized = true,
    redirectOnAuthFailure = true,
    baseUrl,
    ...requestOptions
  } = options;
  const session = auth ? readAuthSession() : null;
  const response = await fetch(resolveApiUrl(path, baseUrl), {
    ...requestOptions,
    headers: buildHeaders(requestOptions.headers, session?.accessToken, requestOptions.body),
    body: serializeBody(requestOptions.body),
  });
  const body = await readResponseBody(response);

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const renewed = await renewAuthSession(baseUrl);
    if (renewed) {
      return apiFetch<T>(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }

    clearAuthSession();
    if (redirectOnAuthFailure) {
      redirectToLogin();
    }
  }

  if (!response.ok) {
    throw buildApiError(response, body);
  }

  if (isApiResponse<T>(body)) {
    if (!body.success) {
      throw new ApiError(body.message || '요청에 실패했습니다.', {
        status: response.status,
        code: body.code,
      });
    }

    return body.result;
  }

  return body as T;
}

export async function renewAuthSession(baseUrl?: string): Promise<AuthSession | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const session = readAuthSession();
  if (!session?.refreshToken) {
    return null;
  }

  refreshInFlight = apiFetch<{ accessToken: string; refreshToken: string }>(
    '/api/v1/auth/token/renew',
    {
      method: 'POST',
      auth: false,
      retryOnUnauthorized: false,
      redirectOnAuthFailure: false,
      baseUrl,
      body: { refreshToken: session.refreshToken },
    },
  )
    .then((tokens) => {
      const nextSession = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        memberId: session.memberId,
      };
      writeAuthSession(nextSession);
      return nextSession;
    })
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

export async function loginWithEmail(payload: EmailLoginRequest): Promise<EmailLoginResponse> {
  const result = await apiFetch<EmailLoginResponse>('/api/v1/auth/login/email', {
    method: 'POST',
    auth: false,
    body: { ...payload, clientType: payload.clientType ?? 'WEB' },
  });
  writeAuthSession({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    memberId: result.memberId,
  });
  return result;
}

export async function loginWithGoogle(accessToken: string): Promise<OAuthLoginResponse> {
  return apiFetch<OAuthLoginResponse>('/api/v1/auth/login/google', {
    method: 'POST',
    auth: false,
    body: { accessToken },
  });
}

export async function loginWithKakaoCode(params: {
  authorizationCode: string;
  redirectUri: string;
}): Promise<OAuthLoginResponse> {
  return apiFetch<OAuthLoginResponse>('/api/v1/auth/login/kakao/code', {
    method: 'POST',
    auth: false,
    body: params,
  });
}

export async function loginWithApple(authorizationCode: string): Promise<OAuthLoginResponse> {
  return apiFetch<OAuthLoginResponse>('/api/v1/auth/login/apple', {
    method: 'POST',
    auth: false,
    body: { authorizationCode, clientType: 'WEB' },
  });
}

export function persistOAuthLoginResponse(
  response: OAuthLoginResponse,
): 'LOGIN_SUCCESS' | 'REGISTER_REQUIRED' {
  if (response.code === 'LOGIN_SUCCESS') {
    if (!response.accessToken || !response.refreshToken) {
      throw new Error('로그인 응답에 토큰이 없습니다.');
    }

    writeAuthSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      memberId: response.memberId,
    });
    clearOAuthRegistrationState();
    return 'LOGIN_SUCCESS';
  }

  return 'REGISTER_REQUIRED';
}

export async function getCurrentMember(): Promise<AuthMember> {
  return apiFetch<AuthMember>('/api/v1/member/me');
}

export async function sendEmailVerification(email: string): Promise<SendEmailVerificationResponse> {
  return apiFetch<SendEmailVerificationResponse>('/api/v1/auth/email-verification', {
    method: 'POST',
    auth: false,
    body: { email, purpose: 'REGISTER' },
  });
}

export async function resendEmailVerification(emailVerificationId: number): Promise<void> {
  await apiFetch<void>('/api/v1/auth/email-verification/resend', {
    method: 'POST',
    auth: false,
    body: { emailVerificationId },
  });
}

export async function completeEmailVerification(params: {
  emailVerificationId: number;
  verificationCode: string;
}): Promise<CompleteEmailVerificationResponse> {
  return apiFetch<CompleteEmailVerificationResponse>('/api/v1/auth/email-verification/code', {
    method: 'POST',
    auth: false,
    body: params,
  });
}

export async function checkLoginIdAvailability(
  loginId: string,
): Promise<LoginIdAvailabilityResponse> {
  return apiFetch<LoginIdAvailabilityResponse>(
    `/api/v1/auth/login-id/availability?loginId=${encodeURIComponent(loginId)}`,
    {
      auth: false,
      redirectOnAuthFailure: false,
    },
  );
}

export async function getAllSchools(): Promise<SchoolNameListResponse> {
  return apiFetch<SchoolNameListResponse>('/api/v1/schools/all', {
    auth: false,
    redirectOnAuthFailure: false,
  });
}

export async function getTermsByType(termType: TermType): Promise<TermResponse> {
  return apiFetch<TermResponse>(`/api/v1/terms/type/${termType}`, {
    auth: false,
    redirectOnAuthFailure: false,
  });
}

export async function registerMemberByIdPw(
  payload: IdPwRegisterMemberRequest,
): Promise<RegisterResponse> {
  const result = await apiFetch<RegisterResponse>('/api/v1/member/register/id-pw', {
    method: 'POST',
    auth: false,
    body: payload,
  });
  writeAuthSession({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    memberId: result.memberId,
  });
  return result;
}

export async function registerMemberByOAuth(
  payload: OAuthRegisterMemberRequest,
): Promise<RegisterResponse> {
  const result = await apiFetch<RegisterResponse>('/api/v1/member/register/oauth', {
    method: 'POST',
    auth: false,
    body: payload,
  });
  writeAuthSession({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    memberId: result.memberId,
  });
  clearOAuthRegistrationState();
  return result;
}

function buildHeaders(
  headers: HeadersInit | undefined,
  accessToken: string | undefined,
  body: unknown,
): Headers {
  const nextHeaders = new Headers(headers);

  if (accessToken) {
    nextHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  if (shouldSerializeJson(body) && !nextHeaders.has('Content-Type')) {
    nextHeaders.set('Content-Type', 'application/json');
  }

  return nextHeaders;
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (!shouldSerializeJson(body)) {
    return body as BodyInit;
  }

  return JSON.stringify(body);
}

function shouldSerializeJson(body: unknown): boolean {
  return (
    body !== undefined &&
    body !== null &&
    typeof body === 'object' &&
    !(typeof FormData !== 'undefined' && body instanceof FormData) &&
    !(typeof Blob !== 'undefined' && body instanceof Blob) &&
    !(body instanceof URLSearchParams) &&
    !(typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer)
  );
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isApiResponse<T>(body: unknown): body is ApiResponse<T> {
  return typeof body === 'object' && body !== null && 'success' in body && 'result' in body;
}

function buildApiError(response: Response, body: unknown): ApiError {
  if (isApiResponse<unknown>(body)) {
    return new ApiError(body.message || `요청에 실패했습니다. (${response.status})`, {
      status: response.status,
      code: body.code,
    });
  }

  if (typeof body === 'string' && body.trim()) {
    return new ApiError(body, { status: response.status });
  }

  return new ApiError(`요청에 실패했습니다. (${response.status})`, { status: response.status });
}
