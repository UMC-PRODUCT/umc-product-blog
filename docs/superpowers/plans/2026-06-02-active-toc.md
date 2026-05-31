# Active Toc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Highlight the current heading in the table of contents while reading.

**Architecture:** Keep Astro's static heading extraction. Add data attributes and a tiny IntersectionObserver script.

**Tech Stack:** Astro component, browser IntersectionObserver, existing CSS.

---

## Tasks

- Add `data-content-toc` to the ToC root and `data-heading-id` to each ToC link.
- Observe matching article headings by id.
- Set `aria-current="true"` on the active link.
- Add active link styles for light and dark modes.

## Acceptance Criteria

- Desktop sticky ToC highlights the current section.
- Mobile top-of-content ToC keeps working.
- No error is thrown when a page has no headings.

## Tests

- Active target selection picks the visible heading nearest the top.
