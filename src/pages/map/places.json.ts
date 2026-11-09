import { getMapShapes } from "../../data/genus-map.ts";
import { createSiteMapData } from "../../data/site-map.ts";
import { getSiteData } from "../../data/site-data.ts";

/**
 * Write map/places.json: every place a genus's type species was found, with its outline, and
 * every genus with the place it is counted in and its filter values. The Map page's script loads
 * it, so the page itself stays small and works without it.
 *
 * @returns The JSON response.
 */
export function GET(): Response
{
    const siteData = getSiteData();

    return new Response(JSON.stringify(createSiteMapData(siteData, siteData.timeline, getMapShapes())), {
        headers: { "Content-Type": "application/json" },
    });
}
