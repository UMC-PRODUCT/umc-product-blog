import { describe, expect, it } from 'vitest';

import {
  collectTags,
  filterByPart,
  filterByParts,
  filterByPlatform,
  filterPublished,
  getBlogPartPath,
  getMemberGenerationPath,
  getMemberParticipationsForGeneration,
  getReleasePlatformPath,
  getSeriesPath,
  getSeriesPosts,
  groupParticipationsByTeam,
  resolveAuthors,
  resolvePostSeries,
  selectDefaultGeneration,
  selectDefaultGenerationPath,
  sortByDateDesc,
} from './content';

const entry = <TData>(id: string, data: TData) => ({ id, data });

describe('content helpers', () => {
  it('filters draft entries and sorts by date descending', () => {
    const posts = [
      entry('old', {
        title: 'Old',
        publishedAt: new Date('2026-01-01'),
        draft: false,
      }),
      entry('draft', {
        title: 'Draft',
        publishedAt: new Date('2026-03-01'),
        draft: true,
      }),
      entry('new', {
        title: 'New',
        publishedAt: new Date('2026-02-01'),
        draft: false,
      }),
    ];

    const visible = sortByDateDesc(filterPublished(posts), 'publishedAt');

    expect(visible.map((post) => post.id)).toEqual(['new', 'old']);
  });

  it('collects unique blog tags alphabetically', () => {
    const posts = [
      entry('astro', { tags: ['Astro', 'MDX'] }),
      entry('ios', { tags: ['SwiftUI', 'Astro'] }),
      entry('empty', { tags: [] }),
    ];

    expect(collectTags(posts)).toEqual(['Astro', 'MDX', 'SwiftUI']);
  });

  it('filters entries by selected part and builds blog part paths', () => {
    const posts = [
      entry('pm-retro', { parts: ['pm'] }),
      entry('ios-release', { parts: ['ios', 'server'] }),
      entry('web-design', { parts: ['web', 'design'] }),
    ];

    expect(filterByPart(posts, 'ios').map((post) => post.id)).toEqual(['ios-release']);
    expect(filterByPart(posts, 'design').map((post) => post.id)).toEqual(['web-design']);
    expect(filterByPart(posts).map((post) => post.id)).toEqual([
      'pm-retro',
      'ios-release',
      'web-design',
    ]);
    expect(getBlogPartPath()).toBe('/blog');
    expect(getBlogPartPath('server')).toBe('/blog/sections/server');
  });

  it('filters entries by grouped parts', () => {
    const posts = [
      entry('pm-retro', { parts: ['pm'] }),
      entry('ios-release', { parts: ['ios', 'server'] }),
      entry('web-design', { parts: ['web', 'design'] }),
      entry('empty', { parts: [] }),
    ];

    expect(filterByParts(posts, ['ios', 'web', 'server']).map((post) => post.id)).toEqual([
      'ios-release',
      'web-design',
    ]);
    expect(filterByParts(posts, ['pm']).map((post) => post.id)).toEqual(['pm-retro']);
    expect(filterByParts(posts, []).map((post) => post.id)).toEqual([
      'pm-retro',
      'ios-release',
      'web-design',
      'empty',
    ]);
  });

  it('filters entries by selected release platform and builds release platform paths', () => {
    const releases = [
      entry('ios-1', { platform: 'ios' }),
      entry('server-1', { platform: 'server' }),
      entry('web-1', { platform: 'web' }),
    ];

    expect(filterByPlatform(releases, 'ios').map((release) => release.id)).toEqual(['ios-1']);
    expect(filterByPlatform(releases, 'server').map((release) => release.id)).toEqual(['server-1']);
    expect(filterByPlatform(releases).map((release) => release.id)).toEqual([
      'ios-1',
      'server-1',
      'web-1',
    ]);
    expect(getReleasePlatformPath()).toBe('/releases');
    expect(getReleasePlatformPath('android')).toBe('/releases/platforms/android');
  });

  it('resolves authors in frontmatter order', () => {
    const post = entry('design-system', {
      authors: ['yujin', 'haneul'],
    });
    const members = [entry('haneul', { name: 'Haneul' }), entry('yujin', { name: 'Yujin' })];

    expect(resolveAuthors(post, members).map((member) => member.id)).toEqual(['yujin', 'haneul']);
  });

  it('sorts series posts and resolves previous and next posts', () => {
    const posts = [
      entry('part-2', { title: 'Part 2', series: { id: 'architecture', order: 2 } }),
      entry('other', { title: 'Other' }),
      entry('part-1', { title: 'Part 1', series: { id: 'architecture', order: 1 } }),
      entry('part-3', { title: 'Part 3', series: { id: 'architecture', order: 3 } }),
    ];
    const seriesEntries = [entry('architecture', { title: 'Architecture' })];

    expect(getSeriesPath('architecture')).toBe('/series/architecture');
    expect(getSeriesPosts(posts, 'architecture').map((post) => post.id)).toEqual([
      'part-1',
      'part-2',
      'part-3',
    ]);
    expect(resolvePostSeries(posts[0], posts, seriesEntries)).toMatchObject({
      previous: { id: 'part-1' },
      next: { id: 'part-3' },
    });
  });

  it('throws a clear error when a blog author id is missing', () => {
    const post = entry('missing-author-post', {
      authors: ['known', 'unknown'],
    });
    const members = [entry('known', { name: 'Known' })];

    expect(() => resolveAuthors(post, members)).toThrow(
      'Unknown blog authors for "missing-author-post": unknown',
    );
  });

  it('selects the highest-order active generation as the default', () => {
    const generations = [
      entry('6th', { label: '6기', order: 6, status: 'archived' }),
      entry('7th', { label: '7기', order: 7, status: 'active' }),
      entry('8th', { label: '8기', order: 8, status: 'active' }),
    ];

    expect(selectDefaultGeneration(generations)?.id).toBe('8th');
  });

  it('falls back to the highest-order generation when none are active', () => {
    const generations = [
      entry('6th', { label: '6기', order: 6, status: 'archived' }),
      entry('7th', { label: '7기', order: 7, status: 'archived' }),
    ];

    expect(selectDefaultGeneration(generations)?.id).toBe('7th');
  });

  it('builds the latest generation member route from the default generation', () => {
    const generations = [
      entry('6th', { label: '6기', order: 6, status: 'archived' }),
      entry('7th', { label: '7기', order: 7, status: 'active' }),
      entry('8th', { label: '8기', order: 8, status: 'active' }),
    ];

    expect(getMemberGenerationPath(generations[0])).toBe('/members/6th');
    expect(selectDefaultGenerationPath(generations)).toBe('/members/8th');
  });

  it('filters member participations by generation and groups by configured team category order', () => {
    const members = [
      entry('server-lead', {
        name: 'Server Lead',
        participations: [
          {
            generation: '7th',
            role: 'Lead',
            team: 'Server',
            order: 2,
          },
        ],
      }),
      entry('product-head', {
        name: 'Product Head',
        participations: [
          {
            generation: '7th',
            role: 'Vice Lead',
            team: 'Head of Product',
            order: 5,
          },
        ],
      }),
      entry('design-lead', {
        name: 'Design Lead',
        participations: [
          {
            generation: '7th',
            role: 'Lead',
            team: 'Design',
            order: 9,
          },
        ],
      }),
      entry('web-member', {
        name: 'Web Member',
        participations: [
          {
            generation: '7th',
            role: 'Member',
            team: 'Web',
            order: 1,
          },
        ],
      }),
      entry('ios-member', {
        name: 'iOS Member',
        participations: [
          {
            generation: '7th',
            role: 'Member',
            team: 'iOS',
            order: 1,
          },
        ],
      }),
      entry('android-member', {
        name: 'Android Member',
        participations: [
          {
            generation: '7th',
            role: 'Member',
            team: 'Android',
            order: 1,
          },
        ],
      }),
      entry('alumni', {
        name: 'Alumni',
        participations: [
          {
            generation: '6th',
            role: 'Member',
            team: 'Member',
            order: 1,
          },
        ],
      }),
    ];

    const groups = groupParticipationsByTeam(getMemberParticipationsForGeneration(members, '7th'));

    expect(groups.map((group) => group.team)).toEqual([
      'Head of Product',
      'Design',
      'Web',
      'iOS',
      'Android',
      'Server',
    ]);
  });

  it('sorts leads first inside the same team before member order', () => {
    const members = [
      entry('server-member', {
        nickname: 'B',
        participations: [
          {
            generation: '7th',
            role: 'Member',
            team: 'Server',
            order: 1,
          },
        ],
      }),
      entry('server-lead', {
        nickname: 'A',
        participations: [
          {
            generation: '7th',
            role: 'Lead',
            team: 'Server',
            order: 20,
          },
        ],
      }),
      entry('server-vice-lead', {
        nickname: 'C',
        participations: [
          {
            generation: '7th',
            role: 'Vice Lead',
            team: 'Server',
            order: 2,
          },
        ],
      }),
    ];

    const groups = groupParticipationsByTeam(getMemberParticipationsForGeneration(members, '7th'));

    expect(groups[0].items.map((item) => item.member.id)).toEqual([
      'server-lead',
      'server-member',
      'server-vice-lead',
    ]);
  });
});
