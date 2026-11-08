import type { GeologicTimeline } from "./age-figure.ts";
import { findEpochAt } from "./age-figure.ts";
import type { Period } from "./dataset.ts";
import { getTypeSpecies } from "./records.ts";
import type { CladeEntry, GenusEntry, SiteData } from "./site-data.ts";

/**
 * List every genus placed in a clade or in any clade below it, sorted by name.
 *
 * @param clade - The clade.
 * @param siteData - The lookup tables.
 * @returns The genera.
 */
export function listDescendantGenera(clade: CladeEntry, siteData: SiteData): Array<GenusEntry>
{
    const names = new Array<string>();
    const pending = [clade];

    while (pending.length > 0)
    {
        const current = pending.pop() as CladeEntry;

        for (const name of current.genusNames)
        {
            names.push(name);
        }

        for (const childName of current.childCladeNames)
        {
            const child = siteData.cladeByName.get(childName);

            if (child)
            {
                pending.push(child);
            }
        }
    }

    const genera = new Array<GenusEntry>();

    for (const name of names)
    {
        const entry = siteData.genusByName.get(name);

        if (entry)
        {
            genera.push(entry);
        }
    }

    genera.sort((first, second) => first.name.localeCompare(second.name, "en"));

    return genera;
}

/**
 * Work out the span of time a set of genera covers, from the oldest type species to the
 * youngest, as a period block the age figure can draw.
 *
 * @param genera - The genera.
 * @param timeline - The arranged timescale, for naming the epochs at each end.
 * @returns The span, or undefined when no genus has a numeric age.
 */
export function createAgeSpan(genera: Array<GenusEntry>, timeline: GeologicTimeline | undefined): Period | undefined
{
    let fromMa = -Infinity;
    let toMa = Infinity;

    for (const genus of genera)
    {
        const period = getTypeSpecies(genus.record).period;

        if (period.from_ma !== undefined && period.to_ma !== undefined)
        {
            fromMa = Math.max(fromMa, period.from_ma);
            toMa = Math.min(toMa, period.to_ma);
        }
    }

    if (fromMa === -Infinity)
    {
        return undefined;
    }

    const names = new Array<string>();
    const startEpoch = timeline ? findEpochAt(timeline, fromMa, "start") : undefined;
    const endEpoch = timeline ? findEpochAt(timeline, toMa, "end") : undefined;

    if (startEpoch)
    {
        names.push(startEpoch.name);
    }

    if (endEpoch && endEpoch !== startEpoch)
    {
        names.push(endEpoch.name);
    }

    return { from_ma: fromMa, to_ma: toMa, name: names as Period["name"] };
}

/**
 * List the genera placed directly in a clade, in the clade's order (by name).
 *
 * @param clade - The clade.
 * @param siteData - The lookup tables.
 * @returns The genera.
 */
export function listPlacedGenera(clade: CladeEntry, siteData: SiteData): Array<GenusEntry>
{
    const genera = new Array<GenusEntry>();

    for (const name of clade.genusNames)
    {
        const entry = siteData.genusByName.get(name);

        if (entry)
        {
            genera.push(entry);
        }
    }

    return genera;
}
