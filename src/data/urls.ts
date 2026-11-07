/**
 * The sections of the site that have one page per record.
 */
export type PageSection = "genus" | "clade" | "reference";

/**
 * Create the path of a record's page: "/genus/tyrannosaurus/", or "/web/genus/tyrannosaurus/"
 * when the site is published under /web/.
 *
 * @param baseUrl - The site's base path, from import.meta.env.BASE_URL.
 * @param section - The kind of record.
 * @param slug - The record's slug.
 * @returns The path, with a trailing slash.
 */
export function createPagePath(baseUrl: string, section: PageSection, slug: string): string
{
    const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";

    return base + section + "/" + slug + "/";
}

/**
 * Create the id of a reference's entry in a page's reference list, so citations elsewhere on
 * the page can link to it.
 *
 * @param slug - The reference's slug.
 * @returns The element id, such as "reference-osborn1905a".
 */
export function createReferenceAnchor(slug: string): string
{
    return "reference-" + slug;
}
