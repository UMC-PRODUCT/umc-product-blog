# UMC PRODUCT Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Bun-based Astro site for UMC PRODUCT with empty-state-ready blog, releases, about, and generation-aware members pages.

**Architecture:** The site is a static Astro app using Content Collections for local MD/MDX and JSON/YAML content. Shared taxonomy and content helper functions keep parts, platforms, generations, member roles, and author resolution consistent across pages. UI is split into small Astro components with global design tokens copied from the referenced UMC PRODUCT style system.

**Tech Stack:** Bun, Astro, @astrojs/mdx, @astrojs/check, TypeScript, Vitest, Pretendard.

---

## File Structure

- Create `package.json`: Bun scripts and dependencies.
- Create `astro.config.mjs`: Astro config with MDX integration.
- Create `tsconfig.json`: Astro strict TypeScript baseline.
- Create `src/content.config.ts`: `blog`, `releases`, `members`, and `generations` collections.
- Create `src/lib/taxonomy.ts`: parts, platforms, and display labels.
- Create `src/lib/content.ts`: pure helper functions for filtering, sorting, author resolution, and generation grouping.
- Create `src/lib/content.test.ts`: Vitest coverage for helper behavior.
- Create `src/styles/global.css`: imported design tokens and app-level layout styles.
- Create `src/layouts/BaseLayout.astro`: shared page shell.
- Create `src/components/**`: header, footer, empty states, chips, cards, member sections.
- Create `src/pages/**`: home, blog list/detail, releases list/detail, about, members default/generation pages.
- Create `src/content/{blog,releases,members,generations}/.gitkeep`: track empty content directories.

## Tasks

### Task 1: Scaffold Astro/Bun Project

**Files:**

- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/env.d.ts`
- Create: `src/content/blog/.gitkeep`
- Create: `src/content/releases/.gitkeep`
- Create: `src/content/members/.gitkeep`
- Create: `src/content/generations/.gitkeep`

- [ ] **Step 1: Add project configuration**

Create the package and Astro config with these scripts:

```json
{
  "name": "umc-product-blog",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "check": "astro check",
    "preview": "astro preview",
    "test": "vitest run"
  }
}
```

Create `astro.config.mjs` with MDX enabled:

```js
import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [mdx()],
});
```

- [ ] **Step 2: Install dependencies**

Run: `bun add astro @astrojs/mdx pretendard`

Run: `bun add -d @astrojs/check typescript vitest`

Expected: `bun.lock` is created and dependencies install successfully.

- [ ] **Step 3: Verify baseline tooling**

Run: `bun run check`

Expected: Astro reports no TypeScript errors or only missing source errors that Task 2 will address.

### Task 2: Define Content Model and Helper Tests

**Files:**

- Create: `src/content.config.ts`
- Create: `src/lib/taxonomy.ts`
- Create: `src/lib/content.test.ts`
- Create: `src/lib/content.ts`

- [ ] **Step 1: Write failing helper tests**

Create tests that assert:

- draft entries are filtered out.
- blog tags are collected uniquely.
- missing blog authors throw a clear error.
- default generation prefers active latest order.
- member participations are filtered by generation and grouped by role group.

Run: `bun run test`

Expected: FAIL because `src/lib/content.ts` does not exist yet.

- [ ] **Step 2: Implement taxonomy and content helpers**

Implement part/platform constants and pure helpers:

- `filterPublished`
- `sortByDateDesc`
- `collectTags`
- `resolveAuthors`
- `selectDefaultGeneration`
- `getMemberParticipationsForGeneration`
- `groupParticipationsByTeam`

- [ ] **Step 3: Verify helper tests pass**

Run: `bun run test`

Expected: PASS.

### Task 3: Add Design System Styles and Layout

**Files:**

- Create: `src/styles/global.css`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/layout/SiteHeader.astro`
- Create: `src/components/layout/SiteFooter.astro`
- Create: `src/components/ui/Container.astro`
- Create: `src/components/ui/SectionHeader.astro`
- Create: `src/components/ui/EmptyState.astro`
- Create: `src/components/ui/PartChip.astro`
- Create: `src/components/ui/TagPill.astro`

- [ ] **Step 1: Add global CSS tokens**

Copy the referenced teal, teal-gray, semantic chip, typography, and shadow tokens into `src/styles/global.css`. Add responsive base layout, card, prose, and navigation styles.

- [ ] **Step 2: Add shared layout components**

Implement the shared layout and primitive UI components. Keep cards at 8px radius or below and use restrained editorial layouts.

- [ ] **Step 3: Verify Astro compiles shared components**

Run: `bun run check`

Expected: PASS.

### Task 4: Add Domain UI Components

**Files:**

- Create: `src/components/blog/PostCard.astro`
- Create: `src/components/blog/PostList.astro`
- Create: `src/components/blog/AuthorInline.astro`
- Create: `src/components/blog/AuthorCard.astro`
- Create: `src/components/releases/ReleaseCard.astro`
- Create: `src/components/releases/PlatformTabs.astro`
- Create: `src/components/members/GenerationTabs.astro`
- Create: `src/components/members/MemberProfileCard.astro`
- Create: `src/components/members/TeamSection.astro`
- Create: `src/components/members/MembersView.astro`

- [ ] **Step 1: Implement blog and release cards**

Cards must handle empty author/tag/part data without throwing.

- [ ] **Step 2: Implement generation-aware member components**

Member cards display fixed profile fields and selected-generation participation fields.

- [ ] **Step 3: Verify components compile**

Run: `bun run check`

Expected: PASS.

### Task 5: Add Pages and Dynamic Routes

**Files:**

- Create: `src/pages/index.astro`
- Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[slug].astro`
- Create: `src/pages/releases/index.astro`
- Create: `src/pages/releases/[slug].astro`
- Create: `src/pages/about.astro`
- Create: `src/pages/members/index.astro`
- Create: `src/pages/members/[generation].astro`

- [ ] **Step 1: Implement home, list, and static pages**

Use `getCollection()` and helper functions. All pages must render useful empty states when collections are empty.

- [ ] **Step 2: Implement detail routes**

Use `getStaticPaths()` and `render()` for MD/MDX entries. Empty collections should produce no detail pages without failing build.

- [ ] **Step 3: Implement members generation routes**

`/members` renders the default generation if available. `/members/[generation]` renders a specific generation and only generates valid generation paths.

- [ ] **Step 4: Verify build**

Run: `bun run build`

Expected: PASS and output static files to `dist/`.

### Task 6: Browser QA and Final Verification

**Files:**

- No planned source changes unless QA finds issues.

- [ ] **Step 1: Start dev server**

Run: `bun run dev -- --host 127.0.0.1`

Expected: local server starts and prints a localhost URL.

- [ ] **Step 2: Open pages in the in-app browser**

Check:

- `/`
- `/blog`
- `/releases`
- `/about`
- `/members`

Expected: each page renders, empty states look intentional, no obvious overlap at desktop width.

- [ ] **Step 3: Check mobile layout**

Use a narrow viewport and reload `/`, `/blog`, `/members`.

Expected: header wraps cleanly, cards stack, text does not overflow.

- [ ] **Step 4: Final verification**

Run:

```bash
bun run test
bun run build
git status --short
```

Expected: tests pass, build passes, only intentional files are modified.
