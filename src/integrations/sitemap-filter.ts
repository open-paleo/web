import { getUnits } from "../data/units.ts";

// Keeps redirect pages, infoboxes and link preview image pages out of the sitemap.

/**
 * Create the sitemap's filter, which leaves out each member and bed's page, since those only send
 * readers to the member or bed's section on its unit's page; the infoboxes other sites embed
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

    const embedPath = basePath + "embed/";
    const previewPath = basePath + "preview/";

    return function isListed(page: string): boolean
    {
        const pagePath = new URL(page).pathname;

        return !redirectPaths.has(pagePath) && !pagePath.startsWith(embedPath) && !pagePath.startsWith(previewPath);
    };
}
