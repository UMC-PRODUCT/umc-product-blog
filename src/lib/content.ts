import { MEMBER_TEAM_CATEGORY_ORDER } from './taxonomy';

export type ContentEntry<TData> = {
  id: string;
  data: TData;
};

export type MemberParticipation = {
  generation: string;
  role: string;
  team: string;
  order?: number;
};

export type MemberParticipationItem<TMember> = {
  member: TMember;
  participation: MemberParticipation;
};

export type TeamGroup<TMember> = {
  team: string;
  items: MemberParticipationItem<TMember>[];
};

export type SeriesReference = {
  id: string;
  order: number;
};

export type PostSeriesInfo<TPost, TSeries> = {
  series: TSeries;
  posts: TPost[];
  previous?: TPost;
  next?: TPost;
};

export function filterPublished<TEntry extends ContentEntry<{ draft?: boolean }>>(
  entries: TEntry[],
): TEntry[] {
  return entries.filter((entry) => entry.data.draft !== true);
}

export function sortByDateDesc<TEntry extends ContentEntry<Record<string, unknown>>>(
  entries: TEntry[],
  field: keyof TEntry['data'] & string,
): TEntry[] {
  return [...entries].sort((left, right) => {
    return getTime(right.data[field]) - getTime(left.data[field]);
  });
}

export function collectTags<TEntry extends ContentEntry<{ tags?: string[] }>>(
  entries: TEntry[],
): string[] {
  const tags = new Set<string>();

  for (const entry of entries) {
    for (const tag of entry.data.tags ?? []) {
      tags.add(tag);
    }
  }

  return [...tags].sort((left, right) => left.localeCompare(right));
}

export function filterByPart<TEntry extends ContentEntry<{ parts?: string[] }>>(
  entries: TEntry[],
  part?: string,
): TEntry[] {
  if (!part) {
    return entries;
  }

  return entries.filter((entry) => entry.data.parts?.includes(part));
}

export function filterByParts<TEntry extends ContentEntry<{ parts?: string[] }>>(
  entries: TEntry[],
  parts: readonly string[],
): TEntry[] {
  if (parts.length === 0) {
    return entries;
  }

  return entries.filter((entry) => {
    return entry.data.parts?.some((part) => parts.includes(part));
  });
}

export function filterByPlatform<TEntry extends ContentEntry<{ platform?: string }>>(
  entries: TEntry[],
  platform?: string,
): TEntry[] {
  if (!platform) {
    return entries;
  }

  return entries.filter((entry) => entry.data.platform === platform);
}

export function getBlogPartPath(part?: string): string {
  return part ? `/blog/sections/${part}` : '/blog';
}

export function getReleasePlatformPath(platform?: string): string {
  return platform ? `/releases/platforms/${platform}` : '/releases';
}

export function getSeriesPath(seriesId: string): string {
  return `/series/${seriesId}`;
}

export function resolveAuthors<
  TPost extends ContentEntry<{ authors?: string[] }>,
  TMember extends ContentEntry<unknown>,
>(post: TPost, members: TMember[]): TMember[] {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const resolved: TMember[] = [];
  const missing: string[] = [];

  for (const authorId of post.data.authors ?? []) {
    const member = memberById.get(authorId);

    if (!member) {
      missing.push(authorId);
      continue;
    }

    resolved.push(member);
  }

  if (missing.length > 0) {
    throw new Error(`Unknown blog authors for "${post.id}": ${missing.join(', ')}`);
  }

  return resolved;
}

export function getSeriesPosts<TPost extends ContentEntry<Record<string, unknown>>>(
  posts: TPost[],
  seriesId: string,
): TPost[] {
  return posts
    .filter((post) => getSeriesReference(post.data)?.id === seriesId)
    .sort((left, right) => {
      return (
        (getSeriesReference(left.data)?.order ?? 0) - (getSeriesReference(right.data)?.order ?? 0)
      );
    });
}

export function resolvePostSeries<
  TPost extends ContentEntry<Record<string, unknown>>,
  TSeries extends ContentEntry<unknown>,
>(
  post: TPost,
  posts: TPost[],
  seriesEntries: TSeries[],
): PostSeriesInfo<TPost, TSeries> | undefined {
  const seriesId = getSeriesReference(post.data)?.id;
  if (!seriesId) {
    return undefined;
  }

  const series = seriesEntries.find((entry) => entry.id === seriesId);
  if (!series) {
    return undefined;
  }

  const seriesPosts = getSeriesPosts(posts, seriesId);
  const currentIndex = seriesPosts.findIndex((seriesPost) => seriesPost.id === post.id);

  return {
    series,
    posts: seriesPosts,
    previous: currentIndex > 0 ? seriesPosts[currentIndex - 1] : undefined,
    next: currentIndex >= 0 ? seriesPosts[currentIndex + 1] : undefined,
  };
}

function getSeriesReference(data: Record<string, unknown>): SeriesReference | undefined {
  const value = data.series;
  if (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'order' in value &&
    typeof (value as SeriesReference).id === 'string' &&
    typeof (value as SeriesReference).order === 'number'
  ) {
    return value as SeriesReference;
  }

  return undefined;
}

export function selectDefaultGeneration<
  TGeneration extends ContentEntry<{ status?: string; order?: number }>,
>(generations: TGeneration[]): TGeneration | undefined {
  const sorted = [...generations].sort(compareGenerationOrderDesc);
  return sorted.find((generation) => generation.data.status === 'active') ?? sorted[0];
}

export function getMemberGenerationPath<TGeneration extends ContentEntry<unknown>>(
  generation: TGeneration,
): string {
  return `/members/${generation.id}`;
}

export function selectDefaultGenerationPath<
  TGeneration extends ContentEntry<{ status?: string; order?: number }>,
>(generations: TGeneration[]): string | undefined {
  const generation = selectDefaultGeneration(generations);
  return generation ? getMemberGenerationPath(generation) : undefined;
}

export function getMemberParticipationsForGeneration<
  TMember extends ContentEntry<{
    name?: string;
    nickname?: string;
    participations?: MemberParticipation[];
  }>,
>(members: TMember[], generationId: string): MemberParticipationItem<TMember>[] {
  const items: MemberParticipationItem<TMember>[] = [];

  for (const member of members) {
    for (const participation of member.data.participations ?? []) {
      if (participation.generation === generationId) {
        items.push({ member, participation });
      }
    }
  }

  return items.sort(compareParticipationItems);
}

export function groupParticipationsByTeam<TMember>(
  items: MemberParticipationItem<TMember>[],
): TeamGroup<TMember>[] {
  const groups = new Map<string, MemberParticipationItem<TMember>[]>();

  for (const item of items) {
    const team = item.participation.team || 'Member';
    groups.set(team, [...(groups.get(team) ?? []), item]);
  }

  return [...groups.entries()]
    .map(([team, groupItems]) => ({
      team,
      items: groupItems.sort(compareParticipationItems),
    }))
    .sort((left, right) => compareTeams(left.team, right.team));
}

function getTime(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value).getTime();
  }

  return 0;
}

function compareGenerationOrderDesc<TGeneration extends ContentEntry<{ order?: number }>>(
  left: TGeneration,
  right: TGeneration,
): number {
  return (right.data.order ?? 0) - (left.data.order ?? 0);
}

function compareParticipationItems<TMember>(
  left: MemberParticipationItem<TMember>,
  right: MemberParticipationItem<TMember>,
): number {
  const rolePriorityDelta =
    getRolePriority(left.participation.role) - getRolePriority(right.participation.role);

  if (rolePriorityDelta !== 0) {
    return rolePriorityDelta;
  }

  const orderDelta = (left.participation.order ?? 0) - (right.participation.order ?? 0);

  if (orderDelta !== 0) {
    return orderDelta;
  }

  return getMemberDisplayName(left.member).localeCompare(getMemberDisplayName(right.member));
}

function compareTeams(left: string, right: string): number {
  const leftIndex = MEMBER_TEAM_CATEGORY_ORDER.indexOf(
    left as (typeof MEMBER_TEAM_CATEGORY_ORDER)[number],
  );
  const rightIndex = MEMBER_TEAM_CATEGORY_ORDER.indexOf(
    right as (typeof MEMBER_TEAM_CATEGORY_ORDER)[number],
  );

  if (leftIndex !== -1 || rightIndex !== -1) {
    return normalizeTeamIndex(leftIndex) - normalizeTeamIndex(rightIndex);
  }

  return left.localeCompare(right);
}

function getRolePriority(role: string): number {
  if (/\bvice\s+lead\b/i.test(role)) {
    return 1;
  }

  if (/\blead\b/i.test(role)) {
    return 0;
  }

  return 1;
}

function normalizeTeamIndex(index: number): number {
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function getMemberDisplayName(member: unknown): string {
  if (isMemberEntry(member)) {
    return member.data.nickname ?? member.data.name ?? member.id;
  }

  return '';
}

function isMemberEntry(
  value: unknown,
): value is ContentEntry<{ name?: string; nickname?: string }> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'data' in value &&
    typeof (value as ContentEntry<unknown>).data === 'object'
  );
}
