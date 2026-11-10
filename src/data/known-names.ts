import type { SiteData } from "./site-data.ts";

/**
 * List every name the tree extractor should recognize as a known taxon: each genus, each
 * species, and their synonyms, sorted. The extractor matches the labels it reads against these
 * when a name is not in the figure's own list.
 *
 * @param siteData - The lookup tables.
 * @returns The names, each once, sorted.
 */
export function listKnownTaxonNames(siteData: SiteData): Array<string>
{
    const names = new Set<string>();

    for (const genus of siteData.genera)
    {
        names.add(genus.name);

        for (const synonym of genus.record.synonyms ?? [])
        {
            names.add(synonym.name);
        }

        for (const species of genus.record.species)
        {
            names.add(species.name);

            for (const synonym of species.synonyms ?? [])
            {
                names.add(synonym.name);
            }
        }
    }

    return [...names].sort((first, second) => first.localeCompare(second, "en"));
}
