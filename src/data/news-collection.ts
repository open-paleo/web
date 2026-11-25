import { getCollection } from "astro:content";

import type { NewsPost } from "./news.ts";
import { findNewsSlugProblem, resolveSitePaths, sortNewsPosts } from "./news.ts";

// Reads the news collection (src/content.config.ts) once per build. Kept apart from news.ts,
// which tests import, because astro:content exists only inside Astro.

let cachedPosts: Array<NewsPost> | undefined;

/**
 * Get the news posts, newest first, leaving out drafts. Each post's root paths are put below the
 * site's base.
 *
 * @returns The posts.
 * @throws When a post's file name can't be its address.
 */
export async function getNewsPosts(): Promise<Array<NewsPost>>
{
    if (!cachedPosts)
    {
        const baseUrl = import.meta.env.BASE_URL;
        const posts = new Array<NewsPost>();

        for (const entry of await getCollection("news"))
        {
            const problem = findNewsSlugProblem(entry.id);

            if (problem !== "")
            {
                throw new Error(problem);
            }

            if (!entry.data.draft)
            {
                posts.push({
                    slug: entry.id,
                    title: entry.data.title,
                    date: entry.data.date,
                    author: entry.data.author,
                    summary: entry.data.summary ?? "",
                    html: resolveSitePaths(entry.rendered?.html ?? "", baseUrl),
                });
            }
        }

        cachedPosts = sortNewsPosts(posts);
    }

    return cachedPosts;
}
