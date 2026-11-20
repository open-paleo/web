import type { GeologicTimeline } from "./age-figure.ts";
import { getPeriodName } from "./age-figure.ts";
import type { OpenPaleoDataset, Synonym } from "./dataset.ts";
import { formatUnitName } from "./format.ts";
import { loadDataset } from "./load-dataset.ts";
import type { SiteData } from "./site-data.ts";
import { getSiteData } from "./site-data.ts";
import { createSlug } from "./slugs.ts";
import type { TimePages } from "./time-pages.ts";
import { getTimePages } from "./time-pages.ts";
import type { UnitIndex } from "./units.ts";
import { getUnitPath, getUnits } from "./units.ts";

// Finds the pages that names in dataset prose link to: genera and species, clades, rock units,
// stages, epochs and periods.

/**
 * Where the names in prose link, by name.
 */
export type ProseLinkIndex = {
    /**
     * Each genus, species and synonym name, and each abbreviated species name that belongs to
     * only one species ("T. rex"), with the path of its page or section.
     */
    taxonPathByName: Map<string, string>;

    /**
     * Each clade, rock unit, stage, epoch and period name as prose writes it, with its path.
     */
    pathByName: Map<string, string>;

    /**
     * Matches any of those names as a whole word, longest first; undefined when there are none.
     */
    namePattern: RegExp | undefined;
};

/**
 * A run of prose that is either plain or a name with a page.
 */
export type NameSegment = {
    /**
     * The text of the run.
     */
    text: string;

    /**
     * The path the name links to, relative to the site's base; undefined for plain text and for
     * a name that stays plain.
     */
    path: string | undefined;

    /**
     * True when the run is a name with a page, linked or not. A name that stays plain (on its own
     * page, or already linked in the block) is still a name, so glossary terms aren't looked for
     * in it: "Formation" in "Hell Creek Formation".
     */
    isName: boolean;
};

let cachedLinks: ProseLinkIndex | undefined;

/**
 * Add a species' names, and the abbreviated form of each, to the taxon paths.
 *
 * @param names - Each name, with its path.
 * @param abbreviations - Each abbreviated name with its path, or "" once it is ambiguous.
 * @param name - The name: "Tyrannosaurus rex".
 * @param path - Its path.
 */
function addSpeciesName(names: Map<string, string>, abbreviations: Map<string, string>, name: string, path: string): void
{
    const words = name.split(/\s+/);

    if (!names.has(name))
    {
        names.set(name, path);
    }

    if (!names.has(words[0]))
    {
        names.set(words[0], path.split("#")[0]);
    }

    if (words.length < 2)
    {
        return;
    }

    const abbreviation = words[0].charAt(0) + ". " + words[1];
    const earlier = abbreviations.get(abbreviation);

    abbreviations.set(abbreviation, earlier === undefined || earlier === path ? path : "");
}

/**
 * Add synonyms' names to the taxon paths: a binomial as a species name, a single word as a genus.
 *
 * @param names - Each name, with its path.
 * @param abbreviations - Each abbreviated name with its path.
 * @param synonyms - The synonyms.
 * @param path - The path they lead to.
 */
function addSynonymNames(names: Map<string, string>, abbreviations: Map<string, string>, synonyms: Array<Synonym> | undefined, path: string): void
{
    for (const synonym of synonyms ?? [])
    {
        addSpeciesName(names, abbreviations, synonym.name, path);
    }
}

/**
 * Collect the paths of every genus, species and synonym name.
 *
 * @param dataset - The dataset.
 * @param siteData - The lookup tables.
 * @returns Each name, with its path.
 */
function createTaxonPaths(dataset: OpenPaleoDataset, siteData: SiteData): Map<string, string>
{
    const names = new Map<string, string>();
    const abbreviations = new Map<string, string>();

    // Add valid genera first, so a synonym can't replace a valid genus's path.
    for (const genus of siteData.genera)
    {
        names.set(genus.name, "genus/" + genus.slug + "/");
    }

    for (const genus of siteData.genera)
    {
        const genusPath = "genus/" + genus.slug + "/";

        addSynonymNames(names, abbreviations, dataset.genera[genus.name]?.synonyms, genusPath);

        for (const species of genus.record.species)
        {
            const speciesPath = genusPath + "#" + createSlug(species.name);

            addSpeciesName(names, abbreviations, species.name, speciesPath);
            addSynonymNames(names, abbreviations, species.synonyms, speciesPath);

            if (species.erected_as)
            {
                addSpeciesName(names, abbreviations, species.erected_as, speciesPath);
            }
        }
    }

    for (const [abbreviation, path] of abbreviations)
    {
        if (path !== "")
        {
            names.set(abbreviation, path);
        }
    }

    return names;
}

/**
 * Add a rock unit's names as prose writes them: its display name, with the rank word capitalized
 * or not ("Hell Creek Formation", "Hell Creek formation"), and the same for each variant.
 *
 * @param names - Each name, with its path.
 * @param display - The name as displayed.
 * @param path - Its path.
 */
function addUnitName(names: Map<string, string>, display: string, path: string): void
{
    names.set(display, path);

    const lowercased = display.replace(/ (Formation|Member|Group|Subgroup|Supergroup|Bed)$/u, (rank) => rank.toLowerCase());

    if (lowercased !== display)
    {
        names.set(lowercased, path);
    }
}

/**
 * Collect the paths of every clade, rock unit, stage, epoch and period with a page.
 *
 * @param siteData - The lookup tables.
 * @param units - The rock units.
 * @param timePages - The stage and period pages.
 * @param timeline - The arranged timescale, if the dataset has one.
 * @returns Each name, with its path.
 */
function createNamePaths(siteData: SiteData, units: UnitIndex, timePages: TimePages, timeline: GeologicTimeline | undefined): Map<string, string>
{
    const names = new Map<string, string>();

    for (const clade of siteData.clades)
    {
        if (clade.record)
        {
            names.set(clade.name, "clade/" + clade.slug + "/");
        }
    }

    for (const entry of units.entryByName.values())
    {
        const path = getUnitPath(units, entry.name);

        if (!path)
        {
            continue;
        }

        addUnitName(names, entry.displayName, path);

        for (const variant of entry.record.variants ?? [])
        {
            addUnitName(names, formatUnitName(variant, entry.record.rank, entry.record.informal === true), path);
        }
    }

    for (const stage of timePages.stages)
    {
        names.set(stage.name, "stage/" + stage.slug + "/");
    }

    for (const period of timePages.periods)
    {
        names.set(period.name, "period/" + period.slug + "/");
    }

    for (const epoch of timeline?.epochs ?? [])
    {
        if (timePages.periodByName.has(getPeriodName(epoch.name)))
        {
            names.set(epoch.name, "time/#" + createSlug(epoch.name));
        }
    }

    return names;
}

/**
 * Escape a name for use in a regular expression, letting a space match any white space.
 *
 * @param name - The name.
 * @returns The pattern source.
 */
function escapeName(name: string): string
{
    return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
}

/**
 * Arrange where names in prose link.
 *
 * @param dataset - The dataset.
 * @param siteData - The lookup tables.
 * @param units - The rock units.
 * @param timePages - The stage and period pages.
 * @returns The look-ups and the pattern that finds the names.
 */
export function createProseLinkIndex(dataset: OpenPaleoDataset, siteData: SiteData, units: UnitIndex, timePages: TimePages): ProseLinkIndex
{
    const pathByName = createNamePaths(siteData, units, timePages, siteData.timeline);
    const names = [...pathByName.keys()].sort((first, second) => second.length - first.length);
    const alternatives = new Array<string>();

    for (const name of names)
    {
        alternatives.push(escapeName(name));
    }

    // Letters, digits and hyphens on either side mean the name is part of something longer.
    const namePattern = alternatives.length > 0 ? new RegExp("(?<![\\p{L}\\p{N}-])(?:" + alternatives.join("|") + ")(?![\\p{L}\\p{N}-])", "gu") : undefined;

    return { taxonPathByName: createTaxonPaths(dataset, siteData), pathByName, namePattern };
}

/**
 * Find the path a genus or species name in prose links to.
 *
 * @param links - The look-ups.
 * @param name - The name as written, such as "Tyrannosaurus" or "T. rex".
 * @returns The path, relative to the site's base, or undefined.
 */
export function findTaxonPath(links: ProseLinkIndex, name: string): string | undefined
{
    return links.taxonPathByName.get(name.replace(/\s+/g, " "));
}

/**
 * Split prose into plain runs and the names of clades, rock units and geologic times. A name is
 * linked once per block: a path already in linkedPaths stays plain, and linked paths are added
 * to it. A name whose page is the current page stays plain too. A name that stays plain is still
 * a run of its own, marked as a name.
 *
 * @param links - The look-ups.
 * @param text - The text.
 * @param linkedPaths - The paths already linked in this block.
 * @param currentPath - The current page's path, relative to the site's base.
 * @returns The runs, in order.
 */
export function splitNamedLinks(links: ProseLinkIndex, text: string, linkedPaths: Set<string>, currentPath: string): Array<NameSegment>
{
    const segments = new Array<NameSegment>();
    const pattern = links.namePattern;

    if (!pattern)
    {
        segments.push({ text, path: undefined, isName: false });

        return segments;
    }

    let plainStart = 0;

    pattern.lastIndex = 0;

    for (let match = pattern.exec(text); match; match = pattern.exec(text))
    {
        const path = links.pathByName.get(match[0].replace(/\s+/g, " "));

        if (!path)
        {
            continue;
        }

        const isLinked = !linkedPaths.has(path) && path.split("#")[0] !== currentPath;

        if (match.index > plainStart)
        {
            segments.push({ text: text.slice(plainStart, match.index), path: undefined, isName: false });
        }

        segments.push({ text: match[0], path: isLinked ? path : undefined, isName: true });
        plainStart = match.index + match[0].length;

        if (isLinked)
        {
            linkedPaths.add(path);
        }
    }

    if (plainStart < text.length)
    {
        segments.push({ text: text.slice(plainStart), path: undefined, isName: false });
    }

    return segments;
}

/**
 * Load where names in prose link, once per build.
 *
 * @returns The look-ups.
 */
export function getProseLinks(): ProseLinkIndex
{
    cachedLinks ??= createProseLinkIndex(loadDataset(), getSiteData(), getUnits(), getTimePages());

    return cachedLinks;
}
