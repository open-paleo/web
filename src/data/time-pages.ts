import type { GeologicTimeline } from "./age-figure.ts";
import type { Period } from "./dataset.ts";
import { getPeriodName } from "./age-figure.ts";
import { getTypeSpecies } from "./records.ts";
import type { GenusEntry, SiteData } from "./site-data.ts";
import { getSiteData } from "./site-data.ts";
import { createSlug } from "./slugs.ts";

/**
 * A stage with the genera known from it, for its own page.
 */
export type StagePage = {
    /**
     * Stage name: "Bathonian".
     */
    name: string;

    /**
     * URL path segment: stage/{slug}/.
     */
    slug: string;

    /**
     * The stage's epoch: "Middle Jurassic".
     */
    epochName: string;

    /**
     * The stage's period: "Jurassic".
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
     * Genera whose type species is known from the stage, sorted by name.
     */
    genera: Array<GenusEntry>;
};

/**
 * One epoch of a period, with its stages, for the period's page.
 */
export type PeriodEpoch = {
    /**
     * Epoch name: "Middle Jurassic".
     */
    name: string;

    /**
     * The epoch's stages that have genera, oldest first.
     */
    stages: Array<StagePage>;
};

/**
 * A period with its epochs, stages and genera, for its own page.
 */
export type PeriodPage = {
    /**
     * Period name: "Jurassic".
     */
    name: string;

    /**
     * URL path segment: period/{slug}/.
     */
    slug: string;

    /**
     * Older boundary of its stages, in millions of years ago.
     */
    fromMa: number;

    /**
     * Younger boundary of its stages, in millions of years ago.
     */
    toMa: number;

    /**
     * The period's epochs that have genera, oldest first.
     */
    epochs: Array<PeriodEpoch>;

    /**
     * Every genus known from any of its stages, each once, sorted by name.
     */
    genera: Array<GenusEntry>;
};

/**
 * Pages for the geologic time scale: one per stage and one per period that has genera.
 */
export type TimePages = {
    /**
     * Stages with genera, oldest first.
     */
    stages: Array<StagePage>;

    /**
     * Periods with genera, oldest first.
     */
    periods: Array<PeriodPage>;

    /**
     * Stage pages by stage name.
     */
    stageByName: Map<string, StagePage>;

    /**
     * Period pages by period name.
     */
    periodByName: Map<string, PeriodPage>;
};

/**
 * Arrange the genera by the stages and periods of their type species, for the time pages. A
 * genus whose type species spans several stages appears on each of their pages, the same rule
 * the home page's chart counts by.
 *
 * @param siteData - The lookup tables.
 * @param timeline - The arranged timescale.
 * @returns The stage and period pages, each only where there are genera.
 */
export function createTimePages(siteData: SiteData, timeline: GeologicTimeline): TimePages
{
    const generaByStage = new Map<string, Array<GenusEntry>>();

    for (const genus of siteData.genera)
    {
        for (const stage of getTypeSpecies(genus.record).period.stage ?? [])
        {
            const genera = generaByStage.get(stage) ?? new Array<GenusEntry>();

            genera.push(genus);
            generaByStage.set(stage, genera);
        }
    }

    const stages = new Array<StagePage>();
    const periods = new Array<PeriodPage>();
    const stageByName = new Map<string, StagePage>();
    const periodByName = new Map<string, PeriodPage>();
    const generaInPeriod = new Map<string, Set<GenusEntry>>();

    for (const epoch of timeline.epochs)
    {
        const periodName = getPeriodName(epoch.name);
        const epochStages = new Array<StagePage>();

        for (const stage of epoch.stages)
        {
            const genera = generaByStage.get(stage.name);

            if (genera && genera.length > 0)
            {
                const page: StagePage = {
                    name: stage.name,
                    slug: createSlug(stage.name),
                    epochName: epoch.name,
                    periodName,
                    fromMa: stage.fromMa,
                    toMa: stage.toMa,
                    genera,
                };
                const periodGenera = generaInPeriod.get(periodName) ?? new Set<GenusEntry>();

                for (const genus of genera)
                {
                    periodGenera.add(genus);
                }

                generaInPeriod.set(periodName, periodGenera);
                epochStages.push(page);
                stages.push(page);
                stageByName.set(stage.name, page);
            }
        }

        if (epochStages.length > 0)
        {
            let period = periodByName.get(periodName);

            if (!period)
            {
                period = {
                    name: periodName,
                    slug: createSlug(periodName),
                    fromMa: epochStages[0].fromMa,
                    toMa: epochStages[epochStages.length - 1].toMa,
                    epochs: new Array<PeriodEpoch>(),
                    genera: new Array<GenusEntry>(),
                };
                periodByName.set(periodName, period);
                periods.push(period);
            }

            period.toMa = epochStages[epochStages.length - 1].toMa;
            period.epochs.push({ name: epoch.name, stages: epochStages });
        }
    }

    for (const period of periods)
    {
        period.genera = [...(generaInPeriod.get(period.name) ?? [])].sort((first, second) => first.name.localeCompare(second.name, "en"));
    }

    return { stages, periods, stageByName, periodByName };
}

/**
 * One piece of an age caption: a stage or epoch name, linked when its page exists, or the
 * punctuation between names.
 */
export type CaptionPart = {
    /**
     * The text: "Bathonian", "Middle Jurassic", "–" or ", ".
     */
    text: string;

    /**
     * The section of the page the text links to, or undefined for plain text.
     */
    section: "stage" | "period" | undefined;

    /**
     * URL path segment of the linked page, or an empty string for plain text.
     */
    slug: string;
};

/**
 * Create the linked pieces of a span of time units: one name, or the first and last joined by
 * an en dash.
 *
 * @param names - Stage or epoch names, oldest first.
 * @param createLink - Turns a name into a caption part, linked where its page exists.
 * @returns The parts.
 */
function createSpanParts(names: Array<string>, createLink: (name: string) => CaptionPart): Array<CaptionPart>
{
    if (names.length === 0)
    {
        return [];
    }
    else if (names.length === 1)
    {
        return [createLink(names[0])];
    }

    return [createLink(names[0]), { text: "–", section: undefined, slug: "" }, createLink(names[names.length - 1])];
}

/**
 * Break an age caption ("Bathonian–Callovian, Middle Jurassic") into parts that link each stage
 * to its stage page and each epoch to its period's page, where those pages exist.
 *
 * @param period - The record's period block.
 * @param pages - The time pages.
 * @returns The caption's parts, in order; empty when the record names no stage or epoch.
 */
export function listAgeCaptionParts(period: Period, pages: TimePages): Array<CaptionPart>
{
    /**
     * Link a stage name to its page, if it has one.
     *
     * @param name - The stage name.
     * @returns The caption part.
     */
    function createStageLink(name: string): CaptionPart
    {
        const page = pages.stageByName.get(name);

        return page ? { text: name, section: "stage", slug: page.slug } : { text: name, section: undefined, slug: "" };
    }

    /**
     * Link an epoch name to its period's page, if it has one.
     *
     * @param name - The epoch name.
     * @returns The caption part.
     */
    function createEpochLink(name: string): CaptionPart
    {
        const page = pages.periodByName.get(getPeriodName(name));

        return page ? { text: name, section: "period", slug: page.slug } : { text: name, section: undefined, slug: "" };
    }

    const stageParts = createSpanParts(period.stage ?? [], createStageLink);
    const epochParts = createSpanParts(period.name ?? [], createEpochLink);

    if (stageParts.length > 0 && epochParts.length > 0)
    {
        return [...stageParts, { text: ", ", section: undefined, slug: "" }, ...epochParts];
    }

    return stageParts.length > 0 ? stageParts : epochParts;
}

let cachedTimePages: TimePages | undefined;

/**
 * Build the stage and period pages once per build. Pages call this from their frontmatter and
 * getStaticPaths().
 *
 * @returns The time pages, empty when the dataset has no timescale.
 */
export function getTimePages(): TimePages
{
    if (!cachedTimePages)
    {
        const siteData = getSiteData();

        cachedTimePages = siteData.timeline
            ? createTimePages(siteData, siteData.timeline)
            : { stages: [], periods: [], stageByName: new Map(), periodByName: new Map() };
    }

    return cachedTimePages;
}
