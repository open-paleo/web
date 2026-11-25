import { formatAuthority } from "./format.ts";
import type { SiteData } from "./site-data.ts";
import { createSlug } from "./slugs.ts";
import type { UnitIndex } from "./units.ts";
import { getUnitPath } from "./units.ts";

/**
 * What a suggestion names. Genus and species names, and their synonyms, are set in italic;
 * clade names, references and news posts are not.
 */
export type SuggestionKind = "genus" | "species" | "clade" | "genus-synonym" | "species-synonym" | "clade-synonym" | "unit" | "reference" | "news";

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

    /**
     * More words the suggestion is found by, beyond its name: a reference's authors and title.
     * Absent for names, which are found by the name alone.
     */
    keywords?: string;
};

/**
 * Create the names the search fields suggest: every genus, species, clade with a page, and
 * synonym, each with the page it opens, then every rock unit shown on a page. A synonym opens
 * the record it is a synonym of; a member or bed opens its section on its unit's page.
 *
 * @param siteData - The lookup tables.
 * @param units - The rock units.
 * @returns The suggestions, genera first, in the order the dataset lists them.
 */
export function createSearchSuggestions(siteData: SiteData, units: UnitIndex): Array<SearchSuggestion>
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

    for (const page of units.pages)
    {
        for (const entry of [page.entry, ...page.sections])
        {
            suggestions.push({ name: entry.displayName, kind: "unit", path: getUnitPath(units, entry.name) ?? "", synonymOf: "", authority: "" });
        }
    }

    return suggestions;
}
