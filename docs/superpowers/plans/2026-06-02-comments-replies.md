# Comments And Replies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comments and one-level replies to blog and release detail pages.

**Architecture:** Static detail pages render an empty comments shell. Browser scripts fetch and mutate comments through the tech-blog content API.

**Tech Stack:** Astro component, TypeScript API helpers, auth API client.

---

## Tasks

- Create `ContentRef = { type: "blog" | "release"; slug: string }`.
- Use `/api/v1/tech-blog/contents/{type}/{slug}/comments`.
- Add `CommentsPanel.astro` below share controls on blog and release detail pages.
- Render comment author, content, created date, like count, replies, and reply forms.
- Require login for creating comments and replies.

## Acceptance Criteria

- Logged-out users can read comments.
- Logged-out users see a login CTA in the comment form.
- Logged-in users can post comments and replies.

## Tests

- Comment endpoint builders encode type and slug.
- Comment tree normalization handles empty replies.
