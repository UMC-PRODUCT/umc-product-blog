# Drafts And GitHub Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let writers save drafts and request server-side GitHub publishing.

**Architecture:** Writer pages keep local MDX generation but send structured draft payloads to the server. The server owns GitHub branch, commit, push, and PR behavior.

**Tech Stack:** Astro writer pages, auth API client, existing MDX builder.

---

## Tasks

- Add draft API helpers for `POST /api/v1/tech-blog/drafts`, `PATCH /api/v1/tech-blog/drafts/{id}`, and `POST /api/v1/tech-blog/drafts/{id}/publish`.
- Add "임시저장" and "발행 요청" actions to both writer pages.
- Save generated MDX plus structured metadata and content type.
- Display server status values: `draft saved`, `publish queued`, `pushed`, `failed`.

## Acceptance Criteria

- Logged-out users cannot save or publish.
- Logged-in users can save a draft without downloading a file.
- Publish request does not mutate the static repo from the browser.

## Tests

- Draft payload includes content type, slug, frontmatter, body, and generated MDX.
- Publish endpoint path includes draft id.
