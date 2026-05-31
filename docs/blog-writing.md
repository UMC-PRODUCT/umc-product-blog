# Tech Blog 작성 가이드

이 문서는 UMC PRODUCT 블로그에 글과 이미지를 올리는 절차를 정리합니다.

현재 블로그와 릴리즈 노트는 Astro content collection 기반의 정적 페이지입니다. `/write`는 작성 도구 허브이며, 실제 작성 화면은 `/write/blog`와 `/write/release`로 나뉩니다. 최종 발행은 생성된 MDX 파일을 각 content directory 아래에 저장한 뒤 정적 빌드로 배포하는 방식입니다.

## 한눈에 보기

1. 로컬 개발 서버를 실행합니다.

   ```bash
   bun run dev -- --host 127.0.0.1
   ```

2. 이미지 업로드, 임시저장, 발행 요청을 사용할 예정이면 먼저 `/login`에서 로그인합니다.

   ```text
   http://127.0.0.1:4321/login
   ```

3. 브라우저에서 `/write/blog`로 이동합니다.

   ```text
   http://127.0.0.1:4321/write/blog
   ```

4. 제목, 설명, 파트, 태그, 작성자, 본문을 입력합니다.
5. 이미지는 파일 선택, 드래그 앤 드롭, 붙여넣기 중 하나로 추가합니다.
6. 오른쪽 패널에서 미리보기와 MDX를 확인합니다.
7. MDX를 복사하거나 다운로드합니다.
8. 서버 기능을 사용할 수 있으면 `임시저장` 또는 `발행 요청`을 사용합니다.
9. 수동 발행이 필요하면 생성된 파일을 `src/content/blog/{slug}.mdx`로 저장합니다.
10. 발행하려면 frontmatter의 `draft`를 `false`로 바꾸고 빌드합니다.

```bash
bun run build
```

## 작성 도구

작성 도구는 다음 파일에 있습니다.

- 허브: [src/pages/write.astro](../src/pages/write.astro)
- 블로그 작성: [src/pages/write/blog.astro](../src/pages/write/blog.astro)
- 릴리즈 노트 작성: [src/pages/write/release.astro](../src/pages/write/release.astro)

도구가 하는 일은 세 가지입니다.

- 블로그 frontmatter를 content schema에 맞춰 자동 생성합니다.
- 릴리즈 노트 frontmatter를 content schema에 맞춰 자동 생성합니다.
- 본문 Markdown/MDX 미리보기를 제공합니다.
- 이미지를 webp로 변환한 뒤 서버가 발급한 signed URL로 업로드합니다.
- 로그인된 세션으로 임시저장과 서버측 발행 요청을 보냅니다.

API 서버 주소는 `PUBLIC_API_BASE_URL` 환경변수로 설정합니다. 작성 도구는 로그인 시 저장된 `access_token`과 `refresh_token`을 사용하므로, 더 이상 수동으로 Access Token을 붙여 넣지 않습니다.

## MDX 파일 위치

블로그 글은 `src/content/blog` 아래의 `.md` 또는 `.mdx` 파일로 관리됩니다.

예시:

```text
src/content/blog/2026-06-02-tech-blog-upload-flow.mdx
```

파일명은 라우트 slug가 됩니다. 위 파일은 다음 경로로 발행됩니다.

```text
/blog/2026-06-02-tech-blog-upload-flow
```

작성 도구는 제목과 발행일을 기준으로 `{yyyy-mm-dd}-{slug}.mdx` 파일명을 제안합니다.

## Frontmatter 형식

블로그 content schema는 [src/content.config.ts](../src/content.config.ts)에 정의되어 있습니다.

필드는 다음 형식으로 작성합니다.

```mdx
---
title: Tech Blog 이미지 업로드 흐름
description: 작성 도구에서 이미지를 webp로 변환하고 서버 스토리지에 올리는 방식
publishedAt: 2026-06-02
tags:
  - Astro
  - Upload
  - S3
parts:
  - web
  - server
authors:
  - 하늘-박경운
draft: true
---

# 본문 제목

본문은 Markdown/MDX로 작성합니다.
```

필드 설명:

| 필드          | 필수 | 설명                                                                    |
| ------------- | ---- | ----------------------------------------------------------------------- |
| `title`       | Y    | 글 제목입니다. 목록, 상세, 메타 타이틀에 사용됩니다.                    |
| `description` | Y    | 글 목록과 메타 설명에 들어가는 한 줄 요약입니다.                        |
| `publishedAt` | Y    | 발행일입니다. `YYYY-MM-DD` 형식을 권장합니다.                           |
| `updatedAt`   | N    | 수정일이 필요할 때만 추가합니다.                                        |
| `tags`        | N    | 쉼표로 입력하면 작성 도구가 YAML 배열로 변환합니다.                     |
| `parts`       | N    | `pm`, `design`, `ios`, `android`, `web`, `server` 중 선택합니다.        |
| `authors`     | N    | `src/content/members/*.json`의 파일명에서 확장자를 뺀 값을 사용합니다.  |
| `series`      | N    | 시리즈에 속하면 `{ id, order }` 형식으로 추가합니다.                    |
| `draft`       | N    | `true`면 목록과 상세 페이지에서 제외됩니다. 발행 시 `false`로 바꿉니다. |

## Release Note 작성

릴리즈 노트는 `/write/release`에서 작성합니다.

```text
http://127.0.0.1:4321/write/release
```

생성된 파일은 `src/content/releases/{slug}.mdx`로 저장합니다.

예시:

```mdx
---
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

- QA 로그 작성 기능을 추가했습니다.
```

릴리즈 노트 필드:

| 필드         | 필수 | 설명                                                                           |
| ------------ | ---- | ------------------------------------------------------------------------------ |
| `title`      | Y    | 릴리즈 노트 제목입니다.                                                        |
| `version`    | Y    | 릴리즈 버전입니다. 예: `v1.0.0`                                                |
| `platform`   | Y    | `ios`, `android`, `web`, `server` 중 하나입니다.                               |
| `releasedAt` | Y    | 릴리즈일입니다. `YYYY-MM-DD` 형식을 권장합니다.                                |
| `summary`    | Y    | 릴리즈 목록과 메타 설명에 들어가는 한 줄 요약입니다.                           |
| `tags`       | N    | 쉼표로 입력하면 작성 도구가 YAML 배열로 변환합니다.                            |
| `draft`      | N    | `true`면 릴리즈 목록과 상세 페이지에서 제외됩니다. 발행 시 `false`로 바꿉니다. |

## 이미지 업로드

작성 도구는 이미지를 업로드할 때 다음 순서로 처리합니다.

1. 브라우저에서 이미지 파일을 읽습니다.
2. 긴 변 기준 최대 1600px로 리사이즈합니다.
3. `image/webp`, quality `0.82`로 변환합니다.
4. 로그인 세션의 Bearer 토큰으로 서버에 `POST /api/v1/storage/prepare-upload`를 호출합니다.
5. 응답의 `uploadUrl`로 webp 파일 바이트를 `PUT` 업로드합니다.
6. 로그인 세션의 Bearer 토큰으로 서버에 `POST /api/v1/storage/{fileId}/confirm`을 호출합니다.
7. `fileId`를 고정 CDN URL로 바꿔 본문 커서 위치에 Markdown 이미지를 삽입합니다.

삽입되는 본문 예시:

```md
![architecture](https://cdn.university.neordinary.com/4e9b0f37-1b35-47db-8f7d-35a98e508f86)
```

현재 작성 도구의 업로드 카테고리는 `TECH_BLOG`로 고정되어 있습니다.

요청 본문은 다음 형태입니다.

```json
{
  "fileName": "architecture-1760000000000.webp",
  "contentType": "image/webp",
  "fileSize": 123456,
  "category": "TECH_BLOG"
}
```

서버 쪽 요구사항:

- `FileCategory`에 `TECH_BLOG`가 있어야 합니다.
- `TECH_BLOG`는 최소한 `webp` 확장자와 `image/webp` MIME 타입을 허용해야 합니다.
- signed URL 업로드 대상 버킷은 브라우저 `PUT` 요청을 허용하도록 CORS가 설정되어 있어야 합니다.
- `prepare-upload`와 `confirm`은 로그인 세션의 `Authorization: Bearer {accessToken}`을 요구합니다.
- signed URL `PUT` 요청에는 UMC API 토큰을 붙이지 않습니다.

## 임시저장과 발행 요청

`/write/blog`와 `/write/release`는 로그인한 사용자에게 두 가지 서버 액션을 제공합니다.

- `임시저장`: 생성된 MDX, frontmatter, 본문, slug, content type을 `POST /api/v1/tech-blog/drafts` 또는 `PATCH /api/v1/tech-blog/drafts/{id}`로 보냅니다.
- `발행 요청`: 저장된 draft id로 `POST /api/v1/tech-blog/drafts/{id}/publish`를 호출합니다.

브라우저는 GitHub에 직접 push하지 않습니다. GitHub branch, commit, push 또는 PR 생성은 서버가 담당합니다.

## 시리즈

시리즈는 태그와 다르게 여러 글을 하나의 순서 있는 흐름으로 묶는 기능입니다.

시리즈 metadata는 `src/content/series/{id}.json`에 저장합니다.

```json
{
  "title": "Architecture",
  "description": "아키텍처 의사결정 흐름",
  "order": 1
}
```

글이 시리즈에 속하면 블로그 frontmatter에 다음을 추가합니다.

```yaml
series:
  id: architecture
  order: 1
```

## 공개 페이지에서 이미지 보이게 하기

작성 도구는 업로드된 이미지를 항상 다음 형식으로 삽입합니다.

```text
https://cdn.university.neordinary.com/{fileId}
```

블로그 상세 페이지는 Astro가 MDX를 그대로 렌더링하므로, 위 CDN URL이 공개 접근 가능하면 정적 페이지에서도 이미지가 바로 표시됩니다.

이 방식은 단순하지만 전제가 있습니다. `fileId`만으로 CDN에서 파일을 조회할 수 있어야 하고, 해당 이미지가 공개되어도 되는 파일이어야 합니다. 파일 접근 권한, 만료 URL, 비공개 파일 정책이 필요하다면 서버 프록시나 별도 이미지 조회 API를 사용해야 합니다. 그 경우 정적 페이지의 단순함은 일부 줄어듭니다.

## 발행 체크리스트

- `src/content/blog/{slug}.mdx`로 파일을 저장했는가?
- `title`, `description`, `publishedAt`이 비어 있지 않은가?
- `parts` 값이 `pm`, `design`, `ios`, `android`, `web`, `server` 중 하나인가?
- `authors` 값이 실제 member content ID와 일치하는가?
- 발행할 글이면 `draft: false`인가?
- 이미지 URL이 공개 페이지에서 접근 가능한 형태인가?
- `bun run build`가 통과하는가?

## PR 자동 검증

PR에는 `Validate Pull Request` GitHub Actions workflow가 실행됩니다.

로컬에서도 같은 콘텐츠 검증을 먼저 돌릴 수 있습니다.

```bash
bun run lint:content
```

콘텐츠 검증은 다음 항목을 확인합니다.

- 콘텐츠 파일이 `src/content/blog`, `src/content/releases`, `src/content/members`, `src/content/generations` 중 올바른 디렉토리에 있는지
- 블로그와 릴리즈 노트 파일명이 `yyyy-mm-dd-{slug}.mdx` 또는 `yyyy-mm-dd-{slug}.md` 형식인지
- 파일명 날짜가 블로그의 `publishedAt`, 릴리즈 노트의 `releasedAt`과 일치하는지
- 블로그의 `title`, `description`, `parts`, `authors`가 유효한지
- 릴리즈 노트의 `title`, `version`, `platform`, `releasedAt`, `summary`가 유효한지
- 작성자 ID가 실제 `src/content/members` 파일명과 일치하는지
- 본문이 비어 있지 않은지
- 본문 이미지에 `file:` URL이 들어가지 않았는지

## 정적 페이지 장점 유지하기

지금 방식은 작성 경험만 브라우저 도구로 개선하고, 발행 결과물은 여전히 정적 Astro 페이지로 유지합니다. 그래서 배포된 블로그는 빠르고 서버 장애 영향도 적습니다.

홈페이지 안에서 완전한 CMS처럼 작성, 저장, 발행까지 처리하려면 다음 기능이 추가로 필요합니다.

- 로그인과 권한 관리
- 글 저장 API
- 이미지 파일 ID와 본문 연결 정책
- MDX 또는 HTML 변환/검증 파이프라인
- 정적 빌드 트리거 또는 서버 렌더링 전환

쓰기만 편하게 만드는 목적이라면 현재 `/write/blog`, `/write/release` 기반 흐름이 더 가볍습니다. 정적 페이지의 장점을 유지하면서도 이미지 업로드와 MDX 생성의 반복 작업을 줄일 수 있습니다.
