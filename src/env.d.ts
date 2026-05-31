/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE_URL?: string;
  readonly PUBLIC_KAKAO_APP_KEY?: string;
  readonly PUBLIC_GOOGLE_CLIENT_ID?: string;
  readonly PUBLIC_APPLE_CLIENT_ID?: string;
  readonly PUBLIC_APPLE_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
