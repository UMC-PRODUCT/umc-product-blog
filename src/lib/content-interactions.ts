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

export type CommentDeletionType = 'NONE' | 'USER_DELETED' | 'ADMIN_DELETED';

export type TechBlogComment = {
  id: number | string;
  author?: InteractionAuthor;
  content: string;
  createdAt: string;
  likedByMe: boolean;
  likeCount: number;
  deletionType: CommentDeletionType;
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  replies: TechBlogComment[];
};

export type CommentPage = {
  content: TechBlogComment[];
  nextCursor: number | null;
  hasNext: boolean;
};

export type CommentSort = 'createdAt,desc' | 'createdAt,asc';

export type CommentListOptions = {
  cursor?: number | string | null;
  size?: number;
  sort?: CommentSort;
};

export type CreateCommentInput = {
  content: string;
  parentCommentId?: number | string;
  anonymous?: boolean;
  nickname?: string;
};

export type UpdateCommentInput = {
  content: string;
};

export type LikeState = {
  likedByMe: boolean;
  likeCount: number;
};

type RawTechBlogComment = Omit<Partial<TechBlogComment>, 'replies'> & {
  id: number | string;
  content: string;
  createdAt: string;
  replies?: RawTechBlogComment[];
};

type RawCommentPage = {
  content?: RawTechBlogComment[];
  nextCursor?: number | string | null;
  hasNext?: boolean;
};

const DEFAULT_COMMENT_PAGE_SIZE = 20;
const DEFAULT_COMMENT_SORT: CommentSort = 'createdAt,desc';

export function buildContentApiPath(ref: ContentRef, suffix = ''): string {
  const type = encodeURIComponent(ref.type);
  const slug = encodeURIComponent(ref.slug);
  return `/api/v1/tech-blog/contents/${type}/${slug}${suffix}`;
}

export function buildCommentsPath(ref: ContentRef, options?: CommentListOptions): string {
  const path = buildContentApiPath(ref, '/comments');
  if (!options) return path;

  const params = new URLSearchParams();
  if (options.cursor !== undefined && options.cursor !== null) {
    params.set('cursor', String(options.cursor));
  }
  if (options.size !== undefined) {
    params.set('size', String(options.size));
  }
  if (options.sort) {
    params.set('sort', options.sort);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function buildContentLikePath(ref: ContentRef): string {
  return buildContentApiPath(ref, '/like');
}

export function buildCommentPath(ref: ContentRef, commentId: number | string): string {
  return buildContentApiPath(ref, `/comments/${encodeURIComponent(String(commentId))}`);
}

export function buildCommentLikePath(ref: ContentRef, commentId: number | string): string {
  return `${buildCommentPath(ref, commentId)}/like`;
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

export async function getComments(
  ref: ContentRef,
  options: CommentListOptions = {},
): Promise<CommentPage> {
  const page = await apiFetch<RawCommentPage | RawTechBlogComment[]>(
    buildCommentsPath(ref, {
      cursor: options.cursor,
      size: options.size ?? DEFAULT_COMMENT_PAGE_SIZE,
      sort: options.sort ?? DEFAULT_COMMENT_SORT,
    }),
    {
      auth: Boolean(readAuthSession()),
      redirectOnAuthFailure: false,
    },
  );

  return normalizeCommentPage(page);
}

export async function getAllComments(ref: ContentRef): Promise<TechBlogComment[]> {
  const page = await getComments(ref);
  return page.content;
}

export async function updateComment(
  ref: ContentRef,
  commentId: number | string,
  input: UpdateCommentInput,
): Promise<TechBlogComment> {
  const comment = await apiFetch<RawTechBlogComment>(buildCommentPath(ref, commentId), {
    method: 'PATCH',
    body: input,
  });

  return normalizeComment(comment);
}

export async function deleteComment(ref: ContentRef, commentId: number | string): Promise<void> {
  await apiFetch<void>(buildCommentPath(ref, commentId), {
    method: 'DELETE',
  });
}

export async function createComment(
  ref: ContentRef,
  input: CreateCommentInput,
): Promise<TechBlogComment> {
  const isAuthenticated = Boolean(readAuthSession());
  const comment = await apiFetch<RawTechBlogComment>(buildCommentsPath(ref), {
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

export function normalizeCommentPage(
  page: RawCommentPage | RawTechBlogComment[] | undefined,
): CommentPage {
  if (Array.isArray(page)) {
    return {
      content: normalizeComments(page),
      nextCursor: null,
      hasNext: false,
    };
  }

  return {
    content: normalizeComments(page?.content),
    nextCursor: normalizeCursor(page?.nextCursor),
    hasNext: Boolean(page?.hasNext),
  };
}

export function normalizeComments(comments: RawTechBlogComment[] | undefined): TechBlogComment[] {
  return (comments ?? []).map(normalizeComment);
}

export function normalizeComment(comment: RawTechBlogComment): TechBlogComment {
  const deletionType = normalizeDeletionType(comment.deletionType);
  const isDeleted = deletionType !== 'NONE';

  return {
    ...comment,
    likedByMe: isDeleted ? false : Boolean(comment.likedByMe),
    likeCount: isDeleted ? 0 : Math.max(0, Number(comment.likeCount) || 0),
    deletionType,
    canReply: isDeleted ? false : (comment.canReply ?? true),
    canEdit: isDeleted ? false : Boolean(comment.canEdit),
    canDelete: isDeleted ? false : Boolean(comment.canDelete),
    replies: normalizeComments(comment.replies),
  };
}

export function countComments(comments: TechBlogComment[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}

function normalizeCursor(cursor: RawCommentPage['nextCursor']): number | null {
  if (cursor === undefined || cursor === null || cursor === '') {
    return null;
  }

  const nextCursor = Number(cursor);
  return Number.isFinite(nextCursor) ? nextCursor : null;
}

function normalizeDeletionType(deletionType: unknown): CommentDeletionType {
  if (deletionType === 'USER_DELETED' || deletionType === 'ADMIN_DELETED') {
    return deletionType;
  }

  return 'NONE';
}
