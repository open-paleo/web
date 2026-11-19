import { getUnits } from "../data/units.ts";

// Keeps redirect pages out of the sitemap.

/**
 * Create the sitemap's filter, which leaves out each member and bed's page: those only send
 * readers to the member or bed's section on its unit's page.
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

    return function isListed(page: string): boolean
    {
        return !redirectPaths.has(new URL(page).pathname);
    };
}
