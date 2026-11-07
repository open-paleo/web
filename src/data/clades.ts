import type { GeologicTimeline } from "./age-figure.ts";
import { findEpochAt } from "./age-figure.ts";
import type { Period, Status } from "./dataset.ts";
import {
    formatAgeNumbers,
    formatAuthority,
    formatCountry,
    formatShortAge,
} from "./format.ts";
import { getTypeSpecies } from "./records.ts";
import type { CladeEntry, GenusEntry, SiteData } from "./site-data.ts";

/**
 * Where an age range sits on a horizontal scale, for a small range bar.
 */
export type RangeBarGeometry = {
    /**
     * Distance from the scale's older (left) end, as a percentage of the scale.
     */
    leftPercent: number;

    /**
     * Width as a percentage of the scale.
     */
    widthPercent: number;
};

/**
 * One row of a clade's genus table, with every cell formatted.
 */
export type CladeGenusRow = {
    /**
     * The genus.
     */
    entry: GenusEntry;

    /**
     * Authority: "Osborn, 1905".
     */
    authority: string;

    /**
     * Stages or periods of the type species: "Maastrichtian".
     */
    age: string;

    /**
     * Age range in millions of years: "72.2–66.0". Empty when not recorded.
     */
    ageNumbers: string;

    /**
     * The range drawn on the clade's age span. Absent when the age is not recorded.
     */
    rangeBar: RangeBarGeometry | undefined;

    /**
     * Country of the type specimen: "United States". Empty when not recorded.
     */
    country: string;

    /**
     * Status of the type species.
     */
    status: Status;

    /**
     * True when the genus cannot be placed below this clade.
     */
    isIncertaeSedis: boolean;

    /**
     * True when the genus record summarizes a live dispute.
     */
    isDisputed: boolean;
};

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
 * Place an age range on a scale.
 *
 * @param fromMa - Older end of the range.
 * @param toMa - Younger end of the range.
 * @param scale - The scale's span; its from_ma is the left end.
 * @returns The bar's position and width, in percent of the scale.
 */
export function createRangeBarGeometry(fromMa: number, toMa: number, scale: Period): RangeBarGeometry
{
    const scaleFrom = scale.from_ma ?? fromMa;
    const scaleTo = scale.to_ma ?? toMa;
    const span = scaleFrom - scaleTo;

    if (span <= 0)
    {
        return { leftPercent: 0, widthPercent: 100 };
    }

    return {
        leftPercent: (scaleFrom - fromMa) / span * 100,
        widthPercent: (fromMa - toMa) / span * 100,
    };
}

/**
 * Format the rows of the table of genera placed directly in a clade.
 *
 * @param clade - The clade.
 * @param siteData - The lookup tables.
 * @param scale - The span the range bars are drawn on, normally the clade's age span.
 * @returns One row per genus, in the clade's genus order.
 */
export function createCladeGenusRows(clade: CladeEntry, siteData: SiteData, scale: Period | undefined): Array<CladeGenusRow>
{
    const rows = new Array<CladeGenusRow>();

    for (const name of clade.genusNames)
    {
        const entry = siteData.genusByName.get(name);

        if (entry)
        {
            const genus = entry.record;
            const species = getTypeSpecies(genus);
            const period = species.period;
            const fromMa = period.from_ma;
            const toMa = period.to_ma;
            let ageNumbers = "";
            let rangeBar: RangeBarGeometry | undefined;

            if (fromMa !== undefined && toMa !== undefined)
            {
                ageNumbers = formatAgeNumbers(fromMa, toMa);
                rangeBar = scale ? createRangeBarGeometry(fromMa, toMa, scale) : undefined;
            }

            rows.push({
                entry,
                authority: formatAuthority(genus.authors, genus.described, false),
                age: formatShortAge(period),
                ageNumbers,
                rangeBar,
                country: species.location?.country ? formatCountry(species.location.country) : "",
                status: species.status,
                isIncertaeSedis: genus.placement === "incertae sedis",
                isDisputed: genus.dispute !== undefined,
            });
        }
    }

    return rows;
}
