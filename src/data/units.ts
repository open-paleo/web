import type { Location, OpenPaleoDataset, Reference, StratigraphicUnit } from "./dataset.ts";
import { formatUnitName } from "./format.ts";
import { loadDataset } from "./load-dataset.ts";
import type { GenusEntry, SiteData } from "./site-data.ts";
import { getSiteData } from "./site-data.ts";
import { createSlug } from "./slugs.ts";

// Arranges the dataset's rock units into pages: one per formation, group or other top-level
// unit with genera, holding its members and beds as sections.

/**
 * A rock unit, with where it is shown and what was found in it.
 */
export type UnitEntry = {
    /**
     * The unit's name, as species' locations give it.
     */
    name: string;

    /**
     * The unit's record.
     */
    record: StratigraphicUnit;

    /**
     * The name to display: "Hell Creek Formation", "Navajo Sandstone".
     */
    displayName: string;

    /**
     * The unit's own slug: its page's, or its section's anchor on its page.
     */
    slug: string;

    /**
     * The name of the unit whose page shows this one: itself, or for a member or bed, the
     * formation or other unit it sits in.
     */
    pageName: string;

    /**
     * The units directly within this one.
     */
    children: Array<UnitEntry>;

    /**
     * The genera with a species found in this unit itself, not in a unit within it.
     */
    genera: Array<GenusEntry>;
};

/**
 * A unit's page.
 */
export type UnitPage = {
    /**
     * The unit the page is about.
     */
    entry: UnitEntry;

    /**
     * The members and beds shown on the page, each before the units within it.
     */
    sections: Array<UnitEntry>;

    /**
     * The units within this one that have pages of their own, such as a group's formations.
     */
    subunitPages: Array<UnitEntry>;

    /**
     * Every genus found in the unit or a unit within it, sorted by name.
     */
    genera: Array<GenusEntry>;
};

/**
 * The rock units, arranged for pages.
 */
export type UnitIndex = {
    /**
     * Every unit, by name.
     */
    entryByName: Map<string, UnitEntry>;

    /**
     * The pages, sorted by display name.
     */
    pages: Array<UnitPage>;

    /**
     * Each page, by its unit's name.
     */
    pageByName: Map<string, UnitPage>;
};

// Ranks shown as sections on their parent unit's page.
const sectionRanks = new Set(["member", "bed"]);

// The longest chain of parent units to follow; a longer one means the data has a loop.
const maximumDepth = 10;

/**
 * Find the most specific unit a location names: its bed, else its member, formation or group.
 *
 * @param location - The location.
 * @returns The unit's name, or undefined if none is recorded.
 */
export function findLocationUnit(location: Location | undefined): string | undefined
{
    return location?.bed ?? location?.member ?? location?.formation ?? location?.group;
}

/**
 * Find the unit whose page shows a unit: the unit itself, or the nearest unit above a member or
 * bed that is not one.
 *
 * @param stratigraphy - The units, by name.
 * @param name - The unit's name.
 * @returns The name of the unit with the page.
 */
function findPageUnitName(stratigraphy: Record<string, StratigraphicUnit>, name: string): string
{
    let current = name;

    for (let depth = 0; depth < maximumDepth; depth++)
    {
        const record = stratigraphy[current];
        const parent = record?.parent;

        if (!record || !sectionRanks.has(record.rank ?? "") || !parent || !stratigraphy[parent])
        {
            return current;
        }

        current = parent;
    }

    return current;
}

/**
 * Add a unit's sections to a page, each followed by the units within it.
 *
 * @param entry - The unit whose children to add.
 * @param sections - The page's sections so far.
 */
function addSections(entry: UnitEntry, sections: Array<UnitEntry>): void
{
    for (const child of entry.children)
    {
        if (child.pageName !== child.name)
        {
            sections.push(child);
            addSections(child, sections);
        }
    }
}

/**
 * Add the genera found in a unit and every unit within it.
 *
 * @param entry - The unit.
 * @param genera - The genera so far, by name.
 * @param depth - How far below the page's unit this one is.
 */
function addGenera(entry: UnitEntry, genera: Map<string, GenusEntry>, depth: number): void
{
    for (const genus of entry.genera)
    {
        genera.set(genus.name, genus);
    }

    if (depth >= maximumDepth)
    {
        return;
    }

    for (const child of entry.children)
    {
        addGenera(child, genera, depth + 1);
    }
}

/**
 * Arrange the dataset's rock units into pages. A unit gets a page if a genus was found in it or
 * in a unit within it; members and beds appear on the page of the unit they sit in.
 *
 * @param dataset - The dataset.
 * @param siteData - The site's lookup tables, for the genera.
 * @returns The units and their pages.
 */
export function createUnitIndex(dataset: OpenPaleoDataset, siteData: SiteData): UnitIndex
{
    const stratigraphy = dataset.stratigraphy ?? {};
    const entryByName = new Map<string, UnitEntry>();

    for (const [name, record] of Object.entries(stratigraphy))
    {
        entryByName.set(name, {
            name,
            record,
            displayName: formatUnitName(name, record.rank, record.informal === true),
            slug: createSlug(name),
            pageName: findPageUnitName(stratigraphy, name),
            children: [],
            genera: [],
        });
    }

    for (const entry of entryByName.values())
    {
        const parent = entry.record.parent ? entryByName.get(entry.record.parent) : undefined;

        if (parent)
        {
            parent.children.push(entry);
        }
    }

    for (const genus of siteData.genera)
    {
        const found = new Set<string>();

        for (const species of genus.record.species)
        {
            const name = findLocationUnit(species.location);
            const entry = name ? entryByName.get(name) : undefined;

            if (entry && !found.has(entry.name))
            {
                entry.genera.push(genus);
                found.add(entry.name);
            }
        }
    }

    const pages = new Array<UnitPage>();
    const pageByName = new Map<string, UnitPage>();

    for (const entry of entryByName.values())
    {
        if (entry.pageName !== entry.name)
        {
            continue;
        }

        const generaByName = new Map<string, GenusEntry>();

        addGenera(entry, generaByName, 0);

        if (generaByName.size === 0)
        {
            continue;
        }

        const sections = new Array<UnitEntry>();

        addSections(entry, sections);

        const genera = [...generaByName.values()].sort((first, second) => first.name.localeCompare(second.name, "en"));
        const page: UnitPage = { entry, sections, subunitPages: [], genera };

        pages.push(page);
        pageByName.set(entry.name, page);
    }

    // List each page's subunits only once every page exists, so a formation without genera, and
    // so without a page, isn't listed on its group's page.
    for (const page of pages)
    {
        for (const child of page.entry.children)
        {
            if (pageByName.has(child.name))
            {
                page.subunitPages.push(child);
            }
        }

        page.subunitPages.sort((first, second) => first.displayName.localeCompare(second.displayName, "en"));
    }

    pages.sort((first, second) => first.entry.displayName.localeCompare(second.entry.displayName, "en"));

    return { entryByName, pages, pageByName };
}

/**
 * Get the path of the page or section that shows a unit: "unit/hell-creek/", or
 * "unit/aguja/#abajo-shale" for a member. Units without a page have no path.
 *
 * @param units - The units.
 * @param name - The unit's name.
 * @returns The path, relative to the site's base, or undefined.
 */
export function getUnitPath(units: UnitIndex, name: string): string | undefined
{
    const entry = units.entryByName.get(name);
    const page = entry ? units.pageByName.get(entry.pageName) : undefined;

    if (!entry || !page)
    {
        return undefined;
    }

    const pagePath = "unit/" + page.entry.slug + "/";

    return entry.pageName === entry.name ? pagePath : pagePath + "#" + entry.slug;
}

let cachedUnits: UnitIndex | undefined;

/**
 * Load the rock units and arrange them for pages, once per build.
 *
 * @returns The units and their pages.
 */
export function getUnits(): UnitIndex
{
    cachedUnits ??= createUnitIndex(loadDataset(), getSiteData());

    return cachedUnits;
}

/**
 * Get the references a unit's page lists: the unit's own, then each section's that are not
 * already listed, so the sections' citations link to an entry on the page.
 *
 * @param page - The page.
 * @returns The references, each once.
 */
export function getPageReferences(page: UnitPage): Array<Reference>
{
    const references = new Array<Reference>();
    const listed = new Set<string>();

    for (const unit of [page.entry, ...page.sections])
    {
        for (const reference of unit.record.references)
        {
            if (!listed.has(reference.id))
            {
                references.push(reference);
                listed.add(reference.id);
            }
        }
    }

    return references;
}

/**
 * Get the glossary term a unit's rank links to. A formation has an entry of its own and a bed
 * links to strata; the other ranks link to rock unit, whose definition explains them all. Their
 * bare words aren't glossary forms, since "member" or "group" would link every "a member of" and
 * "a group of" in the dataset's prose.
 *
 * @param record - The unit.
 * @returns The term to look up: "formation", "strata" or "rock unit".
 */
export function getUnitRankTerm(record: StratigraphicUnit): string
{
    if (record.rank === "formation")
    {
        return "formation";
    }
    else if (record.rank === "bed")
    {
        return "strata";
    }

    return "rock unit";
}

/**
 * Describe a unit's rank for display: "Formation", "Informal bed", or "Rock unit" when it has
 * none.
 *
 * @param record - The unit.
 * @returns The description.
 */
export function describeUnitRank(record: StratigraphicUnit): string
{
    if (!record.rank)
    {
        return record.informal ? "Informal rock unit" : "Rock unit";
    }

    return record.informal ? "Informal " + record.rank : record.rank.charAt(0).toUpperCase() + record.rank.slice(1);
}
