/**
 * The sections of the site that have one page per record.
 */
export type PageSection = "genus" | "clade" | "reference" | "stage" | "period" | "unit";

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
 * Create the path of a genus's infobox, the page other sites embed: "/embed/genus/tyrannosaurus/".
 *
 * @param baseUrl - The site's base path, from import.meta.env.BASE_URL.
 * @param slug - The genus slug.
 * @returns The path, with a trailing slash.
 */
export function createGenusEmbedPath(baseUrl: string, slug: string): string
{
    const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";

    return base + "embed/genus/" + slug + "/";
}

/**
 * Create the path of a genus's link preview image: "/preview/genus/tyrannosaurus.png". The build
 * makes it from the page at the same path without ".png" (src/data/preview-image.ts).
 *
 * @param baseUrl - The site's base path, from import.meta.env.BASE_URL.
 * @param slug - The genus slug.
 * @returns The path.
 */
export function createGenusPreviewImagePath(baseUrl: string, slug: string): string
{
    const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";

    return base + "preview/genus/" + slug + ".png";
}

/**
 * Create the absolute address of a record's page: "https://open-paleo.org/genus/tyrannosaurus/".
 *
 * @param siteUrl - The site's address with its base path: "https://open-paleo.org/", or
 * "https://open-paleo.github.io/web/" when the site is published under /web/.
 * @param section - The kind of record.
 * @param slug - The record's slug.
 * @returns The address, with a trailing slash.
 */
export function createPageUrl(siteUrl: URL, section: PageSection, slug: string): string
{
    return new URL(createPagePath(siteUrl.pathname, section, slug), siteUrl).href;
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

/**
 * The kinds of record a reader can report an error in.
 */
export type CorrectionRecordKind = "Genus" | "Clade" | "Reference" | "Rock unit";

// The issue form in open-paleo/data for reporting errors (.github/ISSUE_TEMPLATE/correction.yml).
// Its file name and the field ids "record" and "page" are what these links fill in, so they must
// stay as they are there.
const correctionIssueUrl = "https://github.com/open-paleo/data/issues/new";
const correctionTemplate = "correction.yml";

/**
 * Create the address of a new issue in open-paleo/data reporting an error in a record, with the
 * issue form's title, record and page already filled in.
 *
 * @param kind - The kind of record.
 * @param name - The record's name: "Tyrannosaurus", or for a reference its key and citation.
 * @param pageUrl - The page's address on the site, or an empty string when it is not known.
 * @returns The address.
 */
export function createCorrectionUrl(kind: CorrectionRecordKind, name: string, pageUrl: string): string
{
    const parameters = new URLSearchParams();

    parameters.set("template", correctionTemplate);
    parameters.set("title", "Correction: " + name);
    parameters.set("record", kind + ": " + name);

    if (pageUrl !== "")
    {
        parameters.set("page", pageUrl);
    }

    return correctionIssueUrl + "?" + parameters.toString();
}
