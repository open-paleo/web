import * as fs from "node:fs";
import * as path from "node:path";

/**
 * What the link check needs from one built page: where its links point and which ids it has.
 */
export type SitePage = {
    /**
     * Every internal link target on the page, as written: "/genus/tyrannosaurus/", "#species".
     */
    links: Array<string>;

    /**
     * Every element id on the page, for checking the fragment of a link to it.
     */
    ids: Set<string>;
};

/**
 * A link in the built site that leads nowhere.
 */
export type BrokenLink = {
    /**
     * The page holding the link, relative to the site directory: "genus/tyrannosaurus/index.html".
     */
    page: string;

    /**
     * The link as written: "/clade/tyrannosauridae/#species".
     */
    href: string;

    /**
     * Why the link is broken.
     */
    reason: string;
};

/**
 * The result of checking every internal link in the built site.
 */
export type LinkReport = {
    /**
     * Number of pages read.
     */
    pageCount: number;

    /**
     * Number of internal links checked.
     */
    linkCount: number;

    /**
     * The links that lead nowhere, in page order.
     */
    brokenLinks: Array<BrokenLink>;
};

const hrefPattern = /\shref="([^"]*)"/g;
const idPattern = /\sid="([^"]*)"/g;

/**
 * Read the links and ids of one page's HTML. Links to other sites, mail addresses and the like
 * are left out: only links starting with "/" or "#" are internal.
 *
 * @param html - The page's HTML.
 * @returns The page's internal links and element ids.
 */
export function parseSitePage(html: string): SitePage
{
    const links = new Array<string>();
    const ids = new Set<string>();

    for (const match of html.matchAll(hrefPattern))
    {
        const href = match[1].replaceAll("&amp;", "&");

        if (href.startsWith("/") || href.startsWith("#"))
        {
            links.push(href);
        }
    }

    for (const match of html.matchAll(idPattern))
    {
        ids.add(match[1]);
    }

    return { links, ids };
}

/**
 * Read every HTML page of the built site. Pagefind's own files are skipped: they are generated
 * by Pagefind, not by the site.
 *
 * @param siteDirectory - The built site: "dist".
 * @returns The pages, keyed by their path relative to the site directory, with "/" separators.
 */
export function readSitePages(siteDirectory: string): Map<string, SitePage>
{
    const pages = new Map<string, SitePage>();
    const files = fs.readdirSync(siteDirectory, { recursive: true, encoding: "utf8" });

    files.sort();

    for (const file of files)
    {
        const pagePath = file.split(path.sep).join("/");

        if (!pagePath.endsWith(".html") || pagePath.startsWith("pagefind/"))
        {
            continue;
        }

        pages.set(pagePath, parseSitePage(fs.readFileSync(path.join(siteDirectory, file), "utf8")));
    }

    return pages;
}

/**
 * Find the file a URL path is served from: "/genus/tyrannosaurus/" is served from
 * "genus/tyrannosaurus/index.html".
 *
 * @param urlPath - The path part of a link, without query or fragment.
 * @param basePath - The path the site is served under, ending in "/": "/" or "/web/".
 * @returns The served file relative to the site directory, or undefined when the path is
 * outside the site.
 */
export function getServedFile(urlPath: string, basePath: string): string | undefined
{
    if (!urlPath.startsWith(basePath))
    {
        return undefined;
    }

    const relativePath = decodeURIComponent(urlPath.slice(basePath.length));

    return relativePath === "" || relativePath.endsWith("/") ? relativePath + "index.html" : relativePath;
}

/**
 * Check one link against the built site.
 *
 * @param href - The link as written.
 * @param page - The path of the page holding the link, relative to the site directory.
 * @param pages - Every built page, keyed by path.
 * @param fileExists - Whether a file other than a page (a stylesheet, a font) exists.
 * @param basePath - The path the site is served under.
 * @returns Why the link is broken, or undefined when it works.
 */
function findLinkProblem(
    href: string,
    page: string,
    pages: Map<string, SitePage>,
    fileExists: (file: string) => boolean,
    basePath: string,
): string | undefined
{
    const fragmentStart = href.indexOf("#");
    const fragment = fragmentStart === -1 ? "" : decodeURIComponent(href.slice(fragmentStart + 1));
    const target = fragmentStart === -1 ? href : href.slice(0, fragmentStart);
    const urlPath = target.split("?")[0];
    const file = urlPath === "" ? page : getServedFile(urlPath, basePath);

    if (file === undefined)
    {
        return "outside the site's base path " + basePath;
    }

    const targetPage = pages.get(file);

    if (!targetPage && !fileExists(file))
    {
        return "no page or file at " + file;
    }
    else if (fragment !== "" && targetPage && !targetPage.ids.has(fragment))
    {
        return "no element with id \"" + fragment + "\" on " + file;
    }

    return undefined;
}

/**
 * Check every internal link in the built site: the page or file it points to exists, and so
 * does the element its fragment names.
 *
 * @param pages - Every built page, keyed by path relative to the site directory.
 * @param fileExists - Whether a file other than a page exists, given its path relative to the
 * site directory.
 * @param basePath - The path the site is served under, ending in "/".
 * @returns The number of links checked and those that are broken.
 */
export function checkLinks(pages: Map<string, SitePage>, fileExists: (file: string) => boolean, basePath: string): LinkReport
{
    const brokenLinks = new Array<BrokenLink>();
    let linkCount = 0;

    for (const [page, sitePage] of pages)
    {
        for (const href of sitePage.links)
        {
            linkCount++;
            const reason = findLinkProblem(href, page, pages, fileExists, basePath);

            if (reason)
            {
                brokenLinks.push({ page, href, reason });
            }
        }
    }

    return { pageCount: pages.size, linkCount, brokenLinks };
}
