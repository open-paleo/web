import type { SiteData } from "./site-data.ts";

/**
 * List every name the tree extractor should recognize as a known taxon: each genus, each
 * species, their synonyms, and the name each species was first published under (its
 * erected_as, such as "Tyrannosaurus bataar" for Tarbosaurus bataar), sorted. The extractor
 * matches the labels it reads against these when a name is not in the figure's own list, and
 * keeps a tip's name as the figure prints it, so an older figure's name must be known too.
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

            if (species.erected_as)
            {
                names.add(species.erected_as);
            }

            for (const synonym of species.synonyms ?? [])
            {
                names.add(synonym.name);
            }
        }
    }

    return [...names].sort((first, second) => first.localeCompare(second, "en"));
}

/**
 * List every clade name the tree extractor should recognize: each clade with a record in the
 * dataset, sorted. The extractor uses these to mend the spelling of a clade's name read at a
 * node, on a shaded box, or at a tip that stands for a collapsed clade; it keeps them apart from
 * the taxon names, so a clade never competes with a genus for a tip.
 *
 * @param siteData - The lookup tables.
 * @returns The names, sorted.
 */
export function listKnownCladeNames(siteData: SiteData): Array<string>
{
    const names = new Array<string>();

    for (const clade of siteData.clades)
    {
        if (clade.record)
        {
            names.push(clade.name);
        }
    }

    return names.sort((first, second) => first.localeCompare(second, "en"));
}
