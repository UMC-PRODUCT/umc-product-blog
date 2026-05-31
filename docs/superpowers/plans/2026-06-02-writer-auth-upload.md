# Writer Auth Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Use the logged-in session for blog and release image upload instead of manual API base URL and token fields.

**Architecture:** `uploadTechBlogImage` delegates authenticated API calls to `apiFetch`; signed URL `PUT` remains plain `fetch`.

**Tech Stack:** Astro writer pages, existing webp conversion helper, auth API client.

---

## Tasks

- Remove API Base URL and Access Token fields from `/write/blog` and `/write/release`.
- Add an auth status panel to writer pages.
- Disable image file input when `readAuthSession()` has no access token.
- Change prepare-upload and confirm calls to `apiFetch('/api/v1/storage/...')`.
- Keep webp conversion, `TECH_BLOG`, and `https://cdn.university.neordinary.com/{fileId}` output unchanged.

## Acceptance Criteria

- Logged-out users can write and preview MDX but cannot upload images.
- Logged-in users can upload images without copying tokens.
- Existing markdown preview and MDX download behavior stays unchanged.

## Tests

- Upload helper calls the injected authenticated request for prepare and confirm.
- CDN URL and Markdown image output remain unchanged.
