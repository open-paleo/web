import type { GeologicTimeline } from "./age-figure.ts";
import { getFirstSentence } from "./format.ts";
import { getTypeSpecies } from "./records.ts";
import type { CladeEntry, GenusEntry, SiteData } from "./site-data.ts";
import { createSlug } from "./slugs.ts";

/**
 * How many genera are known from one stage of geologic time.
 */
export type StageCount = {
    /**
     * Stage name: "Campanian".
     */
    name: string;

    /**
     * URL path segment of the stage's page: stage/{slug}/.
     */
    slug: string;

    /**
     * The stage's epoch: "Late Cretaceous".
     */
    epochName: string;

    /**
     * The stage's period: "Cretaceous".
     */
    periodName: string;

    /**
     * Older boundary, in millions of years ago.
     */
    fromMa: number;

    /**
     * Younger boundary, in millions of years ago.
     */
    toMa: number;

    /**
     * CSS custom property holding the stage's chart color: "--stage-campanian".
     */
    colorToken: string;

    /**
     * Genera whose type species is known from the stage.
     */
    count: number;
};

/**
 * A run of consecutive stages that belong to one period or epoch, for labeling the time axis.
 */
export type PeriodSpan = {
    /**
     * Period or epoch name: "Jurassic", "Middle Jurassic".
     */
    name: string;

    /**
     * URL path segment of the period's page when the span is a period: period/{slug}/.
     */
    slug: string;

    /**
     * Number of consecutive stages in the run.
     */
    stageCount: number;
};

/**
 * The most recently named genera, covering one year or a run of the latest years.
 */
export type RecentNames = {
    /**
     * The earliest year included.
     */
    fromYear: number;

    /**
     * The latest year included: the newest year any genus in the dataset was named.
     */
    toYear: number;

    /**
     * The genera, newest year first, by name within a year.
     */
    genera: Array<GenusEntry>;
};

/**
 * A major group of dinosaurs for the home page, with its size and a one-sentence summary.
 */
export type MajorGroup = {
    /**
     * The clade.
     */
    clade: CladeEntry;

    /**
     * First sentence of the clade's description, or an empty string when it has none.
     */
    summary: string;
};

/**
 * The groups the home page offers as ways into the tree, in tree order, which the Genera page
 * also filters by. Together they hold most of the dataset's genera.
 */
export const majorGroupNames = ["Theropoda", "Sauropodomorpha", "Thyreophora", "Ornithopoda", "Ceratopsia", "Pachycephalosauria"];

/**
 * Count the genera known from each stage, from the stages listed for each genus's type species.
 * A genus whose type species spans several stages counts in each of them.
 *
 * @param siteData - The lookup tables.
 * @param timeline - The arranged timescale.
 * @returns One count per stage, oldest first, from the oldest stage with a genus to the
 * youngest, including any empty stages between them.
 */
export function countGeneraByStage(siteData: SiteData, timeline: GeologicTimeline): Array<StageCount>
{
    const countByStage = new Map<string, number>();

    for (const genus of siteData.genera)
    {
        for (const stage of getTypeSpecies(genus.record).period.stage ?? [])
        {
            countByStage.set(stage, (countByStage.get(stage) ?? 0) + 1);
        }
    }

    const counts = new Array<StageCount>();

    for (const epoch of timeline.epochs)
    {
        for (const stage of epoch.stages)
        {
            counts.push({
                name: stage.name,
                slug: createSlug(stage.name),
                epochName: epoch.name,
                periodName: epoch.periodName,
                fromMa: stage.fromMa,
                toMa: stage.toMa,
                colorToken: "--stage-" + createSlug(stage.name),
                count: countByStage.get(stage.name) ?? 0,
            });
        }
    }

    let first = 0;
    let last = counts.length - 1;

    while (first < counts.length && counts[first].count === 0)
    {
        first++;
    }

    while (last > first && counts[last].count === 0)
    {
        last--;
    }

    return counts.slice(first, last + 1);
}

/**
 * The time unit a chart's axis labels name: periods on the home page, epochs on a period page.
 */
export type AxisGrouping = "period" | "epoch";

/**
 * Group consecutive stages by period or by epoch, for the labels under the chart's time axis.
 *
 * @param stages - Stage counts, oldest first.
 * @param grouping - Whether to group by period or by epoch.
 * @returns One span per run of stages in the same period or epoch, in order.
 */
export function groupStagesForAxis(stages: Array<StageCount>, grouping: AxisGrouping): Array<PeriodSpan>
{
    const spans = new Array<PeriodSpan>();

    for (const stage of stages)
    {
        const name = grouping === "period" ? stage.periodName : stage.epochName;
        const current = spans[spans.length - 1];

        if (current && current.name === name)
        {
            current.stageCount++;
        }
        else
        {
            spans.push({ name, slug: createSlug(name), stageCount: 1 });
        }
    }

    return spans;
}

/**
 * Find the most recently named genera: those of the newest year in the dataset, reaching back
 * whole years until there are at least the minimum. The years come from the data, not the
 * calendar, so the list is never empty early in a new year; it shows the last year with names,
 * and joins it to the one before while the new year has only a few.
 *
 * @param siteData - The lookup tables.
 * @param minimumCount - The fewest genera to show, if the dataset has that many.
 * @returns The years and their genera, or undefined when no genus has a year.
 */
export function findRecentNames(siteData: SiteData, minimumCount: number): RecentNames | undefined
{
    const generaByYear = new Map<number, Array<GenusEntry>>();

    for (const genus of siteData.genera)
    {
        const year = genus.record.described;

        if (year !== undefined)
        {
            const genera = generaByYear.get(year) ?? new Array<GenusEntry>();

            genera.push(genus);
            generaByYear.set(year, genera);
        }
    }

    const years = [...generaByYear.keys()].sort((first, second) => second - first);

    if (years.length === 0)
    {
        return undefined;
    }

    const genera = new Array<GenusEntry>();
    let fromYear = years[0];

    for (const year of years)
    {
        if (genera.length >= minimumCount)
        {
            break;
        }

        fromYear = year;

        for (const genus of generaByYear.get(year) ?? [])
        {
            genera.push(genus);
        }
    }

    return { fromYear, toYear: years[0], genera };
}

/**
 * Describe the years a list of recent names covers: "2026", "2026 and 2027", "2025 to 2027".
 *
 * @param names - The recent names.
 * @returns The years in words.
 */
export function describeRecentYears(names: RecentNames): string
{
    if (names.fromYear === names.toYear)
    {
        return String(names.toYear);
    }
    else if (names.toYear - names.fromYear === 1)
    {
        return names.fromYear + " and " + names.toYear;
    }

    return names.fromYear + " to " + names.toYear;
}

/**
 * List the major groups the home page offers, skipping any the tree does not have.
 *
 * @param siteData - The lookup tables.
 * @returns The groups, in the order the home page lists them.
 */
export function listMajorGroups(siteData: SiteData): Array<MajorGroup>
{
    const groups = new Array<MajorGroup>();

    for (const name of majorGroupNames)
    {
        const clade = siteData.cladeByName.get(name);

        if (clade && clade.record)
        {
            groups.push({ clade, summary: clade.record.description ? getFirstSentence(clade.record.description) : "" });
        }
    }

    return groups;
}

/**
 * Choose the top of the chart's value axis: the largest count rounded up to a whole step, so
 * the tallest bar never touches the top and every tick is a round number.
 *
 * @param stages - Stage counts.
 * @param step - The tick interval.
 * @returns The axis maximum, at least one step.
 */
export function findAxisMaximum(stages: Array<StageCount>, step: number): number
{
    let largest = 0;

    for (const stage of stages)
    {
        largest = Math.max(largest, stage.count);
    }

    return Math.max(step, Math.ceil((largest + 1) / step) * step);
}
