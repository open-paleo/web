import type { AtomFeed, FeedEntry } from "./feed.ts";

// The news posts in src/content/news/, arranged for the News pages and feed. Reading the
// collection needs Astro's runtime, so it happens in news-collection.ts; everything here works on
// plain values, so it can be tested.

/**
 * One news post, ready for the pages that show it.
 */
export type NewsPost = {
    /**
     * Its file name without ".md", which is its address: news/{slug}/.
     */
    slug: string;

    /**
     * The post's title.
     */
    title: string;

    /**
     * The day it was posted.
     */
    date: Date;

    /**
     * Who wrote it, as the front matter gives it: "Sarah Tolsma".
     */
    author: string;

    /**
     * A summary for the News page and feed, from the front matter; empty when the post has none,
     * and its first paragraph is used instead.
     */
    summary: string;

    /**
     * The post rendered as HTML, from the repository's own Markdown.
     */
    html: string;
};

/**
 * How many posts each page of the News list shows.
 */
export const newsPageSize = 10;

/**
 * How many posts the news feed lists.
 */
export const newsFeedLength = 20;

/**
 * Sort posts newest first, and posts of the same day by title.
 *
 * @param posts - The posts, in any order.
 * @returns A sorted copy.
 */
export function sortNewsPosts(posts: Array<NewsPost>): Array<NewsPost>
{
    const sorted = [...posts];

    sorted.sort((first, second) => second.date.getTime() - first.date.getTime() || first.title.localeCompare(second.title, "en"));

    return sorted;
}

/**
 * Find the first paragraph of a post's HTML, for the News list.
 *
 * @param html - The post's HTML.
 * @returns The first `<p>` element with its contents, or an empty string when there is none.
 */
export function findFirstParagraph(html: string): string
{
    const match = /<p\b[^>]*>[\s\S]*?<\/p>/.exec(html);

    return match ? match[0] : "";
}

/**
 * Get the text of some HTML, for the feed and a page's description: tags removed, the entities
 * Markdown writes decoded, and runs of white space collapsed.
 *
 * @param html - The HTML.
 * @returns The text.
 */
export function getPlainText(html: string): string
{
    return html
        .replace(/<[^>]+>/g, "")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", "\"")
        .replaceAll("&#39;", "'")
        .replaceAll("&amp;", "&")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Get a post's summary as text: its front matter summary, or else its first paragraph.
 *
 * @param post - The post.
 * @returns The summary.
 */
export function getNewsSummary(post: NewsPost): string
{
    return post.summary !== "" ? post.summary : getPlainText(findFirstParagraph(post.html));
}

/**
 * Format a post's date for readers: "November 24, 2026". Dates are read as UTC, as the front
 * matter writes them.
 *
 * @param date - The date.
 * @returns The date in words.
 */
export function formatNewsDate(date: Date): string
{
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/**
 * Format a post's date for a `<time>` element's `datetime` attribute: "2026-11-24".
 *
 * @param date - The date.
 * @returns The date in ISO 8601 form.
 */
export function formatNewsDateValue(date: Date): string
{
    return date.toISOString().slice(0, 10);
}

/**
 * Create the news feed: the newest posts, each with its summary.
 *
 * @param posts - The posts, newest first.
 * @param siteUrl - The site's home page address, ending in "/".
 * @param count - How many posts the feed lists.
 * @param author - Who the feed is by: the dataset's attribution.
 * @param emptyUpdated - When the feed last changed if it has no posts, as an ISO 8601 timestamp.
 * @returns The feed.
 */
export function createNewsFeed(posts: Array<NewsPost>, siteUrl: string, count: number, author: string, emptyUpdated: string): AtomFeed
{
    const entries = new Array<FeedEntry>();

    for (const post of posts.slice(0, count))
    {
        const url = new URL("news/" + post.slug + "/", siteUrl).href;

        entries.push({ id: url, title: post.title, url, updated: post.date.toISOString(), summary: getNewsSummary(post), author: post.author });
    }

    const feedUrl = new URL("news.xml", siteUrl).href;

    return {
        id: feedUrl,
        title: "Open Paleo: news",
        siteUrl: new URL("news/", siteUrl).href,
        feedUrl,
        updated: entries.length > 0 ? entries[0].updated : emptyUpdated,
        author,
        entries,
    };
}

/**
 * One post in the list the News page's find field searches.
 */
export type NewsIndexEntry = {
    /**
     * The post's title.
     */
    title: string;

    /**
     * Its page, below the site's base: "news/genus-infoboxes/".
     */
    path: string;

    /**
     * Its date in words: "November 24, 2026".
     */
    date: string;

    /**
     * Its summary, so words from it find the post too.
     */
    summary: string;
};

/**
 * Create the list the News page's find field searches: every post, on any page of the list.
 *
 * @param posts - The posts, newest first.
 * @returns One entry a post, in the same order.
 */
export function createNewsIndex(posts: Array<NewsPost>): Array<NewsIndexEntry>
{
    const entries = new Array<NewsIndexEntry>();

    for (const post of posts)
    {
        entries.push({ title: post.title, path: "news/" + post.slug + "/", date: formatNewsDate(post.date), summary: getNewsSummary(post) });
    }

    return entries;
}

/**
 * Put the site's base in front of the root paths a post links to, so a post can link to
 * "/genus/tyrannosaurus/" and the link works wherever the site is published, and in the post's
 * excerpt on the News list as well as in the post. Addresses with a scheme or host, such as
 * "https://…" and "//…", are left alone.
 *
 * @param html - The post's HTML.
 * @param baseUrl - The site's base path, ending in "/".
 * @returns The HTML with its root paths below the base.
 */
export function resolveSitePaths(html: string, baseUrl: string): string
{
    return html.replace(/\b(href|src)="\/(?!\/)/g, "$1=\"" + baseUrl);
}

/**
 * Check that a post's file name can be its address: a number would take the address of a page of
 * the News list ("news/2/").
 *
 * @param slug - The post's file name without ".md".
 * @returns Why the name can't be used, or an empty string when it can.
 */
export function findNewsSlugProblem(slug: string): string
{
    return /^\d+$/.test(slug) ? "The news post \"" + slug + ".md\" needs a name that isn't a number; news/" + slug + "/ is a page of the News list." : "";
}
