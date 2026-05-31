# Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make login and signup work in this Astro blog by adapting the reference web auth API and OAuth flow.

**Architecture:** Keep auth entirely client-side. Store tokens in localStorage, inject Bearer headers through `apiFetch`, refresh once on 401, and redirect to `/login` when refresh fails.

**Tech Stack:** Astro pages, TypeScript browser modules, UMC API, Kakao/Google/Apple SDK scripts.

---

## Tasks

- Create `src/lib/auth/types.ts` for `AuthSession`, `ApiResponse<T>`, login, signup, OAuth, terms, school, and member types.
- Create `src/lib/auth/session.ts` with `readAuthSession`, `writeAuthSession`, `clearAuthSession`, OAuth registration storage, and login redirect helpers.
- Create `src/lib/auth/api.ts` with `resolveApiUrl`, `apiFetch`, login, signup, token refresh, terms, school, and member API wrappers.
- Create `src/lib/auth/oauth.ts` with Kakao state, Kakao redirect, Google popup token, Apple popup code, and OAuth response handling.
- Create `src/lib/auth/validation.ts` using the reference validation rules for email, login id, password, and nickname.
- Add `/login`, `/signup`, `/signup/oauth`, and `/oauth/kakao/callback` Astro pages.
- Add SDK scripts to `BaseLayout` using the same script URLs as `reference/web/index.html`.
- Add a small header auth status control that shows login/logout state after hydration.

## Acceptance Criteria

- Email login stores `access_token` and `refresh_token`.
- OAuth login supports Kakao, Google, and Apple.
- Signup supports email verification, school selection, terms agreement, ID/PW registration, and OAuth registration.
- 401 refresh uses `POST /api/v1/auth/token/renew`.
- Refresh failure clears tokens and redirects to `/login?redirect={currentPath}`.

## Tests

- Auth session storage reads/writes/clears tokens.
- API URL builder keeps `/api/v1/...` paths intact.
- `apiFetch` refreshes once after a 401 and retries the original request.
- Kakao state validation accepts matching state and rejects mismatches.
