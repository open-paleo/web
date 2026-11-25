import { getSiteData } from "../data/site-data.ts";
import { getCladeSynonymRedirects, getGenusSynonymRedirects } from "../data/synonym-redirects.ts";
import { getUnits } from "../data/units.ts";

// Keeps redirect pages, infoboxes and link preview image pages out of the sitemap.

/**
 * Create the sitemap's filter, which leaves out each member and bed's page, since those only send
 * readers to the member or bed's section on its unit's page; each genus and clade synonym's page,
 * which sends readers to the record it is a synonym of; the infoboxes other sites embed
 * (embed/), which repeat part of a genus page; and the pages the link preview images are drawn
 * from (preview/), which are removed once drawn.
 *
 * @param basePath - The site's base path, such as "/".
 * @returns A function that tells whether a page belongs in the sitemap.
 */
export function createSitemapFilter(basePath: string): (page: string) => boolean
{
    const redirectPaths = new Set<string>();

    for (const page of getUnits().pages)
    {
        for (const section of page.sections)
        {
            redirectPaths.add(basePath + "unit/" + section.slug + "/");
        }
    }

    for (const redirect of [...getGenusSynonymRedirects(getSiteData()), ...getCladeSynonymRedirects(getSiteData())])
    {
        redirectPaths.add(basePath + redirect.kind + "/" + redirect.slug + "/");
    }

    const embedPath = basePath + "embed/";
    const previewPath = basePath + "preview/";

    return function isListed(page: string): boolean
    {
        const pagePath = new URL(page).pathname;

        return !redirectPaths.has(pagePath) && !pagePath.startsWith(embedPath) && !pagePath.startsWith(previewPath);
    };
}
