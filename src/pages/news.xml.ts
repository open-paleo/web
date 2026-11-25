import type { APIContext } from "astro";

import { writeAtomFeed } from "../data/feed.ts";
import { createNewsFeed, newsFeedLength } from "../data/news.ts";
import { getNewsPosts } from "../data/news-collection.ts";
import { getSiteData } from "../data/site-data.ts";

/**
 * Write news.xml: an Atom feed of the newest news posts, for feed readers. Its addresses must be
 * absolute, so local builds without SITE_URL use the preview server's.
 *
 * @param context - The build context, with the site's address when it is set.
 * @returns The feed.
 */
export async function GET(context: APIContext): Promise<Response>
{
    const siteUrl = new URL(import.meta.env.BASE_URL, context.site ?? "http://localhost:4321").href;
    const metadata = getSiteData().metadata;
    const feed = createNewsFeed(await getNewsPosts(), siteUrl, newsFeedLength, metadata.attribution, metadata.built_at);

    return new Response(writeAtomFeed(feed), {
        headers: { "Content-Type": "application/atom+xml" },
    });
}
