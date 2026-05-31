import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { lintContent } from './content-lint';

describe('content lint', () => {
  it('accepts content files that follow the publishing rules', async () => {
    const rootDir = await createFixture({
      'src/content/members/하늘-박경운.json': JSON.stringify({
        name: '박경운',
        nickname: '하늘',
        school: '중앙대학교',
        bio: '',
        participations: [],
      }),
      'src/content/blog/2026-06-02-pr-linting.mdx': `---
title: PR Linting
description: PR에서 콘텐츠 업로드 규칙을 검증합니다.
publishedAt: 2026-06-02
tags:
  - CI
parts:
  - server
authors:
  - 하늘-박경운
draft: false
---

## 본문

이미지는 CDN URL을 사용합니다.
![diagram](https://cdn.university.neordinary.com/file-id)
`,
      'src/content/releases/2026-06-02-server-v1.mdx': `---
title: Server v1
version: v1.0.0
platform: server
releasedAt: 2026-06-02
summary: 서버 릴리즈입니다.
tags: []
draft: false
---

## 변경 사항

- 배포 검증을 추가했습니다.
`,
      'src/content/generations/2nd.json': JSON.stringify({
        label: '2기',
        status: 'active',
        order: 2,
      }),
      'src/content/series/architecture.json': JSON.stringify({
        title: 'Architecture',
        description: '아키텍처 시리즈',
        order: 1,
      }),
      'src/content/blog/.gitkeep': '',
      'src/content/releases/.gitkeep': '',
      'src/content/members/.gitkeep': '',
      'src/content/generations/.gitkeep': '',
      'src/content/series/.gitkeep': '',
    });

    await expect(lintContent({ rootDir })).resolves.toEqual([]);
  });

  it('reports misplaced content and invalid blog metadata', async () => {
    const rootDir = await createFixture({
      'src/content/members/하늘-박경운.json': JSON.stringify({
        name: '박경운',
        nickname: '하늘',
        school: '중앙대학교',
        bio: '',
        participations: [],
      }),
      'src/content/posts/2026-06-02-wrong-place.mdx': '# 잘못된 위치',
      'src/content/blog/sample-post.mdx': `---
title: ""
description: ""
publishedAt: 2026-06-01
tags: ci
parts:
  - backend
authors:
  - 없는-작성자
draft: "no"
---

![local](file:///Users/example/image.png)
`,
    });

    const issues = await lintContent({ rootDir });
    const messages = issues.map((issue) => issue.message);

    expect(messages).toContain(
      'Unsupported content directory "posts". Use blog, releases, members, generations, or series.',
    );
    expect(messages).toContain(
      'Blog filename must follow yyyy-mm-dd-{slug}.md or .mdx with a lowercase URL-safe slug.',
    );
    expect(messages).toContain('Blog title is required.');
    expect(messages).toContain('Blog description is required.');
    expect(messages).toContain('Blog tags must be an array.');
    expect(messages).toContain('Unknown blog part "backend".');
    expect(messages).toContain('Unknown blog author "없는-작성자".');
    expect(messages).toContain('Blog draft must be a boolean.');
    expect(messages).toContain('Content images must not use file: URLs.');
  });

  it('reports unknown series ids and duplicate series order', async () => {
    const rootDir = await createFixture({
      'src/content/members/하늘-박경운.json': JSON.stringify({
        name: '박경운',
        nickname: '하늘',
        school: '중앙대학교',
        bio: '',
        participations: [],
      }),
      'src/content/series/known.json': JSON.stringify({
        title: 'Known',
        description: 'Known series',
        order: 1,
      }),
      'src/content/blog/2026-06-02-first.mdx': `---
title: First
description: First
publishedAt: 2026-06-02
tags: []
parts:
  - server
authors:
  - 하늘-박경운
series:
  id: known
  order: 1
draft: false
---

## 본문
`,
      'src/content/blog/2026-06-02-second.mdx': `---
title: Second
description: Second
publishedAt: 2026-06-02
tags: []
parts:
  - server
authors:
  - 하늘-박경운
series:
  id: known
  order: 1
draft: false
---

## 본문
`,
      'src/content/blog/2026-06-02-third.mdx': `---
title: Third
description: Third
publishedAt: 2026-06-02
tags: []
parts:
  - server
authors:
  - 하늘-박경운
series:
  id: missing
  order: 2
draft: false
---

## 본문
`,
    });

    const messages = (await lintContent({ rootDir })).map((issue) => issue.message);

    expect(messages).toContain(
      'Duplicate blog series order 1 for "known" already used by src/content/blog/2026-06-02-first.mdx.',
    );
    expect(messages).toContain('Unknown blog series "missing".');
  });

  it('reports release filenames that do not match release dates', async () => {
    const rootDir = await createFixture({
      'src/content/releases/2026-06-02-server-release.mdx': `---
title: Server Release
version: 1.0.0
platform: backend
releasedAt: 2026-06-03
summary: ""
tags: []
draft: false
---
`,
    });

    const issues = await lintContent({ rootDir });
    const messages = issues.map((issue) => issue.message);

    expect(messages).toContain('Release filename date must match releasedAt.');
    expect(messages).toContain('Release version should start with "v", for example v1.0.0.');
    expect(messages).toContain('Unknown release platform "backend".');
    expect(messages).toContain('Release summary is required.');
    expect(messages).toContain('Release body is required.');
  });
});

async function createFixture(files: Record<string, string>): Promise<string> {
  const rootDir = await mkdtemp(join(tmpdir(), 'umc-content-lint-'));

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(rootDir, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }

  return rootDir;
}
