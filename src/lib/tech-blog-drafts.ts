import { apiFetch } from './auth/api';

export type DraftContentType = 'blog' | 'release';

export type TechBlogDraftPayload = {
  contentType: DraftContentType;
  slug: string;
  frontmatter: Record<string, unknown>;
  body: string;
  mdx: string;
};

export type TechBlogDraftResponse = {
  id: number | string;
  status: 'draft saved' | 'publish queued' | 'pushed' | 'failed';
  message?: string;
};

export function buildDraftEndpoint(draftId?: number | string): string {
  return draftId
    ? `/api/v1/tech-blog/drafts/${encodeURIComponent(String(draftId))}`
    : '/api/v1/tech-blog/drafts';
}

export function buildDraftPublishEndpoint(draftId: number | string): string {
  return `${buildDraftEndpoint(draftId)}/publish`;
}

export async function saveTechBlogDraft(
  payload: TechBlogDraftPayload,
  draftId?: number | string,
): Promise<TechBlogDraftResponse> {
  return apiFetch<TechBlogDraftResponse>(buildDraftEndpoint(draftId), {
    method: draftId ? 'PATCH' : 'POST',
    body: payload,
  });
}

export async function publishTechBlogDraft(
  draftId: number | string,
): Promise<TechBlogDraftResponse> {
  return apiFetch<TechBlogDraftResponse>(buildDraftPublishEndpoint(draftId), {
    method: 'POST',
  });
}
