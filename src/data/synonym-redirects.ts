import type { SiteData } from "./site-data.ts";
import { createSlug } from "./slugs.ts";

// Pages at a synonym's address, genus/{synonym}/ or clade/{synonym}/, so a reader who types or
// follows an old name reaches the record. A synonym of one record redirects to it; a synonym of
// several (a name whose fossils were split between genera) gets a short page linking to each.

/**
 * Whether a synonym names a genus or a clade, which sets the folder its page is in.
 */
export type SynonymKind = "genus" | "clade";

/**
 * A record a synonym leads to.
 */
export type SynonymTarget = {
    /**
     * The record's name: "Hypacrosaurus".
     */
    name: string;

    /**
     * Its page, below the site's base: "genus/hypacrosaurus/".
     */
    path: string;
};

/**
 * The page at one synonym's address.
 */
export type SynonymRedirect = {
    /**
     * The synonym's slug, its page's last path segment: "cheneosaurus".
     */
    slug: string;

    /**
     * The synonym as the dataset writes it: "Cheneosaurus".
     */
    name: string;

    /**
     * Whether it names a genus or a clade.
     */
    kind: SynonymKind;

    /**
     * The records it is a synonym of, in the dataset's order. One means the page redirects there.
     */
    targets: Array<SynonymTarget>;
};

/**
 * A synonym that redirects to a page, for the note that page shows after the redirect.
 */
export type RedirectSource = {
    /**
     * The synonym's slug, which the redirect passes as `?from=`.
     */
    slug: string;

    /**
     * The synonym as the dataset writes it.
     */
    name: string;
};

/**
 * The query parameter a synonym's redirect adds, naming the synonym by its slug.
 */
export const redirectSourceParameter = "from";

/**
 * The id of the synonyms section on genus and clade pages, which the "Redirected from" note links
 * to. Fixed, so the link survives a change to the section's heading.
 */
export const synonymsSectionId = "synonyms";

let cachedGenusRedirects: Array<SynonymRedirect> | undefined;
let cachedCladeRedirects: Array<SynonymRedirect> | undefined;

/**
 * Get the pages at genus synonyms' addresses, created once per build.
 *
 * @param siteData - The lookup tables.
 * @returns The pages, as createGenusSynonymRedirects() makes them.
 */
export function getGenusSynonymRedirects(siteData: SiteData): Array<SynonymRedirect>
{
    cachedGenusRedirects ??= createGenusSynonymRedirects(siteData);

    return cachedGenusRedirects;
}

/**
 * Get the pages at clade synonyms' addresses, created once per build.
 *
 * @param siteData - The lookup tables.
 * @returns The pages, as createCladeSynonymRedirects() makes them.
 */
export function getCladeSynonymRedirects(siteData: SiteData): Array<SynonymRedirect>
{
    cachedCladeRedirects ??= createCladeSynonymRedirects(siteData);

    return cachedCladeRedirects;
}

/**
 * Add a synonym and the record it is a synonym of to the redirects, under the synonym's slug.
 *
 * @param redirects - The redirects so far, by slug.
 * @param name - The synonym.
 * @param kind - Whether it names a genus or a clade.
 * @param target - The record it is a synonym of.
 */
function addSynonym(redirects: Map<string, SynonymRedirect>, name: string, kind: SynonymKind, target: SynonymTarget): void
{
    const slug = createSlug(name);
    const redirect = redirects.get(slug);

    if (!redirect)
    {
        redirects.set(slug, { slug, name, kind, targets: [target] });

        return;
    }

    for (const existing of redirect.targets)
    {
        if (existing.path === target.path)
        {
            return;
        }
    }

    redirect.targets.push(target);
}

/**
 * Create the pages at genus synonyms' addresses. A synonym whose slug is a genus page's keeps no
 * page of its own: the genus page keeps the address.
 *
 * @param siteData - The lookup tables.
 * @returns One page per synonym slug, in the dataset's order.
 */
export function createGenusSynonymRedirects(siteData: SiteData): Array<SynonymRedirect>
{
    const pageSlugs = new Set<string>();
    const redirects = new Map<string, SynonymRedirect>();

    for (const genus of siteData.genera)
    {
        pageSlugs.add(genus.slug);
    }

    for (const genus of siteData.genera)
    {
        for (const synonym of genus.record.synonyms ?? [])
        {
            addSynonym(redirects, synonym.name, "genus", { name: genus.name, path: "genus/" + genus.slug + "/" });
        }
    }

    return removePageSlugs(redirects, pageSlugs);
}

/**
 * Create the pages at clade synonyms' addresses, for clades with pages. A synonym whose slug is a
 * clade page's keeps no page of its own.
 *
 * @param siteData - The lookup tables.
 * @returns One page per synonym slug, in the dataset's order.
 */
export function createCladeSynonymRedirects(siteData: SiteData): Array<SynonymRedirect>
{
    const pageSlugs = new Set<string>();
    const redirects = new Map<string, SynonymRedirect>();

    for (const clade of siteData.clades)
    {
        if (clade.record)
        {
            pageSlugs.add(clade.slug);
        }
    }

    for (const clade of siteData.clades)
    {
        if (clade.record)
        {
            for (const synonym of clade.record.synonyms ?? [])
            {
                addSynonym(redirects, synonym.name, "clade", { name: clade.name, path: "clade/" + clade.slug + "/" });
            }
        }
    }

    return removePageSlugs(redirects, pageSlugs);
}

/**
 * Leave out the redirects whose slug a record's page already has.
 *
 * @param redirects - The redirects, by slug.
 * @param pageSlugs - The slugs of the records' pages in the same folder.
 * @returns The other redirects, in order.
 */
function removePageSlugs(redirects: Map<string, SynonymRedirect>, pageSlugs: Set<string>): Array<SynonymRedirect>
{
    const kept = new Array<SynonymRedirect>();

    for (const redirect of redirects.values())
    {
        if (!pageSlugs.has(redirect.slug))
        {
            kept.push(redirect);
        }
    }

    return kept;
}

/**
 * Find the synonyms that redirect to a page, for its "Redirected from" note. Synonyms of several
 * records don't redirect, so they aren't included.
 *
 * @param redirects - The synonym pages of the page's kind.
 * @param path - The page, below the site's base: "genus/hypacrosaurus/".
 * @returns The synonyms that redirect there.
 */
export function findRedirectSources(redirects: Array<SynonymRedirect>, path: string): Array<RedirectSource>
{
    const sources = new Array<RedirectSource>();

    for (const redirect of redirects)
    {
        if (redirect.targets.length === 1 && redirect.targets[0].path === path)
        {
            sources.push({ slug: redirect.slug, name: redirect.name });
        }
    }

    return sources;
}

/**
 * Create the address a synonym redirects to: its record's page, naming the synonym so the page can
 * say where the reader came from.
 *
 * @param baseUrl - The site's base path, ending in "/".
 * @param redirect - The synonym's page, with one target.
 * @returns The address: "/genus/hypacrosaurus/?from=cheneosaurus".
 */
export function createRedirectUrl(baseUrl: string, redirect: SynonymRedirect): string
{
    return baseUrl + redirect.targets[0].path + "?" + redirectSourceParameter + "=" + encodeURIComponent(redirect.slug);
}
