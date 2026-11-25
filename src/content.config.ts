import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// The site's own content, written in this repository rather than read from the dataset. Each
// Markdown file in src/content/news/ is one news post; its file name is its address
// (news/{file name}/). See "News posts" in CONTRIBUTING.md.

/**
 * The news posts and the front matter each must have.
 */
const news = defineCollection({
    loader: glob({ pattern: "*.md", base: "./src/content/news" }),
    schema: z.object({
        title: z.string(),
        date: z.coerce.date(),
        author: z.string().min(1),
        summary: z.string().optional(),
        draft: z.boolean().default(false),
    }),
});

/**
 * The collections Astro builds.
 */
export const collections = { news };
