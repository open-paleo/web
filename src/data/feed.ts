import { formatAuthority, getFirstSentence } from "./format.ts";
import type { GenusEntry, SiteData } from "./site-data.ts";

/**
 * How many genera the feed lists. The Developers page states it.
 */
export const genusFeedLength = 50;

/**
 * One entry of an Atom feed: a newly named genus, or a news post.
 */
export type FeedEntry = {
    /**
     * The entry's lasting identity: its page's address.
     */
    id: string;

    /**
     * The genus name, or the post's title.
     */
    title: string;

    /**
     * Its page's address.
     */
    url: string;

    /**
     * When the entry was last updated, as an ISO 8601 timestamp: the release's build for a genus,
     * the post's date for a news post.
     */
    updated: string;

    /**
     * Authority and first sentence, "Smith et al., 2026. Xus is a genus of...", or the post's
     * summary.
     */
    summary: string;

    /**
     * Who wrote a news post: "Sarah Tolsma". Empty for a genus, whose entry is by the feed's
     * author.
     */
    author: string;
};

/**
 * An Atom feed, ready to write: the feed of newly named genera, or the news feed.
 */
export type AtomFeed = {
    /**
     * The feed's lasting identity: its own address.
     */
    id: string;

    /**
     * The feed's title.
     */
    title: string;

    /**
     * The site's home page, which the feed belongs to.
     */
    siteUrl: string;

    /**
     * The feed's own address.
     */
    feedUrl: string;

    /**
     * When the feed last changed, as an ISO 8601 timestamp. The genus feed and its entries are
     * dated by the release's build, since the dataset records the year a genus was named but not
     * when it was added; the news feed by its newest post.
     */
    updated: string;

    /**
     * Who the feed is by.
     */
    author: string;

    /**
     * The entries, newest first.
     */
    entries: Array<FeedEntry>;
};

/**
 * Get the most recently named genera: by year named, newest first, then by name.
 *
 * @param siteData - The lookup tables.
 * @param count - How many to list.
 * @returns The genera.
 */
export function getNewestGenera(siteData: SiteData, count: number): Array<GenusEntry>
{
    const genera = [...siteData.genera];

    genera.sort((first, second) => (second.record.described ?? 0) - (first.record.described ?? 0) || first.name.localeCompare(second.name, "en"));

    return genera.slice(0, count);
}

/**
 * Create the feed of the most recently named genera.
 *
 * @param siteData - The lookup tables.
 * @param siteUrl - The site's home page address, ending in "/".
 * @param count - How many genera the feed lists.
 * @returns The feed.
 */
export function createGenusFeed(siteData: SiteData, siteUrl: string, count: number): AtomFeed
{
    const entries = new Array<FeedEntry>();

    for (const genus of getNewestGenera(siteData, count))
    {
        const url = new URL("genus/" + genus.slug + "/", siteUrl).href;
        const authority = formatAuthority(genus.record.authors, genus.record.described, false);
        const firstSentence = getFirstSentence(genus.record.description);

        entries.push({ id: url, title: genus.name, url, updated: siteData.metadata.built_at, summary: authority ? authority + ". " + firstSentence : firstSentence, author: "" });
    }

    const feedUrl = new URL("feed.xml", siteUrl).href;

    return {
        id: feedUrl,
        title: "Open Paleo: newly named genera",
        siteUrl,
        feedUrl,
        updated: siteData.metadata.built_at,
        author: siteData.metadata.attribution,
        entries,
    };
}

/**
 * Escape text for XML content or a double-quoted attribute.
 *
 * @param text - The text.
 * @returns The escaped text.
 */
export function escapeXml(text: string): string
{
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}

/**
 * Write the feed as an Atom document.
 *
 * @param feed - The feed.
 * @returns The XML.
 */
export function writeAtomFeed(feed: AtomFeed): string
{
    const lines = [
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>",
        "<feed xmlns=\"http://www.w3.org/2005/Atom\">",
        "  <id>" + escapeXml(feed.id) + "</id>",
        "  <title>" + escapeXml(feed.title) + "</title>",
        "  <link rel=\"self\" type=\"application/atom+xml\" href=\"" + escapeXml(feed.feedUrl) + "\"/>",
        "  <link rel=\"alternate\" type=\"text/html\" href=\"" + escapeXml(feed.siteUrl) + "\"/>",
        "  <updated>" + escapeXml(feed.updated) + "</updated>",
        "  <author><name>" + escapeXml(feed.author) + "</name></author>",
    ];

    for (const entry of feed.entries)
    {
        lines.push(
            "  <entry>",
            "    <id>" + escapeXml(entry.id) + "</id>",
            "    <title>" + escapeXml(entry.title) + "</title>",
            "    <link rel=\"alternate\" type=\"text/html\" href=\"" + escapeXml(entry.url) + "\"/>",
            "    <updated>" + escapeXml(entry.updated) + "</updated>",
        );

        if (entry.author !== "")
        {
            lines.push("    <author><name>" + escapeXml(entry.author) + "</name></author>");
        }

        lines.push(
            "    <summary>" + escapeXml(entry.summary) + "</summary>",
            "  </entry>",
        );
    }

    lines.push("</feed>");

    return lines.join("\n") + "\n";
}
