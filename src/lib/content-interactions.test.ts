import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyOptimisticLike,
  buildCommentLikePath,
  buildCommentsPath,
  buildContentLikePath,
  countComments,
  createComment,
  normalizeComments,
} from './content-interactions';

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
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
    expect(buildContentLikePath(ref)).toBe(
      '/api/v1/tech-blog/contents/blog/2026-06-02-sample%20post/like',
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
        replies: [],
      },
    ]);
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
              replies: [],
            },
          ],
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
});
