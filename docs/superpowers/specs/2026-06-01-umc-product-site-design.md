# UMC PRODUCT Astro Site Design

## Overview

UMC PRODUCT 웹사이트는 기술 블로그 중심의 정적 Astro 사이트로 만든다. 사이트는 조직 소개, 조직도 및 구성원 소개, iOS/Android/Web/Server(SpringBoot) 릴리즈 노트, 조직 기술 블로그를 제공한다.

초기 콘텐츠는 비워 둔다. 대신 콘텐츠가 없을 때도 페이지가 의도된 상태처럼 보이도록 빈 상태 UI를 각 화면의 목적에 맞춰 설계한다.

런타임과 패키지 관리는 Bun을 기본으로 한다. Astro 빌드 결과는 정적 사이트로 배포 가능해야 한다.

## Design Direction

선택한 방향은 기술 블로그 중심형이다. 첫 화면은 UMC PRODUCT의 정체성을 짧게 보여준 뒤 최신 기술 글 영역을 가장 크게 배치한다. 릴리즈 노트와 조직/멤버 정보는 보조 탐색과 신뢰 보강 역할을 맡는다.

색상, 타입, 그림자는 `UMC-PRODUCT/umc-product-web-v2`의 `src/styles` 토큰을 최대한 따른다.

- Primary: teal 계열, 특히 `--color-teal-600`.
- Neutral: `teal-gray` 계열.
- Part chips: iOS, Android, Web, SpringBoot 등 참조 스타일의 chip 색상.
- Typography: Pretendard variable 기반 타입 토큰.
- Shadow: 낮은 neutral shadow 중심.

## Routes

### `/`

홈이자 편집형 대시보드다.

- UMC PRODUCT 이름과 짧은 조직 설명.
- 최신 기술 블로그 영역.
- 최신 릴리즈 노트 미리보기.
- 조직/멤버 페이지로 이동하는 보조 섹션.
- 콘텐츠가 없으면 최신 글 빈 상태를 표시한다.

### `/blog`

기술 블로그 전체 목록이다.

- 글 카드 목록.
- 파트 필터: iOS, Android, Web, Server.
- 태그 필터 구조.
- 글이 없거나 조건에 맞는 글이 없을 때 별도 빈 상태.

### `/blog/[slug]`

기술 블로그 상세 페이지다.

- 제목, 설명, 발행일, 수정일.
- 작성 파트 chip.
- 태그 pill.
- 작성자 바이라인.
- MDX 본문.

### `/releases`

릴리즈 노트 허브다.

- 플랫폼 탭: iOS, Android, Web, Server(SpringBoot).
- 릴리즈 카드 목록.
- 플랫폼별 릴리즈가 없을 때 빈 상태.

### `/releases/[slug]`

릴리즈 상세 페이지다.

- 제목, 버전, 플랫폼, 릴리즈 일자.
- 요약, 태그.
- MDX 본문.

### `/about`

조직 소개 페이지다.

- UMC PRODUCT의 역할과 운영 목적.
- 제품 조직으로서의 핵심 활동.
- 블로그와 릴리즈 노트로 이어지는 탐색.

### `/members`

조직도 및 구성원 소개 페이지다.

- 기본 기수의 구성원 조회. 기본 기수는 활성 기수 중 최신 기수다.
- 선택한 기수의 직책/파트별 구성원 그룹.
- 멤버 카드.
- 멤버 데이터가 없거나 선택한 기수에 구성원이 없으면 구성원 정보 준비 중 빈 상태.

### `/members/[generation]`

특정 기수의 조직도 및 구성원 소개 페이지다.

- `generations` 컬렉션의 id를 slug로 사용한다.
- 기수별 URL 공유가 가능해야 한다.
- 존재하지 않는 기수는 404로 처리한다.

## Content Model

Astro Content Collections를 사용한다.

### `blog`

블로그 글은 `src/content/blog`에 MD/MDX로 작성한다.

필드:

- `title`: 글 제목.
- `description`: 목록과 메타 설명에 쓰는 요약.
- `publishedAt`: 발행일.
- `updatedAt`: 선택적 수정일.
- `tags`: 주제 태그 배열. 예: `Astro`, `SwiftUI`, `CI/CD`.
- `parts`: 작성 주체 파트 배열. 예: `ios`, `android`, `web`, `server`.
- `authors`: `members` 컬렉션 id 배열.
- `draft`: 초안 여부.

`tags`와 `parts`는 다른 목적을 가진다. `tags`는 주제 분류이고 `parts`는 어느 파트에서 작성한 글인지 나타낸다.

### `releases`

릴리즈 노트는 `src/content/releases`에 MD/MDX로 작성한다.

필드:

- `title`: 릴리즈 제목.
- `version`: 버전 문자열.
- `platform`: `ios | android | web | server`.
- `releasedAt`: 릴리즈 일자.
- `summary`: 목록용 요약.
- `tags`: 선택적 태그 배열.
- `draft`: 초안 여부.

UI label은 `server`를 `Server(SpringBoot)`로 표시한다.

### `members`

작성자와 구성원 정보는 `src/content/members`에 데이터 컬렉션으로 관리한다.

멤버 컬렉션은 개인의 고정 프로필과 기수별 참여 이력을 분리한다. 같은 사람이 여러 기수에 참여하거나, 기수마다 파트와 직책이 달라질 수 있기 때문이다.

고정 프로필 필드:

- `name`: 이름.
- `nickname`: 닉네임.
- `school`: 학교.
- `profileImage`: 선택적 프로필 이미지 경로.
- `bio`: 간단한 자기소개.
- `parts`: 멤버가 대표적으로 연결되는 전체 파트 배열.
- `participations`: 기수별 참여 이력 배열.

`participations` 항목 필드:

- `generation`: 기수 id. 예: `6th`, `7th`.
- `role`: 해당 기수에서의 직책. 예: `Lead`, `Member`, `PM`.
- `team`: 조직도에서 묶을 팀. 예: `Core`, `Design`, `iOS`, `Android`, `Web`, `Server`.
- `order`: 해당 기수/그룹 안에서의 정렬 순서.

### `generations`

기수 정보는 `src/content/generations`에 데이터 컬렉션으로 관리한다.

필드:

- `label`: 화면 표시 이름. 예: `7기`.
- `startsAt`: 선택적 시작일.
- `endsAt`: 선택적 종료일.
- `status`: `active | archived`.
- `order`: 기수 정렬 순서.

`/members`와 `/members/[generation]`은 `generations`를 기준으로 기수 필터를 만들고, 선택된 기수에 해당하는 `members.participations`만 추려 조직도를 구성한다. 초기 기본 선택은 `active` 기수 중 `order`가 가장 높은 기수로 한다. 활성 기수가 없으면 가장 최신 기수를 기본값으로 쓴다.

블로그 글은 `authors`에서 멤버 id를 참조한다. 구현 시 존재하지 않는 작성자 id는 빌드 단계에서 발견되도록 검증한다.

블로그 작성자 표시는 멤버의 고정 프로필과 멤버 root `parts`를 기본으로 한다. 글 자체의 카테고리는 글 frontmatter의 `parts`가 담당한다.

## Components

### Layout

- `BaseLayout`: HTML shell, SEO 기본값, 전역 스타일 import.
- `SiteHeader`: 로고와 주요 내비게이션.
- `SiteFooter`: 조직명, 주요 링크.

### Shared UI

- `Container`: 페이지 폭과 수평 padding 관리.
- `SectionHeader`: 섹션 제목과 설명.
- `EmptyState`: 페이지별 빈 상태.
- `PartChip`: 파트별 색상 chip.
- `TagPill`: 블로그 태그 pill.
- `AuthorInline`: 목록/상세에서 쓰는 작성자 요약.

### Blog

- `PostCard`: 목록 카드.
- `PostList`: 글 배열과 빈 상태 처리.
- `BlogFilters`: 파트/태그 필터 UI 구조.
- `AuthorCard`: 상세 페이지 작성자 카드.

### Releases

- `PlatformTabs`: 플랫폼 탐색.
- `ReleaseCard`: 릴리즈 목록 카드.
- `VersionBadge`: 버전 표기.

### Members

- `GenerationTabs`: 기수별 조회 탭 또는 segmented control.
- `MemberProfileCard`: 프로필 이미지, 학교, 이름, 닉네임, 소개, 선택 기수의 파트와 직책 표시.
- `OrganizationSection`: 선택 기수 기준 직책 그룹/파트별 멤버 그룹.
- `TeamSection`: 기수마다 달라질 수 있는 팀 구성을 표현하는 그룹 섹션.

## Empty States

빈 상태는 단순히 빈 박스가 아니라 해당 페이지의 목적을 유지해야 한다.

- 홈: 아직 공개된 기술 글이 없다는 상태와 블로그 작성 위치 안내.
- 블로그 목록: 글이 없거나 필터 결과가 없다는 상태.
- 릴리즈: 플랫폼별 릴리즈 노트 준비 중 상태.
- 멤버: 기수 정보가 없으면 구성원 정보 준비 중 상태, 선택한 기수에 멤버가 없으면 해당 기수 구성 준비 중 상태.

내부 구현 경로는 개발자에게 도움이 되는 수준으로만 노출한다. 방문자 화면에서는 조직 웹사이트 톤을 유지한다.

## Implementation Constraints

- Bun 기반으로 `bun install`, `bun run dev`, `bun run build` 흐름을 사용한다.
- Astro와 MDX를 사용한다.
- 초기 실제 콘텐츠는 만들지 않는다.
- 스키마와 컴포넌트는 콘텐츠가 추가되면 자동으로 목록/상세 페이지에 반영되게 한다.
- 참조 스타일 토큰을 전역 CSS 변수로 이식한다.
- 모바일과 데스크톱에서 텍스트가 UI 요소 밖으로 흐르지 않게 한다.

## Validation

기본 검증:

- `bun run build`
- 가능하면 `astro check` 또는 이에 대응하는 npm script.

브라우저 확인:

- 홈.
- 블로그 목록 빈 상태.
- 릴리즈 목록 빈 상태.
- 조직 소개.
- 멤버 기본 기수 빈 상태.
- 특정 기수 멤버 조회.
- 모바일 폭에서 내비게이션과 카드 레이아웃.
