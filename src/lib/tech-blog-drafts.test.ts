import { describe, expect, it } from 'vitest';

import { buildDraftEndpoint, buildDraftPublishEndpoint } from './tech-blog-drafts';

describe('tech blog draft helpers', () => {
  it('builds draft save and publish endpoints', () => {
    expect(buildDraftEndpoint()).toBe('/api/v1/tech-blog/drafts');
    expect(buildDraftEndpoint('draft/1')).toBe('/api/v1/tech-blog/drafts/draft%2F1');
    expect(buildDraftPublishEndpoint('draft/1')).toBe('/api/v1/tech-blog/drafts/draft%2F1/publish');
  });
});
