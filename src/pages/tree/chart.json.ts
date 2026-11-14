import { getSiteData } from "../../data/site-data.ts";
import { createTreeChart, findTreeTop } from "../../data/tree-chart.ts";

/**
 * Write tree/chart.json: the Tree page's chart, laid out from the dataset, which the page's
 * script loads to draw it.
 *
 * @returns The chart.
 */
export function GET(): Response
{
    const siteData = getSiteData();
    const top = findTreeTop(siteData);

    return new Response(JSON.stringify(top ? createTreeChart(top, siteData) : null), {
        headers: { "Content-Type": "application/json" },
    });
}
