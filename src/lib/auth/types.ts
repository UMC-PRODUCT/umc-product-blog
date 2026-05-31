export type ApiResponse<T> = {
  success: boolean;
  code: string;
  message: string;
  result: T;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  memberId?: number;
};

export type ClientType = 'ANDROID' | 'IOS' | 'WEB';

export type EmailLoginRequest = {
  email: string;
  password: string;
  clientType?: ClientType;
};

export type EmailLoginResponse = {
  memberId: number;
  accessToken: string;
  refreshToken: string;
};

export type OAuthProvider = 'GOOGLE' | 'KAKAO' | 'APPLE';
export type OAuthLoginCode = 'LOGIN_SUCCESS' | 'REGISTER_REQUIRED';

export type OAuthLoginResponse = {
  provider: OAuthProvider;
  success: boolean;
  code: OAuthLoginCode;
  oAuthVerificationToken?: string;
  accessToken?: string;
  refreshToken?: string;
  memberId?: number;
};

export type TermType = 'SERVICE' | 'PRIVACY' | 'MARKETING' | 'LOCATION';

export type TermConsentStatus = {
  termsId: number;
  isAgreed: boolean;
};

export type TermResponse = {
  id: number;
  link: string;
  isMandatory: boolean;
};

export type SchoolNameItem = {
  schoolId: number;
  schoolName: string;
};

export type SchoolNameListResponse = {
  schools: SchoolNameItem[];
};

export type SendEmailVerificationResponse = {
  emailVerificationId: string;
};

export type CompleteEmailVerificationResponse = {
  emailVerificationToken: string;
};

export type LoginIdAvailabilityResponse = {
  loginId: string;
  available: boolean;
};

export type IdPwRegisterMemberRequest = {
  loginId: string;
  rawPassword: string;
  name: string;
  nickname: string;
  emailVerificationToken: string;
  schoolId: number;
  termsAgreements: TermConsentStatus[];
};

export type OAuthRegisterMemberRequest = {
  oAuthVerificationToken: string;
  name: string;
  nickname: string;
  emailVerificationToken: string;
  schoolId: number;
  termsAgreements: TermConsentStatus[];
  appleRefreshToken?: string;
};

export type RegisterResponse = {
  memberId: number;
  accessToken: string;
  refreshToken: string;
};

export type AuthMember = {
  id: number;
  name: string;
  nickname: string;
  email: string;
  schoolId?: number;
  schoolName?: string;
  profileImageLink?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'WITHDRAWN';
};

export type OAuthRegistrationState = {
  provider: OAuthProvider;
  oAuthVerificationToken: string;
};
