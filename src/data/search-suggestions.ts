import { formatAuthority } from "./format.ts";
import type { SiteData } from "./site-data.ts";
import { createSlug } from "./slugs.ts";

/**
 * What a suggestion names. Genus and species names, and their synonyms, are set in italic;
 * clade names are not.
 */
export type SuggestionKind = "genus" | "species" | "clade" | "genus-synonym" | "species-synonym" | "clade-synonym";

/**
 * One name the search fields suggest as the reader types.
 */
export type SearchSuggestion = {
    /**
     * The name: "Velociraptor", "Velociraptor mongoliensis", "Dynamosaurus".
     */
    name: string;

    /**
     * What it names.
     */
    kind: SuggestionKind;

    /**
     * Its page, below the site's base: "genus/velociraptor/", or with a species section's anchor,
     * "genus/velociraptor/#velociraptor-mongoliensis".
     */
    path: string;

    /**
     * For a synonym, the name it is a synonym of; otherwise an empty string.
     */
    synonymOf: string;

    /**
     * A genus's authority, to tell like names apart: "Osborn, 1905". Empty for other kinds.
     */
    authority: string;
};

/**
 * Create the names the search fields suggest: every genus, species, clade with a page, and
 * synonym, each with the page it opens. A synonym opens the record it is a synonym of.
 *
 * @param siteData - The lookup tables.
 * @returns The suggestions, genera first, in the order the dataset lists them.
 */
export function createSearchSuggestions(siteData: SiteData): Array<SearchSuggestion>
{
    const suggestions = new Array<SearchSuggestion>();

    for (const genus of siteData.genera)
    {
        const genusPath = "genus/" + genus.slug + "/";

        suggestions.push({
            name: genus.name,
            kind: "genus",
            path: genusPath,
            synonymOf: "",
            authority: formatAuthority(genus.record.authors, genus.record.described, false),
        });

        for (const synonym of genus.record.synonyms ?? [])
        {
            suggestions.push({ name: synonym.name, kind: "genus-synonym", path: genusPath, synonymOf: genus.name, authority: "" });
        }

        for (const species of genus.record.species)
        {
            const speciesPath = genusPath + "#" + createSlug(species.name);

            suggestions.push({ name: species.name, kind: "species", path: speciesPath, synonymOf: "", authority: "" });

            for (const synonym of species.synonyms ?? [])
            {
                suggestions.push({ name: synonym.name, kind: "species-synonym", path: speciesPath, synonymOf: species.name, authority: "" });
            }
        }
    }

    for (const clade of siteData.clades)
    {
        if (!clade.record)
        {
            continue;
        }

        const cladePath = "clade/" + clade.slug + "/";

        suggestions.push({ name: clade.name, kind: "clade", path: cladePath, synonymOf: "", authority: "" });

        for (const synonym of clade.record.synonyms ?? [])
        {
            suggestions.push({ name: synonym.name, kind: "clade-synonym", path: cladePath, synonymOf: clade.name, authority: "" });
        }
    }

    return suggestions;
}
