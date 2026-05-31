import MarkdownIt from 'markdown-it';

import type { PartId, PlatformId } from './taxonomy';

const markdownPreviewRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
});

const defaultLinkOpen =
  markdownPreviewRenderer.renderer.rules.link_open ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

markdownPreviewRenderer.renderer.rules.link_open = (tokens, index, options, env, self) => {
  tokens[index].attrSet('target', '_blank');
  tokens[index].attrSet('rel', 'noreferrer');
  return defaultLinkOpen(tokens, index, options, env, self);
};

const defaultImage =
  markdownPreviewRenderer.renderer.rules.image ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

markdownPreviewRenderer.renderer.rules.image = (tokens, index, options, env, self) => {
  tokens[index].attrSet('loading', 'lazy');
  return defaultImage(tokens, index, options, env, self);
};

export type MdxPostInput = {
  title: string;
  description: string;
  publishedAt: string;
  parts: PartId[];
  tags: string[];
  authors: string[];
  draft: boolean;
  body: string;
};

export type MdxReleaseInput = {
  title: string;
  version: string;
  platform: PlatformId;
  releasedAt: string;
  summary: string;
  tags: string[];
  draft: boolean;
  body: string;
};

export function createPostSlug(title: string, date: Date | string = new Date()): string {
  return createDatedSlug(title, date, 'tech-blog');
}

export function createReleaseSlug(title: string, date: Date | string = new Date()): string {
  return createDatedSlug(title, date, 'release-note');
}

function createDatedSlug(
  title: string,
  date: Date | string = new Date(),
  fallback: string,
): string {
  const datePrefix = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  const slug = title
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${datePrefix}-${slug || fallback}`;
}

export function parseCommaSeparatedValues(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function buildMdxPost(input: MdxPostInput): string {
  return `---
title: ${escapeYamlScalar(input.title)}
description: ${escapeYamlScalar(input.description)}
publishedAt: ${input.publishedAt}
tags:
${formatYamlList(input.tags)}
parts:
${formatYamlList(input.parts)}
authors:
${formatYamlList(input.authors)}
draft: ${input.draft}
---

${input.body.trim()}
`;
}

export function buildMdxRelease(input: MdxReleaseInput): string {
  return `---
title: ${escapeYamlScalar(input.title)}
version: ${escapeYamlScalar(input.version)}
platform: ${input.platform}
releasedAt: ${input.releasedAt}
summary: ${escapeYamlScalar(input.summary)}
tags:
${formatYamlList(input.tags)}
draft: ${input.draft}
---

${input.body.trim()}
`;
}

export function renderMarkdownPreview(markdown: string): string {
  return markdown.trim()
    ? markdownPreviewRenderer.render(markdown)
    : '<p>본문 미리보기가 여기에 표시됩니다.</p>';
}

function formatYamlList(items: string[]): string {
  if (items.length === 0) {
    return '  []';
  }

  return items.map((item) => `  - ${escapeYamlScalar(item)}`).join('\n');
}

function escapeYamlScalar(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '""';
  }

  if (/[:[\]{}#,\n]|^\s|\s$|^[-?]/.test(trimmed)) {
    return JSON.stringify(trimmed);
  }

  return trimmed;
}
