import { apiFetch } from './auth/api';
import { readAuthSession } from './auth/session';

export type ContentRef = {
  type: 'blog' | 'release';
  slug: string;
};

export type InteractionAuthor = {
  id?: number | string;
  name?: string;
  nickname?: string;
  profileImageUrl?: string;
};

export type TechBlogComment = {
  id: number | string;
  author?: InteractionAuthor;
  content: string;
  createdAt: string;
  likedByMe: boolean;
  likeCount: number;
  replies: TechBlogComment[];
};

export type CreateCommentInput = {
  content: string;
  parentCommentId?: number | string;
  anonymous?: boolean;
  nickname?: string;
};

export type LikeState = {
  likedByMe: boolean;
  likeCount: number;
};

export function buildContentApiPath(ref: ContentRef, suffix = ''): string {
  const type = encodeURIComponent(ref.type);
  const slug = encodeURIComponent(ref.slug);
  return `/api/v1/tech-blog/contents/${type}/${slug}${suffix}`;
}

export function buildCommentsPath(ref: ContentRef): string {
  return buildContentApiPath(ref, '/comments');
}

export function buildContentLikePath(ref: ContentRef): string {
  return buildContentApiPath(ref, '/like');
}

export function buildCommentLikePath(ref: ContentRef, commentId: number | string): string {
  return buildContentApiPath(ref, `/comments/${encodeURIComponent(String(commentId))}/like`);
}

export function applyOptimisticLike(state: LikeState): LikeState {
  return state.likedByMe
    ? { likedByMe: false, likeCount: Math.max(0, state.likeCount - 1) }
    : { likedByMe: true, likeCount: state.likeCount + 1 };
}

export async function getContentLikeState(ref: ContentRef): Promise<LikeState> {
  return apiFetch<LikeState>(buildContentLikePath(ref), {
    auth: Boolean(readAuthSession()),
    redirectOnAuthFailure: false,
  });
}

export async function toggleContentLike(ref: ContentRef): Promise<LikeState> {
  return apiFetch<LikeState>(buildContentLikePath(ref), {
    method: 'POST',
  });
}

export async function getComments(ref: ContentRef): Promise<TechBlogComment[]> {
  const comments = await apiFetch<TechBlogComment[]>(buildCommentsPath(ref), {
    auth: Boolean(readAuthSession()),
    redirectOnAuthFailure: false,
  });

  return normalizeComments(comments);
}

export async function createComment(
  ref: ContentRef,
  input: CreateCommentInput,
): Promise<TechBlogComment> {
  const isAuthenticated = Boolean(readAuthSession());
  const comment = await apiFetch<TechBlogComment>(buildCommentsPath(ref), {
    method: 'POST',
    auth: isAuthenticated,
    redirectOnAuthFailure: false,
    body: {
      ...input,
      anonymous: isAuthenticated ? (input.anonymous ?? false) : true,
    },
  });

  return normalizeComment(comment);
}

export async function toggleCommentLike(
  ref: ContentRef,
  commentId: number | string,
): Promise<LikeState> {
  return apiFetch<LikeState>(buildCommentLikePath(ref, commentId), {
    method: 'POST',
  });
}

export function normalizeComments(comments: TechBlogComment[] | undefined): TechBlogComment[] {
  return (comments ?? []).map(normalizeComment);
}

export function normalizeComment(comment: TechBlogComment): TechBlogComment {
  return {
    ...comment,
    likedByMe: Boolean(comment.likedByMe),
    likeCount: Math.max(0, Number(comment.likeCount) || 0),
    replies: normalizeComments(comment.replies),
  };
}

export function countComments(comments: TechBlogComment[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}
