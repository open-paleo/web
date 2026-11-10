import { formatAuthority, getFirstSentence } from "./format.ts";
import type { GenusEntry, SiteData } from "./site-data.ts";

/**
 * One entry of the feed of newly named genera.
 */
export type FeedEntry = {
    /**
     * The entry's lasting identity: the genus page's address.
     */
    id: string;

    /**
     * The genus name.
     */
    title: string;

    /**
     * The genus page's address.
     */
    url: string;

    /**
     * Authority and first sentence: "Smith et al., 2026. Xus is a genus of...".
     */
    summary: string;
};

/**
 * The feed of newly named genera, ready to write as Atom.
 */
export type GenusFeed = {
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
     * When the dataset release was built, as an ISO 8601 timestamp; the feed and its entries are
     * dated by it, since the dataset records the year a genus was named but not when it was added.
     */
    updated: string;

    /**
     * Who the feed is by.
     */
    author: string;

    /**
     * The entries, newest names first.
     */
    entries: Array<FeedEntry>;
};

/**
 * List the most recently named genera: by year named, newest first, then by name.
 *
 * @param siteData - The lookup tables.
 * @param count - How many to list.
 * @returns The genera.
 */
export function listNewestGenera(siteData: SiteData, count: number): Array<GenusEntry>
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
export function createGenusFeed(siteData: SiteData, siteUrl: string, count: number): GenusFeed
{
    const entries = new Array<FeedEntry>();

    for (const genus of listNewestGenera(siteData, count))
    {
        const url = new URL("genus/" + genus.slug + "/", siteUrl).href;
        const authority = formatAuthority(genus.record.authors, genus.record.described, false);
        const firstSentence = getFirstSentence(genus.record.description);

        entries.push({ id: url, title: genus.name, url, summary: authority ? authority + ". " + firstSentence : firstSentence });
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
export function writeAtomFeed(feed: GenusFeed): string
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
            "    <updated>" + escapeXml(feed.updated) + "</updated>",
            "    <summary>" + escapeXml(entry.summary) + "</summary>",
            "  </entry>",
        );
    }

    lines.push("</feed>");

    return lines.join("\n") + "\n";
}
