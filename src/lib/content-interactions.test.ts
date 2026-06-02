import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyOptimisticLike,
  buildCommentLikePath,
  buildCommentPath,
  buildCommentsPath,
  buildContentLikePath,
  countComments,
  createComment,
  deleteComment,
  getComments,
  normalizeComments,
  updateComment,
} from './content-interactions';

function response(status: number, body: unknown): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { 'Content-Type': 'application/json' },
  });
}

describe('content interactions', () => {
  const ref = { type: 'blog' as const, slug: '2026-06-02-sample post' };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds encoded content interaction endpoints', () => {
    expect(buildCommentsPath(ref)).toBe(
      '/api/v1/tech-blog/contents/blog/2026-06-02-sample%20post/comments',
    );
    expect(buildCommentsPath(ref, { size: 20, sort: 'createdAt,desc' })).toBe(
      '/api/v1/tech-blog/contents/blog/2026-06-02-sample%20post/comments?size=20&sort=createdAt%2Cdesc',
    );
    expect(buildCommentsPath(ref, { cursor: 123, size: 10, sort: 'createdAt,asc' })).toBe(
      '/api/v1/tech-blog/contents/blog/2026-06-02-sample%20post/comments?cursor=123&size=10&sort=createdAt%2Casc',
    );
    expect(buildContentLikePath(ref)).toBe(
      '/api/v1/tech-blog/contents/blog/2026-06-02-sample%20post/like',
    );
    expect(buildCommentPath(ref, 'comment/1')).toBe(
      '/api/v1/tech-blog/contents/blog/2026-06-02-sample%20post/comments/comment%2F1',
    );
    expect(buildCommentLikePath(ref, 'comment/1')).toBe(
      '/api/v1/tech-blog/contents/blog/2026-06-02-sample%20post/comments/comment%2F1/like',
    );
  });

  it('applies optimistic like state without negative counts', () => {
    expect(applyOptimisticLike({ likedByMe: false, likeCount: 0 })).toEqual({
      likedByMe: true,
      likeCount: 1,
    });
    expect(applyOptimisticLike({ likedByMe: true, likeCount: 0 })).toEqual({
      likedByMe: false,
      likeCount: 0,
    });
  });

  it('normalizes missing comment replies', () => {
    expect(
      normalizeComments([
        {
          id: 1,
          content: 'hello',
          createdAt: '2026-06-02',
          likedByMe: false,
          likeCount: -1,
          replies: undefined as never,
        },
      ]),
    ).toEqual([
      {
        id: 1,
        content: 'hello',
        createdAt: '2026-06-02',
        likedByMe: false,
        likeCount: 0,
        deletionType: 'NONE',
        canReply: true,
        canEdit: false,
        canDelete: false,
        replies: [],
      },
    ]);
  });

  it('normalizes deleted comment response flags', () => {
    expect(
      normalizeComments([
        {
          id: 1,
          content: '삭제된 댓글입니다',
          createdAt: '2026-06-02',
          likedByMe: true,
          likeCount: 3,
          deletionType: 'USER_DELETED',
          canReply: true,
          canEdit: true,
          canDelete: true,
          replies: [],
        },
      ]),
    ).toEqual([
      {
        id: 1,
        content: '삭제된 댓글입니다',
        createdAt: '2026-06-02',
        likedByMe: false,
        likeCount: 0,
        deletionType: 'USER_DELETED',
        canReply: false,
        canEdit: false,
        canDelete: false,
        replies: [],
      },
    ]);
  });

  it('fetches cursor paged comment lists with default query params', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      dispatchEvent: vi.fn(),
    });
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        response(200, {
          success: true,
          code: 'OK',
          message: 'OK',
          result: {
            content: [
              {
                id: 1,
                content: 'hello',
                createdAt: '2026-06-03',
                likedByMe: false,
                likeCount: 0,
                replies: [],
              },
            ],
            nextCursor: 1,
            hasNext: true,
          },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const page = await getComments(ref);

    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(buildCommentsPath(ref, { size: 20, sort: 'createdAt,desc' }));
    expect(page).toEqual({
      content: [
        {
          id: 1,
          content: 'hello',
          createdAt: '2026-06-03',
          likedByMe: false,
          likeCount: 0,
          deletionType: 'NONE',
          canReply: true,
          canEdit: false,
          canDelete: false,
          replies: [],
        },
      ],
      nextCursor: 1,
      hasNext: true,
    });
  });

  it('counts top-level comments and replies together', () => {
    expect(
      countComments([
        {
          id: 1,
          content: 'hello',
          createdAt: '2026-06-02',
          likedByMe: false,
          likeCount: 0,
          replies: [
            {
              id: 2,
              content: 'reply',
              createdAt: '2026-06-02',
              likedByMe: false,
              likeCount: 0,
              deletionType: 'NONE',
              canReply: true,
              canEdit: false,
              canDelete: false,
              replies: [],
            },
          ],
          deletionType: 'NONE',
          canReply: true,
          canEdit: false,
          canDelete: false,
        },
      ]),
    ).toBe(2);
  });

  it('sends authenticated non-anonymous comment creation payloads by default', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn((key: string) => {
          if (key === 'access_token') return 'access-token';
          if (key === 'refresh_token') return 'refresh-token';
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      dispatchEvent: vi.fn(),
    });
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        response(200, {
          id: 1,
          content: 'hello',
          createdAt: '2026-06-03',
          likedByMe: false,
          likeCount: 0,
          replies: [],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await createComment(ref, { content: 'hello' });

    const [url, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = request.headers as Headers;
    expect(url).toBe(buildCommentsPath(ref));
    expect(request.method).toBe('POST');
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(request.body).toBe(JSON.stringify({ content: 'hello', anonymous: false }));
  });

  it('sends unauthenticated anonymous comment creation payloads with nickname', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      location: { href: '', pathname: '/blog/sample', search: '', hash: '' },
      dispatchEvent: vi.fn(),
    });
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        response(200, {
          id: 1,
          author: { nickname: '익명' },
          content: 'hello',
          createdAt: '2026-06-03',
          likedByMe: false,
          likeCount: 0,
          replies: [],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await createComment(ref, { content: 'hello', nickname: '익명' });

    const [url, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = request.headers as Headers;
    expect(url).toBe(buildCommentsPath(ref));
    expect(headers.get('Authorization')).toBeNull();
    expect(request.body).toBe(
      JSON.stringify({ content: 'hello', nickname: '익명', anonymous: true }),
    );
    expect(window.location.href).toBe('');
  });

  it('sends parent comment id with anonymous replies', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn((key: string) => {
          if (key === 'access_token') return 'access-token';
          if (key === 'refresh_token') return 'refresh-token';
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      dispatchEvent: vi.fn(),
    });
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        response(200, {
          id: 2,
          content: 'reply',
          createdAt: '2026-06-03',
          likedByMe: false,
          likeCount: 0,
          replies: [],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await createComment(ref, { content: 'reply', parentCommentId: 1, anonymous: true });

    expect(fetchMock).toHaveBeenCalledWith(
      buildCommentsPath(ref),
      expect.objectContaining({
        body: JSON.stringify({ content: 'reply', parentCommentId: 1, anonymous: true }),
      }),
    );
  });

  it('updates and deletes comments through comment resource endpoints', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn((key: string) => {
          if (key === 'access_token') return 'access-token';
          if (key === 'refresh_token') return 'refresh-token';
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      dispatchEvent: vi.fn(),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(200, {
          id: 1,
          content: 'updated',
          createdAt: '2026-06-03',
          likedByMe: false,
          likeCount: 0,
          replies: [],
        }),
      )
      .mockResolvedValueOnce(response(204, null));
    vi.stubGlobal('fetch', fetchMock);

    await updateComment(ref, 1, { content: 'updated' });
    await deleteComment(ref, 1);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      buildCommentPath(ref, 1),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ content: 'updated' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      buildCommentPath(ref, 1),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
