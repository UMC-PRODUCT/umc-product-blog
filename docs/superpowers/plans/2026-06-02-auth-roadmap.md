# Login And Interaction Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement each plan document independently.

**Goal:** Add authentication to the Astro blog while keeping the public pages static.

**Architecture:** Auth runs as client-side progressive enhancement. Public blog, release, series, and about pages remain static Astro output; authenticated features call the UMC API from browser scripts.

**Tech Stack:** Astro, TypeScript, browser `fetch`, `localStorage`, `markdown-it`, existing content collections.

---

## Execution Units

1. `2026-06-02-auth-foundation.md`
   - Provides reusable auth session, API client, login, signup, OAuth callback.
   - Must be completed before writer upload, comments, likes, and drafts.

2. `2026-06-02-writer-auth-upload.md`
   - Removes manual token entry from `/write/blog` and `/write/release`.
   - Depends on auth foundation.

3. `2026-06-02-comments-replies.md`
   - Adds client-side comments and replies to blog and release detail pages.
   - Depends on auth foundation for writes.

4. `2026-06-02-likes.md`
   - Adds content and comment like toggles.
   - Depends on auth foundation for mutations.

5. `2026-06-02-drafts-github-push.md`
   - Adds draft save and server-side publish request from writer pages.
   - Depends on auth foundation and writer upload cleanup.

6. `2026-06-02-series.md`
   - Adds a static series collection and pages.
   - Independent of auth.

7. `2026-06-02-active-toc.md`
   - Adds scroll-aware ToC highlighting.
   - Independent of auth.

## Shared Contracts

- API base URL comes from `PUBLIC_API_BASE_URL`.
- API endpoints include `/api/v1/...`; do not use reference app's shortened `/v1/...` paths.
- Browser-visible OAuth env keys are `PUBLIC_KAKAO_APP_KEY`, `PUBLIC_GOOGLE_CLIENT_ID`, `PUBLIC_APPLE_CLIENT_ID`, and `PUBLIC_APPLE_REDIRECT_URI`.
- Static pages do not switch to SSR.

## Verification

- Run `bun run test`.
- Run `bun run lint:content`.
- Run `bun run build`.
