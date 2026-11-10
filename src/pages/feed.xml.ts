import type { APIContext } from "astro";

import { createGenusFeed, writeAtomFeed } from "../data/feed.ts";
import { getSiteData } from "../data/site-data.ts";

// How many genera the feed lists.
const feedLength = 50;

/**
 * Write feed.xml: an Atom feed of the most recently named genera, for feed readers. Its
 * addresses must be absolute, so local builds without SITE_URL use the preview server's.
 *
 * @param context - The build context, with the site's address when it is set.
 * @returns The feed.
 */
export function GET(context: APIContext): Response
{
    const siteUrl = new URL(import.meta.env.BASE_URL, context.site ?? "http://localhost:4321").href;

    return new Response(writeAtomFeed(createGenusFeed(getSiteData(), siteUrl, feedLength)), {
        headers: { "Content-Type": "application/atom+xml" },
    });
}
