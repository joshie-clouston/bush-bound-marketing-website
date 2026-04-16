import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const services = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/data/services' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    headline: z.string().optional(),
    category: z.enum(['troopy', 'van', '4wd']),
    categoryLabel: z.string(),
    features: z.array(z.string()).default([]),
    vehicles: z.array(z.string()).default([]),
    priceRange: z.string().optional(),
    turnaround: z.string().optional(),
    heroImage: z.string().optional(),
    heroCaption: z.string().optional(),
    heroImages: z.array(z.string()).default([]),
    heroDisclaimer: z.string().optional(),
    order: z.number().default(0),
    isCategory: z.boolean().default(false),
    parentCategory: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { services };
