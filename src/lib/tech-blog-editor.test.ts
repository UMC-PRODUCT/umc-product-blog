import { describe, expect, it } from 'vitest';

import {
  buildMdxPost,
  buildMdxRelease,
  createPostSlug,
  createReleaseSlug,
  parseCommaSeparatedValues,
  renderMarkdownPreview,
} from './tech-blog-editor';

describe('tech blog editor helpers', () => {
  it('creates url-safe post slugs from titles', () => {
    expect(createPostSlug('Astro 이미지 업로드 설계', new Date('2026-06-01'))).toBe(
      '2026-06-01-astro',
    );
    expect(createPostSlug('Astro 이미지 업로드 설계', '2026-06-01')).toBe('2026-06-01-astro');
    expect(createPostSlug('', new Date('2026-06-01'))).toBe('2026-06-01-tech-blog');
  });

  it('parses comma separated metadata fields', () => {
    expect(parseCommaSeparatedValues('astro, image upload, astro')).toEqual([
      'astro',
      'image upload',
    ]);
  });

  it('builds an MDX post with the existing content collection frontmatter', () => {
    expect(
      buildMdxPost({
        title: '이미지 업로드 설계',
        description: 'TECH_BLOG 이미지 업로드 플로우 정리',
        publishedAt: '2026-06-01',
        parts: ['web', 'server'],
        tags: ['Astro', 'S3'],
        authors: ['haneul'],
        draft: true,
        body: '# 본문',
      }),
    ).toBe(`---
title: 이미지 업로드 설계
description: TECH_BLOG 이미지 업로드 플로우 정리
publishedAt: 2026-06-01
tags:
  - Astro
  - S3
parts:
  - web
  - server
authors:
  - haneul
draft: true
---

# 본문
`);
  });

  it('creates url-safe release slugs from titles and release dates', () => {
    expect(createReleaseSlug('QA 로그 기능 출시', new Date('2026-06-02'))).toBe('2026-06-02-qa');
    expect(createReleaseSlug('', '2026-06-02')).toBe('2026-06-02-release-note');
  });

  it('builds an MDX release note with the existing content collection frontmatter', () => {
    expect(
      buildMdxRelease({
        title: 'QA 로그 기능 출시',
        version: 'v1.0.0',
        platform: 'server',
        releasedAt: '2026-06-02',
        summary: 'QA 로그 작성 기능을 추가했습니다.',
        tags: ['QA', 'Release'],
        draft: true,
        body: '## 변경 사항',
      }),
    ).toBe(`---
title: QA 로그 기능 출시
version: v1.0.0
platform: server
releasedAt: 2026-06-02
summary: QA 로그 작성 기능을 추가했습니다.
tags:
  - QA
  - Release
draft: true
---

## 변경 사항
`);
  });

  it('renders a safe markdown preview for the post body', () => {
    const html = renderMarkdownPreview(`# 제목

#### 세부 제목

본문 **강조**와 [링크](https://example.com)

---

- 첫 번째
- 두 번째

\`\`\`ts
const value = "<script>";
\`\`\`

![아키텍처](https://cdn.university.neordinary.com/file-123)

<script>alert("xss")</script>`);

    expect(html).toContain('<h1>제목</h1>');
    expect(html).toContain('<h4>세부 제목</h4>');
    expect(html).toContain('<hr>');
    expect(html).toContain('<strong>강조</strong>');
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noreferrer">링크</a>',
    );
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>첫 번째</li>');
    expect(html).toContain('<li>두 번째</li>');
    expect(html).toContain('<pre><code class="language-ts">');
    expect(html).toContain('const value = &quot;&lt;script&gt;&quot;;');
    expect(html).toContain(
      '<img src="https://cdn.university.neordinary.com/file-123" alt="아키텍처" loading="lazy">',
    );
    expect(html).not.toContain('<script>');
  });
});
