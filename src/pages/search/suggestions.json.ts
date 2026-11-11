import { createSearchSuggestions } from "../../data/search-suggestions.ts";
import { getSiteData } from "../../data/site-data.ts";

/**
 * Write search/suggestions.json: every genus, species, clade and synonym with the page it opens,
 * which the search fields load the first time a reader uses one.
 *
 * @returns The suggestions.
 */
export function GET(): Response
{
    return new Response(JSON.stringify(createSearchSuggestions(getSiteData())), {
        headers: { "Content-Type": "application/json" },
    });
}
