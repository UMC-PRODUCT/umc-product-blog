# 테크 블로그 댓글/좋아요 FE API 가이드

정적 프론트 콘텐츠(`blog`, `release`)의 slug 기반 좋아요, 댓글, 1단계 대댓글 API 계약입니다.

## 공통 규칙

- Base URL: `/api/v1/tech-blog/contents/{type}/{slug}`
- `{type}`: `blog`, `release`만 허용합니다.
- `{slug}`: Astro content collection의 slug입니다. 서버 내부 PK와 별도로 저장됩니다.
- 성공 응답은 전역 `ApiResponse` envelope로 감싸져 `result` 아래에 실제 데이터가 들어옵니다.
- FE API client는 raw result도 읽을 수 있지만, 서버 구현은 envelope를 기준으로 맞춥니다.
- 댓글 `content`는 trim 후 1~1000자입니다.
- 비회원 댓글 `nickname`은 trim 후 1~20자입니다.
- 인증 선택 조회 API는 토큰이 있으면 사용자 기준 값을 계산하고, 없으면 `likedByMe=false`, `canEdit=false`, `canDelete=false`를 내려줍니다.

```ts
type ContentRef = {
  type: 'blog' | 'release';
  slug: string;
};
```

## API 목록

| API ID        | Method | Endpoint                     | 인증 | FE 사용                                          |
| ------------- | ------ | ---------------------------- | ---- | ------------------------------------------------ |
| TECH-BLOG-001 | GET    | `/like`                      | 선택 | 콘텐츠 좋아요 수와 내 좋아요 여부 조회           |
| TECH-BLOG-002 | POST   | `/like`                      | 필수 | 콘텐츠 좋아요 토글                               |
| TECH-BLOG-003 | GET    | `/comments`                  | 선택 | 최상위 댓글 cursor 조회와 1단계 대댓글 포함 조회 |
| TECH-BLOG-004 | POST   | `/comments`                  | 선택 | 댓글 또는 1단계 대댓글 작성                      |
| TECH-BLOG-005 | PATCH  | `/comments/{commentId}`      | 필수 | 본인 댓글 수정                                   |
| TECH-BLOG-006 | DELETE | `/comments/{commentId}`      | 필수 | 본인 댓글 삭제                                   |
| TECH-BLOG-007 | POST   | `/comments/{commentId}/like` | 필수 | 댓글 좋아요 토글                                 |

## 데이터 모델

### LikeState

```ts
type LikeState = {
  likedByMe: boolean;
  likeCount: number;
};
```

FE는 `likeCount`가 음수이거나 숫자로 변환되지 않으면 0으로 보정합니다.

### CommentPage

```ts
type CommentPage = {
  content: TechBlogComment[];
  nextCursor: number | null;
  hasNext: boolean;
};
```

댓글 목록은 더 이상 raw array가 아니라 cursor page로 받습니다. FE는 레거시 raw array 응답도 방어적으로 normalize하지만 서버 계약은 `CommentPage`입니다.

### TechBlogComment

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
  deletionType: 'NONE' | 'USER_DELETED' | 'ADMIN_DELETED';
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  replies: TechBlogComment[];
};
```

`canEdit`와 `canDelete`는 FE 추가 요구 계약입니다. 익명으로 작성한 로그인 댓글은 `author.id` 비교만으로 소유권을 판단할 수 없으므로, 서버가 로그인 사용자 기준 권한을 계산해서 내려줘야 합니다. 비로그인 조회에서는 둘 다 `false`입니다.

FE normalize 기본값:

- `deletionType` 누락 시 `NONE`
- 일반 댓글의 `canReply` 누락 시 `true`
- `canEdit`, `canDelete` 누락 시 `false`
- `replies` 누락 시 `[]`
- 삭제 댓글은 `likedByMe=false`, `likeCount=0`, `canReply=false`, `canEdit=false`, `canDelete=false`로 표시

## 좋아요

### 콘텐츠 좋아요 조회

```http
GET /api/v1/tech-blog/contents/blog/spring-boot-tips/like
```

인증은 선택입니다. 콘텐츠가 아직 DB에 없어도 `likedByMe=false`, `likeCount=0`을 반환합니다.

```json
{
  "result": {
    "likedByMe": false,
    "likeCount": 12
  }
}
```

### 콘텐츠 좋아요 토글

```http
POST /api/v1/tech-blog/contents/blog/spring-boot-tips/like
Authorization: Bearer {accessToken}
```

쓰기 시 콘텐츠가 없으면 서버가 lazy create합니다. FE는 클릭 즉시 낙관적 UI를 적용하고 실패하면 이전 상태로 되돌린 뒤 toast를 표시합니다.

## 댓글 목록

```http
GET /api/v1/tech-blog/contents/blog/spring-boot-tips/comments?size=20&sort=createdAt%2Cdesc
```

FE 첫 로드 기본값:

| 이름   | 값                   |
| ------ | -------------------- |
| size   | `20`                 |
| sort   | `createdAt,desc`     |
| cursor | 첫 페이지에서는 생략 |

`hasNext=true`이면 FE는 `nextCursor`를 사용해 다음 페이지를 append합니다.

```http
GET /api/v1/tech-blog/contents/blog/spring-boot-tips/comments?cursor=123&size=20&sort=createdAt%2Cdesc
```

응답 예시:

```json
{
  "result": {
    "content": [
      {
        "id": 123,
        "author": {
          "id": 1,
          "name": "홍길동",
          "nickname": "spring-master",
          "profileImageUrl": "https://example.com/profile.png"
        },
        "content": "좋은 글 감사합니다.",
        "createdAt": "2026-06-03T10:30:00Z",
        "likedByMe": false,
        "likeCount": 3,
        "deletionType": "NONE",
        "canReply": true,
        "canEdit": true,
        "canDelete": true,
        "replies": []
      }
    ],
    "nextCursor": 123,
    "hasNext": true
  }
}
```

댓글 카운트는 서버 total count가 없으므로 현재 로드된 최상위 댓글과 대댓글 수를 합산해 표시합니다.

## 댓글 작성

```http
POST /api/v1/tech-blog/contents/blog/spring-boot-tips/comments
Content-Type: application/json
Authorization: Bearer {accessToken}
```

로그인 사용자는 익명 여부를 선택할 수 있습니다. 기본값은 `anonymous=false`입니다.

```json
{
  "content": "좋은 글 감사합니다.",
  "anonymous": false
}
```

비회원도 댓글을 작성할 수 있습니다. 비회원은 익명 여부를 선택할 수 없고, FE는 항상 `anonymous=true`를 보냅니다. 닉네임 input은 기본 표시값을 넣지 않으며, 사용자가 비워둔 경우 요청 시점에 `"익명"`을 fallback으로 전송합니다.

```json
{
  "content": "좋은 글 감사합니다.",
  "anonymous": true,
  "nickname": "익명"
}
```

대댓글 작성은 `parentCommentId`를 전달합니다. 대댓글은 1단계만 허용되고, 삭제된 부모 댓글에는 새 대댓글을 작성할 수 없습니다.

```json
{
  "parentCommentId": 123,
  "content": "답글입니다.",
  "anonymous": false
}
```

## 댓글 수정/삭제/좋아요

### 댓글 수정

```http
PATCH /api/v1/tech-blog/contents/blog/spring-boot-tips/comments/{commentId}
Authorization: Bearer {accessToken}
Content-Type: application/json
```

```json
{
  "content": "수정된 댓글입니다."
}
```

FE는 `canEdit=true`인 댓글에만 수정 버튼을 노출합니다. 저장 전 `content.trim()` 1~1000자를 검증하고 실패 시 toast를 표시합니다.

저장 버튼 클릭 시 `window.confirm("댓글을 수정할까요?")` 확인 후 PATCH를 수행합니다.

### 댓글 삭제

```http
DELETE /api/v1/tech-blog/contents/blog/spring-boot-tips/comments/{commentId}
Authorization: Bearer {accessToken}
```

FE는 `canDelete=true`인 댓글에만 삭제 버튼을 노출하고, `window.confirm("댓글을 삭제할까요?")` 확인 후 호출합니다.

관리자도 별도 endpoint 없이 동일한 댓글 DELETE 엔드포인트를 사용해 삭제합니다.

### 댓글 좋아요 토글

```http
POST /api/v1/tech-blog/contents/blog/spring-boot-tips/comments/{commentId}/like
Authorization: Bearer {accessToken}
```

삭제된 댓글에는 좋아요를 누를 수 없습니다. FE도 삭제 댓글에는 좋아요 버튼을 렌더링하지 않습니다.

## 삭제 댓글 표시 규칙

삭제된 댓글이 대댓글 유지를 위해 목록에 남는 경우 서버가 내려준 `content`를 그대로 표시합니다.

| deletionType    | FE 표시                                                    |
| --------------- | ---------------------------------------------------------- |
| `USER_DELETED`  | `content`만 표시, 작성자/avatar/좋아요/답글/수정/삭제 숨김 |
| `ADMIN_DELETED` | `content`만 표시, 작성자/avatar/좋아요/답글/수정/삭제 숨김 |

`canReply=false`인 댓글은 답글 버튼을 숨깁니다. 답글 버튼은 최상위 댓글이고, `deletionType="NONE"`이며, `canReply=true`일 때만 노출합니다.

## 주요 에러 처리

| 상태 | 상황                                                                  | FE 처리                     |
| ---: | --------------------------------------------------------------------- | --------------------------- |
|  400 | 잘못된 type, slug, content, nickname, sort, 삭제된 부모에 대댓글 작성 | toast                       |
|  401 | 인증 필수 API에서 토큰 누락                                           | 토큰 갱신 시도 후 실패 처리 |
|  403 | 본인 댓글이 아닌 수정/삭제, 관리자 권한 없음                          | toast                       |
|  404 | 콘텐츠 또는 댓글을 찾을 수 없음                                       | toast                       |

댓글 작성, 수정, 삭제, 좋아요, 추가 페이지 로드 실패는 모두 공용 toast로 표시합니다. 댓글 목록 최초 로드 실패는 헤더 우측에 작은 텍스트를 표시하고 toast도 함께 표시합니다.
