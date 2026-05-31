# 댓글 및 좋아요 API 구현 가정

이 문서는 현재 프론트엔드가 댓글 및 좋아요 API를 어떻게 추측해서 구현했는지 정리한 백엔드 전달용 메모입니다.

아직 백엔드 명세가 확정된 상태가 아니라, 아래 내용은 `src/lib/content-interactions.ts`, `src/components/content/ContentLike.astro`, `src/components/content/CommentsPanel.astro` 기준의 프론트엔드 기대 계약입니다.

## 적용 화면

- 블로그 상세: `/blog/{slug}`
- 릴리즈 상세: `/releases/{slug}`

두 화면 모두 Astro 정적 페이지로 렌더링되고, 댓글과 좋아요는 브라우저에서 API를 호출해 채웁니다.

콘텐츠 식별자는 다음 두 값으로 구성합니다.

```ts
type ContentRef = {
  type: 'blog' | 'release';
  slug: string;
};
```

- `type`: 콘텐츠 종류입니다. 현재 `blog`, `release`만 사용합니다.
- `slug`: Astro content collection의 `id` 값입니다.
- URL 경로에 들어가는 `type`, `slug`, `commentId`는 모두 `encodeURIComponent`로 인코딩합니다.

## 공통 API 처리

프론트엔드는 `PUBLIC_API_BASE_URL`이 있으면 해당 base URL을 붙이고, 없으면 상대 경로로 요청합니다.

요청 body가 객체면 JSON으로 직렬화하고 `Content-Type: application/json`을 붙입니다. 로그인 세션이 필요한 요청에는 `Authorization: Bearer {accessToken}`을 붙입니다.

응답은 두 형태를 모두 처리할 수 있습니다.

```ts
// 권장: 기존 auth API와 같은 envelope
type ApiResponse<T> = {
  success: boolean;
  code: string;
  message: string;
  result: T;
};

// 또는 raw result
T;
```

기존 API 클라이언트가 envelope를 지원하므로, 백엔드는 일관성을 위해 envelope 형태를 내려주는 것이 좋습니다.

`401`이 오면 프론트엔드는 `/api/v1/auth/token/renew`로 토큰 갱신을 시도합니다. 갱신 실패 시 세션을 지우고 요청을 실패 처리합니다.

## 데이터 모델

### 좋아요 상태

```ts
type LikeState = {
  likedByMe: boolean;
  likeCount: number;
};
```

- `likedByMe`: 현재 로그인 사용자가 좋아요를 눌렀는지 여부입니다.
- 비로그인 사용자의 조회 응답에서는 `likedByMe: false`를 기대합니다.
- `likeCount`는 0 이상의 숫자로 기대합니다. 프론트는 음수나 잘못된 숫자를 0으로 보정합니다.

### 댓글

```ts
type TechBlogComment = {
  id: number | string;
  author?: {
    id?: number | string;
    name?: string;
    nickname?: string;
    profileImageUrl?: string;
  };
  content: string;
  createdAt: string;
  likedByMe: boolean;
  likeCount: number;
  replies: TechBlogComment[];
};
```

- `id`: 댓글 좋아요와 답글 생성 시 다시 path/body에 넣습니다.
- `author.nickname`이 있으면 우선 표시하고, 없으면 `author.name`, 둘 다 없으면 `"익명"`을 표시합니다.
- 댓글 API의 프로필 이미지 필드는 `profileImageUrl`로 가정했습니다.
- `createdAt`은 타입에는 포함되어 있지만 현재 UI에서는 아직 표시하지 않습니다. 백엔드는 ISO-8601 문자열로 내려주는 것이 좋습니다.
- `replies`가 없으면 프론트가 `[]`로 보정합니다.
- 현재 UI는 1단계 답글만 지원합니다. 대댓글에 다시 답글 버튼을 붙이지 않습니다.

### 댓글 생성 입력

```ts
type CreateCommentInput = {
  content: string;
  parentCommentId?: number | string;
  anonymous?: boolean;
  nickname?: string;
};
```

- 최상위 댓글: `{ "content": "...", "anonymous": false }`
- 답글: `{ "content": "...", "parentCommentId": 123, "anonymous": false }`
- 비로그인 최상위 댓글: `{ "content": "...", "nickname": "익명", "anonymous": true }`
- 프론트는 `content.trim()` 결과가 빈 문자열이면 요청하지 않습니다.
- 로그인 사용자는 작성자 영역의 `익명` 체크박스로 익명 여부를 선택할 수 있습니다.
- 비로그인 사용자는 익명 여부를 선택할 수 없습니다. 대신 닉네임 입력란을 수정할 수 있고, 기본값은 `"익명"`입니다.
- 로그인 사용자의 기본값은 `anonymous: false`입니다. 체크박스를 켠 경우에만 `anonymous: true`를 보냅니다.
- 비로그인 사용자의 요청은 항상 `anonymous: true`로 보냅니다.

## Endpoint

### 콘텐츠 좋아요 조회

```http
GET /api/v1/tech-blog/contents/{type}/{slug}/like
```

인증은 선택입니다.

- 비로그인: Authorization 헤더 없이 호출합니다.
- 로그인: Authorization 헤더를 붙여 호출합니다.

응답:

```json
{
  "likedByMe": false,
  "likeCount": 12
}
```

envelope 사용 시:

```json
{
  "success": true,
  "code": "OK",
  "message": "OK",
  "result": {
    "likedByMe": false,
    "likeCount": 12
  }
}
```

### 콘텐츠 좋아요 토글

```http
POST /api/v1/tech-blog/contents/{type}/{slug}/like
Authorization: Bearer {accessToken}
```

인증이 필요합니다. body는 보내지 않습니다.

프론트는 클릭 즉시 좋아요 상태를 낙관적으로 바꾸고, API 실패 시 이전 상태로 되돌립니다. 성공 응답은 서버의 최종 상태로 다시 덮어씁니다.

응답:

```json
{
  "likedByMe": true,
  "likeCount": 13
}
```

### 댓글 목록 조회

```http
GET /api/v1/tech-blog/contents/{type}/{slug}/comments
```

인증은 선택입니다.

- 비로그인 사용자는 댓글을 읽을 수 있어야 합니다.
- 로그인 사용자는 각 댓글의 `likedByMe`가 사용자 기준으로 계산되어야 합니다.
- 비로그인 사용자의 `likedByMe`는 `false`를 기대합니다.

응답은 최상위 댓글 배열이고, 각 댓글은 `replies` 배열을 포함합니다.

```json
[
  {
    "id": 1,
    "author": {
      "id": 10,
      "name": "박경운",
      "nickname": "하늘",
      "profileImageUrl": "https://example.com/profile.png"
    },
    "content": "잘 읽었습니다.",
    "createdAt": "2026-06-03T10:15:00+09:00",
    "likedByMe": false,
    "likeCount": 3,
    "replies": [
      {
        "id": 2,
        "author": {
          "id": 11,
          "name": "김예시",
          "nickname": "예시"
        },
        "content": "저도 동의합니다.",
        "createdAt": "2026-06-03T10:20:00+09:00",
        "likedByMe": true,
        "likeCount": 1,
        "replies": []
      }
    ]
  }
]
```

댓글 수 UI는 최상위 댓글과 답글을 모두 합산합니다.

정렬은 프론트에서 바꾸지 않고 백엔드 응답 순서를 그대로 사용합니다. 현재 구현 기준으로는 오래된 순서 또는 최신 순서 중 하나를 백엔드에서 정해야 합니다.

### 댓글 생성

```http
POST /api/v1/tech-blog/contents/{type}/{slug}/comments
Content-Type: application/json
```

인증은 선택입니다.

- 비로그인 사용자는 Authorization 헤더 없이 댓글/답글을 작성할 수 있습니다.
- 비로그인 작성 요청에는 `nickname`과 `anonymous: true`가 포함됩니다. 닉네임 기본값은 `"익명"`입니다.
- 로그인 사용자는 댓글/답글을 작성할 수 있고, 작성자 영역에서 익명 여부를 선택할 수 있습니다.
- 로그인 사용자의 요청에는 Authorization 헤더가 포함됩니다. 백엔드는 Authorization 헤더의 사용자로 권한과 남용 방지 정책을 적용합니다.
- `anonymous: false` 요청은 작성자의 닉네임/프로필을 응답 작성자에 포함해야 합니다.
- `anonymous: true` 요청은 응답 작성자를 익명으로 내려줘야 합니다.
- 비로그인으로 작성한 댓글은 수정/삭제할 수 없습니다.
- 로그인 상태로 작성한 댓글은 작성자 본인이 수정/삭제할 수 있어야 합니다.

최상위 댓글 요청:

```json
{
  "content": "잘 읽었습니다.",
  "anonymous": false
}
```

답글 요청:

```json
{
  "content": "저도 동의합니다.",
  "parentCommentId": 1,
  "anonymous": false
}
```

비로그인 최상위 댓글 요청:

```json
{
  "content": "잘 읽었습니다.",
  "nickname": "익명",
  "anonymous": true
}
```

응답은 생성된 댓글 1개를 기대합니다.

```json
{
  "id": 3,
  "author": {
    "id": 10,
    "name": "박경운",
    "nickname": "하늘",
    "profileImageUrl": "https://example.com/profile.png"
  },
  "content": "잘 읽었습니다.",
  "createdAt": "2026-06-03T10:30:00+09:00",
  "likedByMe": false,
  "likeCount": 0,
  "replies": []
}
```

익명으로 생성한 경우에는 `author`를 생략하거나 익명 작성자를 내려줄 수 있습니다. 프론트는 `author.nickname`, `author.name`이 없으면 `"익명"`으로 표시합니다.

```json
{
  "id": 4,
  "content": "익명으로 남긴 댓글입니다.",
  "createdAt": "2026-06-03T10:35:00+09:00",
  "likedByMe": false,
  "likeCount": 0,
  "replies": []
}
```

현재 프론트는 댓글 생성 성공 후 응답 객체를 화면에 직접 끼워 넣지 않고, 댓글 목록을 다시 조회합니다.

### 댓글 수정

```http
PATCH /api/v1/tech-blog/contents/{type}/{slug}/comments/{commentId}
Authorization: Bearer {accessToken}
Content-Type: application/json
```

로그인 상태로 작성한 댓글만 작성자 본인이 수정할 수 있어야 합니다. 비로그인 댓글은 수정할 수 없습니다.

요청:

```json
{
  "content": "수정한 댓글입니다."
}
```

응답은 수정된 댓글 1개를 기대합니다.

### 댓글 삭제

```http
DELETE /api/v1/tech-blog/contents/{type}/{slug}/comments/{commentId}
Authorization: Bearer {accessToken}
```

로그인 상태로 작성한 댓글만 작성자 본인이 삭제할 수 있어야 합니다. 비로그인 댓글은 삭제할 수 없습니다.

### 댓글 좋아요 토글

```http
POST /api/v1/tech-blog/contents/{type}/{slug}/comments/{commentId}/like
Authorization: Bearer {accessToken}
```

인증이 필요합니다. body는 보내지 않습니다.

프론트는 콘텐츠 좋아요와 동일하게 낙관적 업데이트를 적용하고, API 실패 시 이전 상태로 되돌립니다.

응답:

```json
{
  "likedByMe": true,
  "likeCount": 4
}
```

## 프론트엔드 동작 요약

- 비로그인 사용자는 댓글 목록과 좋아요 개수를 볼 수 있습니다.
- 비로그인 사용자가 콘텐츠 좋아요를 클릭하면 `/login/oauth?redirect={currentPath}`로 이동합니다.
- 비로그인 사용자는 닉네임을 입력해 댓글과 답글을 작성할 수 있습니다. 닉네임 기본값은 `"익명"`입니다.
- 비로그인 사용자는 익명 여부를 선택할 수 없습니다. 비로그인 댓글 생성 요청은 항상 `anonymous: true`입니다.
- 로그인 사용자는 댓글과 답글을 작성할 수 있고, 작성자 영역에서 익명 여부를 선택할 수 있습니다.
- 로그인 사용자의 댓글 생성 요청 body에는 항상 `anonymous` boolean이 포함됩니다. 기본값은 `false`, 체크박스를 켠 경우 `true`입니다.
- 비로그인 사용자가 댓글 좋아요를 누르면 로그인 모달을 엽니다.
- 비로그인 상태로 작성한 댓글은 수정/삭제할 수 없다는 안내를 placeholder에 표시합니다.
- 로그인 상태로 작성한 댓글은 수정/삭제를 지원해야 합니다.
- 좋아요는 토글 방식입니다. 같은 `POST` endpoint가 좋아요 추가와 취소를 모두 처리한다고 가정했습니다.
- 좋아요 변경은 optimistic update입니다. 서버 응답은 항상 최종 `LikeState`를 내려줘야 합니다.
- 댓글 좋아요 상태는 댓글 목록 응답의 `likedByMe`, `likeCount`로 초기화합니다.
- 콘텐츠 좋아요 상태는 댓글 목록과 별도 endpoint에서 초기화합니다.

## 백엔드에서 정해야 할 사항

프론트가 임시로 비워둔 정책입니다. 구현 전에 확정이 필요합니다.

- 댓글 정렬: 오래된 순서, 최신 순서, 또는 별도 정렬 기준
- 페이지네이션 여부: 현재 프론트는 전체 댓글 트리를 한 번에 받는 구조입니다.
- `parentCommentId`가 답글 id일 때 허용할지 여부: 현재 UI는 1단계 답글만 만들지만, API 레벨 정책은 백엔드에서 막아야 합니다.
- 댓글 최대 길이와 금칙어/신고/관리자 삭제 정책
- 삭제된 댓글 표시 방식: 완전 제거, “삭제된 댓글입니다” placeholder, 답글 유지 여부
- 존재하지 않는 `{type, slug}` 또는 `{commentId}`에 대한 status/code
- 이미 좋아요를 누른 사용자가 다시 `POST`했을 때 토글 취소로 볼지, 멱등 endpoint를 분리할지 여부. 현재 프론트는 토글로 구현했습니다.

## 구현 참조 파일

- `src/lib/content-interactions.ts`: endpoint builder, API 호출, 댓글/좋아요 타입
- `src/components/content/ContentLike.astro`: 콘텐츠 좋아요 UI와 optimistic update
- `src/components/content/CommentsPanel.astro`: 댓글 목록, 댓글 생성, 답글 생성, 댓글 좋아요
- `src/lib/auth/api.ts`: API envelope, Authorization 헤더, 토큰 갱신 처리
