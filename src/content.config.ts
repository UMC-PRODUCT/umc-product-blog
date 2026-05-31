import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

import { PART_IDS, PLATFORM_IDS } from './lib/taxonomy';

const partSchema = z.enum(PART_IDS);
const platformSchema = z.enum(PLATFORM_IDS);

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    parts: z.array(partSchema).default([]),
    authors: z.array(z.string()).default([]),
    series: z
      .object({
        id: z.string(),
        order: z.number(),
      })
      .optional(),
    draft: z.boolean().default(false),
  }),
});

const releases = defineCollection({
  loader: glob({ base: './src/content/releases', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    version: z.string(),
    platform: platformSchema,
    releasedAt: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const members = defineCollection({
  loader: glob({ base: './src/content/members', pattern: '**/*.{json,yaml,yml}' }),
  schema: z.object({
    name: z.string(),
    nickname: z.string(),
    school: z.string(),
    profileImage: z.string().optional(),
    profileImageId: z.string().optional(),
    profileImageExtension: z.string().optional(),
    profileEmoji: z.string().optional(),
    bio: z.string(),
    parts: z.array(partSchema).default([]),
    participations: z
      .array(
        z.object({
          generation: z.string(),
          role: z.string().default('Member'),
          team: z.string().default('Member'),
          order: z.number().default(0),
        }),
      )
      .default([]),
  }),
});

const generations = defineCollection({
  loader: glob({
    base: './src/content/generations',
    pattern: '**/*.{json,yaml,yml}',
  }),
  schema: z.object({
    label: z.string(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    status: z.enum(['active', 'archived']).default('archived'),
    order: z.number().default(0),
  }),
});

const series = defineCollection({
  loader: glob({ base: './src/content/series', pattern: '**/*.{json,yaml,yml}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().default(0),
  }),
});

export const collections = { blog, releases, members, generations, series };
