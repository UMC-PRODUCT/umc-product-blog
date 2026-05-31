import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { PART_IDS, PLATFORM_IDS } from './taxonomy';

export type ContentLintIssue = {
  path: string;
  message: string;
};

export type ContentLintOptions = {
  rootDir?: string;
};

type FrontmatterResult = {
  data: Record<string, unknown>;
  body: string;
};

const CONTENT_ROOT = 'src/content';
const COLLECTIONS = new Set(['blog', 'releases', 'members', 'generations', 'series']);
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const DATA_EXTENSIONS = new Set(['.json', '.yaml', '.yml']);
const DATED_SLUG_PATTERN = /^(\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.(?:md|mdx)$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VERSION_PREFIX_PATTERN = /^v[0-9]/;

export async function lintContent(options: ContentLintOptions = {}): Promise<ContentLintIssue[]> {
  const rootDir = options.rootDir ?? process.cwd();
  const contentDir = join(rootDir, CONTENT_ROOT);
  const files = await listFiles(contentDir);
  const memberIds = await collectMemberIds(contentDir);
  const seriesIds = await collectSeriesIds(contentDir);
  const seriesOrders = new Map<string, Map<number, string>>();
  const issues: ContentLintIssue[] = [];

  for (const filePath of files) {
    const relativePath = normalizePath(relative(rootDir, filePath));
    const contentRelativePath = normalizePath(relative(contentDir, filePath));
    const [collection] = contentRelativePath.split('/');

    if (!COLLECTIONS.has(collection)) {
      issues.push({
        path: relativePath,
        message: `Unsupported content directory "${collection}". Use blog, releases, members, generations, or series.`,
      });
      continue;
    }

    if (collection === 'blog') {
      await validateMarkdownFile({
        filePath,
        relativePath,
        collection,
        issues,
        validateFrontmatter: (frontmatter) =>
          validateBlog(frontmatter, relativePath, memberIds, seriesIds, seriesOrders),
      });
      continue;
    }

    if (collection === 'releases') {
      await validateMarkdownFile({
        filePath,
        relativePath,
        collection,
        issues,
        validateFrontmatter: (frontmatter) => validateRelease(frontmatter, relativePath),
      });
      continue;
    }

    validateDataFile({ filePath, relativePath, collection, issues });
  }

  return issues;
}

export function formatContentLintIssues(issues: ContentLintIssue[]): string {
  if (issues.length === 0) {
    return 'Content lint passed.';
  }

  return [
    `Content lint found ${issues.length} issue${issues.length === 1 ? '' : 's'}:`,
    ...issues.map((issue) => `- ${issue.path}: ${issue.message}`),
  ].join('\n');
}

async function validateMarkdownFile(input: {
  filePath: string;
  relativePath: string;
  collection: 'blog' | 'releases';
  issues: ContentLintIssue[];
  validateFrontmatter: (frontmatter: FrontmatterResult) => ContentLintIssue[];
}): Promise<void> {
  const { filePath, relativePath, collection, issues, validateFrontmatter } = input;
  const extension = extname(filePath);

  if (!MARKDOWN_EXTENSIONS.has(extension)) {
    issues.push({
      path: relativePath,
      message: `${capitalize(collection)} files must use .md or .mdx.`,
    });
    return;
  }

  if (dirname(relativePath) !== `${CONTENT_ROOT}/${collection}`) {
    issues.push({
      path: relativePath,
      message: `${capitalize(collection)} files must be placed directly under ${CONTENT_ROOT}/${collection}.`,
    });
  }

  const expectedFilenameMessage =
    collection === 'blog'
      ? 'Blog filename must follow yyyy-mm-dd-{slug}.md or .mdx with a lowercase URL-safe slug.'
      : 'Release filename must follow yyyy-mm-dd-{slug}.md or .mdx with a lowercase URL-safe slug.';

  if (!DATED_SLUG_PATTERN.test(basename(filePath))) {
    issues.push({
      path: relativePath,
      message: expectedFilenameMessage,
    });
  }

  const content = await readFile(filePath, 'utf8');
  const frontmatter = parseFrontmatter(content, relativePath, issues);

  if (!frontmatter) {
    return;
  }

  issues.push(...validateFrontmatter(frontmatter));
  validateBody(frontmatter, relativePath, issues, capitalizeSingular(collection));
  validateImageReferences(content, relativePath, issues);
}

function validateDataFile(input: {
  filePath: string;
  relativePath: string;
  collection: string;
  issues: ContentLintIssue[];
}): void {
  const { filePath, relativePath, collection, issues } = input;
  const extension = extname(filePath);

  if (!DATA_EXTENSIONS.has(extension)) {
    issues.push({
      path: relativePath,
      message: `${capitalize(collection)} files must use .json, .yaml, or .yml.`,
    });
  }

  if (dirname(relativePath) !== `${CONTENT_ROOT}/${collection}`) {
    issues.push({
      path: relativePath,
      message: `${capitalize(collection)} files must be placed directly under ${CONTENT_ROOT}/${collection}.`,
    });
  }
}

function validateBlog(
  frontmatter: FrontmatterResult,
  relativePath: string,
  memberIds: Set<string>,
  seriesIds: Set<string>,
  seriesOrders: Map<string, Map<number, string>>,
): ContentLintIssue[] {
  const issues: ContentLintIssue[] = [];
  const { data } = frontmatter;

  validateRequiredString(data.title, relativePath, 'Blog title is required.', issues);
  validateRequiredString(data.description, relativePath, 'Blog description is required.', issues);
  validateDateField(
    data.publishedAt,
    relativePath,
    'Blog publishedAt must use YYYY-MM-DD.',
    issues,
  );
  validateFilenameDate(relativePath, data.publishedAt, 'publishedAt', 'Blog', issues);
  validateOptionalBoolean(data.draft, relativePath, 'Blog draft must be a boolean.', issues);
  validateStringArray(data.tags, relativePath, 'Blog tags must be an array.', issues, {
    optional: true,
  });

  const parts = validateStringArray(
    data.parts,
    relativePath,
    'Blog parts must be an array.',
    issues,
  );
  if (parts.length === 0) {
    issues.push({ path: relativePath, message: 'Blog parts must include at least one part.' });
  }

  for (const part of parts) {
    if (!PART_IDS.includes(part as (typeof PART_IDS)[number])) {
      issues.push({ path: relativePath, message: `Unknown blog part "${part}".` });
    }
  }

  const authors = validateStringArray(
    data.authors,
    relativePath,
    'Blog authors must be an array.',
    issues,
  );
  if (authors.length === 0) {
    issues.push({ path: relativePath, message: 'Blog authors must include at least one author.' });
  }

  for (const author of authors) {
    if (!memberIds.has(author)) {
      issues.push({ path: relativePath, message: `Unknown blog author "${author}".` });
    }
  }

  validateBlogSeries(data.series, relativePath, seriesIds, seriesOrders, issues);

  return issues;
}

function validateBlogSeries(
  value: unknown,
  relativePath: string,
  seriesIds: Set<string>,
  seriesOrders: Map<string, Map<number, string>>,
  issues: ContentLintIssue[],
): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    issues.push({
      path: relativePath,
      message: 'Blog series must be an object with id and order.',
    });
    return;
  }

  const id = validateRequiredString(value.id, relativePath, 'Blog series id is required.', issues);
  const order = value.order;
  if (typeof order !== 'number' || !Number.isFinite(order)) {
    issues.push({ path: relativePath, message: 'Blog series order must be a number.' });
    return;
  }

  if (!id) {
    return;
  }

  if (!seriesIds.has(id)) {
    issues.push({ path: relativePath, message: `Unknown blog series "${id}".` });
    return;
  }

  const orderOwners = seriesOrders.get(id) ?? new Map<number, string>();
  const previousPath = orderOwners.get(order);
  if (previousPath) {
    issues.push({
      path: relativePath,
      message: `Duplicate blog series order ${order} for "${id}" already used by ${previousPath}.`,
    });
  } else {
    orderOwners.set(order, relativePath);
    seriesOrders.set(id, orderOwners);
  }
}

function validateRelease(frontmatter: FrontmatterResult, relativePath: string): ContentLintIssue[] {
  const issues: ContentLintIssue[] = [];
  const { data } = frontmatter;

  validateRequiredString(data.title, relativePath, 'Release title is required.', issues);
  const version = validateRequiredString(
    data.version,
    relativePath,
    'Release version is required.',
    issues,
  );
  if (version && !VERSION_PREFIX_PATTERN.test(version)) {
    issues.push({
      path: relativePath,
      message: 'Release version should start with "v", for example v1.0.0.',
    });
  }

  const platform = validateRequiredString(
    data.platform,
    relativePath,
    'Release platform is required.',
    issues,
  );
  if (platform && !PLATFORM_IDS.includes(platform as (typeof PLATFORM_IDS)[number])) {
    issues.push({ path: relativePath, message: `Unknown release platform "${platform}".` });
  }

  validateDateField(
    data.releasedAt,
    relativePath,
    'Release releasedAt must use YYYY-MM-DD.',
    issues,
  );
  validateFilenameDate(relativePath, data.releasedAt, 'releasedAt', 'Release', issues);
  validateRequiredString(data.summary, relativePath, 'Release summary is required.', issues);
  validateOptionalBoolean(data.draft, relativePath, 'Release draft must be a boolean.', issues);
  validateStringArray(data.tags, relativePath, 'Release tags must be an array.', issues, {
    optional: true,
  });

  return issues;
}

function parseFrontmatter(
  content: string,
  relativePath: string,
  issues: ContentLintIssue[],
): FrontmatterResult | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);

  if (!match) {
    issues.push({ path: relativePath, message: 'Markdown content must include frontmatter.' });
    return undefined;
  }

  try {
    const parsed = parseYaml(match[1]);
    if (!isRecord(parsed)) {
      issues.push({ path: relativePath, message: 'Frontmatter must be a YAML object.' });
      return undefined;
    }

    return {
      data: parsed,
      body: content.slice(match[0].length),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push({ path: relativePath, message: `Frontmatter YAML is invalid: ${message}` });
    return undefined;
  }
}

function validateRequiredString(
  value: unknown,
  relativePath: string,
  message: string,
  issues: ContentLintIssue[],
): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({ path: relativePath, message });
    return undefined;
  }

  return value.trim();
}

function validateStringArray(
  value: unknown,
  relativePath: string,
  message: string,
  issues: ContentLintIssue[],
  options: { optional?: boolean } = {},
): string[] {
  if (value === undefined && options.optional) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    issues.push({ path: relativePath, message });
    return [];
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function validateOptionalBoolean(
  value: unknown,
  relativePath: string,
  message: string,
  issues: ContentLintIssue[],
): void {
  if (value !== undefined && typeof value !== 'boolean') {
    issues.push({ path: relativePath, message });
  }
}

function validateDateField(
  value: unknown,
  relativePath: string,
  message: string,
  issues: ContentLintIssue[],
): string | undefined {
  const date = getDateOnly(value);

  if (!date) {
    issues.push({ path: relativePath, message });
  }

  return date;
}

function validateFilenameDate(
  relativePath: string,
  value: unknown,
  fieldName: string,
  label: 'Blog' | 'Release',
  issues: ContentLintIssue[],
): void {
  const date = getDateOnly(value);
  const filenameDate = /^(\d{4}-\d{2}-\d{2})-/.exec(basename(relativePath))?.[1];

  if (date && filenameDate && date !== filenameDate) {
    issues.push({
      path: relativePath,
      message: `${label} filename date must match ${fieldName}.`,
    });
  }
}

function validateBody(
  frontmatter: FrontmatterResult,
  relativePath: string,
  issues: ContentLintIssue[],
  label: string,
): void {
  if (!frontmatter.body.trim()) {
    issues.push({ path: relativePath, message: `${label} body is required.` });
  }
}

function validateImageReferences(
  content: string,
  relativePath: string,
  issues: ContentLintIssue[],
): void {
  if (/\bfile:/i.test(content)) {
    issues.push({ path: relativePath, message: 'Content images must not use file: URLs.' });
  }
}

function getDateOnly(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return undefined;
  }

  return value;
}

async function collectMemberIds(contentDir: string): Promise<Set<string>> {
  const memberDir = join(contentDir, 'members');
  const files = await listFiles(memberDir);

  return new Set(
    files
      .filter((filePath) => DATA_EXTENSIONS.has(extname(filePath)))
      .map((filePath) => basename(filePath, extname(filePath))),
  );
}

async function collectSeriesIds(contentDir: string): Promise<Set<string>> {
  const seriesDir = join(contentDir, 'series');
  const files = await listFiles(seriesDir);

  return new Set(
    files
      .filter((filePath) => DATA_EXTENSIONS.has(extname(filePath)))
      .map((filePath) => basename(filePath, extname(filePath))),
  );
}

async function listFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => !entry.name.startsWith('.'))
        .map((entry) => {
          const nextPath = join(dirPath, entry.name);

          return entry.isDirectory() ? listFiles(nextPath) : [nextPath];
        }),
    );

    return files.flat();
  } catch (error) {
    if (isErrorWithCode(error) && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isErrorWithCode(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function normalizePath(path: string): string {
  return path.split(sep).join('/');
}

function capitalize(value: string): string {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function capitalizeSingular(collection: 'blog' | 'releases'): string {
  return collection === 'blog' ? 'Blog' : 'Release';
}
