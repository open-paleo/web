import type { Period, Timescale } from "./dataset.ts";
import { createSlug } from "./slugs.ts";

/**
 * A named interval of geologic time: a period, an epoch or a stage.
 */
export type TimeUnit = {
    /**
     * Name of the unit: "Cretaceous", "Late Cretaceous", "Maastrichtian".
     */
    name: string;

    /**
     * Older boundary, in millions of years ago.
     */
    fromMa: number;

    /**
     * Younger boundary, in millions of years ago.
     */
    toMa: number;
};

/**
 * An epoch with its stages, oldest first.
 */
export type Epoch = TimeUnit & {
    /**
     * Name of the period the epoch belongs to: "Cretaceous" for "Late Cretaceous".
     */
    periodName: string;

    /**
     * The epoch's stages, oldest first.
     */
    stages: Array<TimeUnit>;
};

/**
 * The dataset's timescale arranged into periods, epochs and stages.
 */
export type GeologicTimeline = {
    /**
     * Periods, oldest first. Each spans the stages the dataset lists for it.
     */
    periods: Array<TimeUnit>;

    /**
     * Epochs, oldest first, each with its stages.
     */
    epochs: Array<Epoch>;

    /**
     * The chart the boundaries follow.
     */
    chart: string;
};

/**
 * One colored band in a row of the age figure.
 */
export type AgeBand = {
    /**
     * Name of the unit the band stands for.
     */
    name: string;

    /**
     * CSS custom property holding the unit's chart color, such as "--stage-maastrichtian".
     */
    colorToken: string;

    /**
     * True when the color is dark enough to need light text.
     */
    hasDarkColor: boolean;

    /**
     * Width of the band as a percentage of the row.
     */
    widthPercent: number;
};

/**
 * The outline over a row that marks the record's age range.
 */
export type AgeMarker = {
    /**
     * Distance from the row's left (older) end, as a percentage of the row.
     */
    leftPercent: number;

    /**
     * Width as a percentage of the row.
     */
    widthPercent: number;

    /**
     * Share of the row after the marker, toward the young end, as a percentage.
     */
    remainingPercent: number;
};

/**
 * One row of the age figure.
 */
export type AgeRow = {
    /**
     * What the row shows: "Mesozoic periods", "Late Cretaceous stages".
     */
    label: string;

    /**
     * Older end of the row, in millions of years ago.
     */
    fromMa: number;

    /**
     * Younger end of the row, in millions of years ago.
     */
    toMa: number;

    /**
     * The bands, oldest (left) first.
     */
    bands: Array<AgeBand>;

    /**
     * Where the record's age falls on the row.
     */
    marker: AgeMarker;
};

/**
 * Everything the age figure draws for one record.
 */
export type AgeFigureModel = {
    /**
     * The periods, with the record's range marked.
     */
    periodRow: AgeRow;

    /**
     * The stages of the epochs the record's range falls in, with the range marked.
     */
    stageRow: AgeRow;
};

/**
 * Periods drawn on every age figure; others are added when a record's range reaches them.
 */
const alwaysShownPeriods = new Set(["Triassic", "Jurassic", "Cretaceous"]);

/**
 * Units whose chart color is dark enough to need light text.
 */
const darkColoredUnits = new Set(["Permian", "Early Permian", "Triassic", "Early Triassic", "Induan", "Olenekian"]);

/**
 * Get the period an epoch belongs to from its name: "Late Cretaceous" gives "Cretaceous".
 * Epochs named without Early, Middle or Late (Paleocene, Eocene) are their own period here,
 * since the dataset's timescale does not name the Paleogene.
 *
 * @param epochName - The epoch name.
 * @returns The period name.
 */
export function getPeriodName(epochName: string): string
{
    return epochName.replace(/^(Early|Middle|Late) /, "");
}

/**
 * Sort time units oldest first.
 *
 * @param units - The units; sorted in place.
 */
function sortOldestFirst(units: Array<TimeUnit>): void
{
    units.sort((first, second) => second.fromMa - first.fromMa);
}

/**
 * Arrange the dataset's stage table into periods, epochs and stages.
 *
 * @param timescale - The dataset's timescale.
 * @returns The timeline, every list oldest first.
 */
export function createGeologicTimeline(timescale: Timescale): GeologicTimeline
{
    const epochByName = new Map<string, Epoch>();

    for (const stageName of Object.keys(timescale.stages))
    {
        const stage = timescale.stages[stageName];
        let epoch = epochByName.get(stage.period);

        if (!epoch)
        {
            epoch = {
                name: stage.period,
                periodName: getPeriodName(stage.period),
                fromMa: stage.from_ma,
                toMa: stage.to_ma,
                stages: new Array<TimeUnit>(),
            };
            epochByName.set(stage.period, epoch);
        }

        epoch.fromMa = Math.max(epoch.fromMa, stage.from_ma);
        epoch.toMa = Math.min(epoch.toMa, stage.to_ma);
        epoch.stages.push({ name: stageName, fromMa: stage.from_ma, toMa: stage.to_ma });
    }

    const epochs = [...epochByName.values()];
    const periodByName = new Map<string, TimeUnit>();

    sortOldestFirst(epochs);

    for (const epoch of epochs)
    {
        sortOldestFirst(epoch.stages);

        const period = periodByName.get(epoch.periodName);

        if (period)
        {
            period.fromMa = Math.max(period.fromMa, epoch.fromMa);
            period.toMa = Math.min(period.toMa, epoch.toMa);
        }
        else
        {
            periodByName.set(epoch.periodName, { name: epoch.periodName, fromMa: epoch.fromMa, toMa: epoch.toMa });
        }
    }

    const periods = [...periodByName.values()];

    sortOldestFirst(periods);

    return { periods, epochs, chart: timescale.chart };
}

/**
 * Report whether a time unit overlaps an age range.
 *
 * @param unit - The time unit.
 * @param fromMa - Older end of the range.
 * @param toMa - Younger end of the range.
 * @returns True if they share any time. A range of a single age counts when it falls inside
 * the unit or on its older boundary.
 */
function overlapsRange(unit: TimeUnit, fromMa: number, toMa: number): boolean
{
    if (fromMa === toMa)
    {
        return fromMa <= unit.fromMa && fromMa > unit.toMa;
    }

    return unit.fromMa > toMa && unit.toMa < fromMa;
}

/**
 * Lay out a row of bands and the record's marker on it.
 *
 * @param label - What the row shows.
 * @param units - The units to draw, oldest first, without gaps between them.
 * @param tokenPrefix - Prefix of the units' color tokens: "period", "epoch" or "stage".
 * @param fromMa - Older end of the record's range.
 * @param toMa - Younger end of the record's range.
 * @returns The row.
 */
function createAgeRow(label: string, units: Array<TimeUnit>, tokenPrefix: string, fromMa: number, toMa: number): AgeRow
{
    const rowFrom = units[0].fromMa;
    const rowTo = units[units.length - 1].toMa;
    const span = rowFrom - rowTo;
    const bands = new Array<AgeBand>();

    for (const unit of units)
    {
        bands.push({
            name: unit.name,
            colorToken: "--" + tokenPrefix + "-" + createSlug(unit.name),
            hasDarkColor: darkColoredUnits.has(unit.name),
            widthPercent: (unit.fromMa - unit.toMa) / span * 100,
        });
    }

    const markerFrom = Math.min(fromMa, rowFrom);
    const markerTo = Math.max(toMa, rowTo);
    const leftPercent = (rowFrom - markerFrom) / span * 100;
    const widthPercent = Math.max(markerFrom - markerTo, 0) / span * 100;

    return {
        label,
        fromMa: rowFrom,
        toMa: rowTo,
        bands,
        marker: {
            leftPercent,
            widthPercent,
            remainingPercent: Math.max(100 - leftPercent - widthPercent, 0),
        },
    };
}

/**
 * Join epoch names for a row label: "Late Cretaceous", or "Early and Late Cretaceous" when a
 * range spans two epochs of one period.
 *
 * @param epochs - The epochs, oldest first.
 * @returns The label text.
 */
function joinEpochNames(epochs: Array<Epoch>): string
{
    if (epochs.length === 1)
    {
        return epochs[0].name;
    }

    const names = new Array<string>();

    for (const epoch of epochs)
    {
        names.push(epoch.name);
    }

    return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

/**
 * Work out what the age figure draws for a record: the Mesozoic periods (and any other period
 * the record reaches), and the stages of the epochs its range falls in, each row with the
 * range marked.
 *
 * @param period - The record's period block.
 * @param timeline - The arranged timescale.
 * @returns The figure, or undefined when the record has no numeric age or its age falls outside
 * the timescale.
 */
export function createAgeFigureModel(period: Period, timeline: GeologicTimeline): AgeFigureModel | undefined
{
    const fromMa = period.from_ma;
    const toMa = period.to_ma;

    if (fromMa === undefined || toMa === undefined)
    {
        return undefined;
    }

    const periods = new Array<TimeUnit>();

    for (const unit of timeline.periods)
    {
        if (alwaysShownPeriods.has(unit.name) || overlapsRange(unit, fromMa, toMa))
        {
            periods.push(unit);
        }
    }

    const epochs = new Array<Epoch>();
    const stages = new Array<TimeUnit>();

    for (const epoch of timeline.epochs)
    {
        if (overlapsRange(epoch, fromMa, toMa))
        {
            epochs.push(epoch);

            for (const stage of epoch.stages)
            {
                stages.push(stage);
            }
        }
    }

    if (periods.length === 0 || stages.length === 0)
    {
        return undefined;
    }

    return {
        periodRow: createAgeRow("Periods", periods, "period", fromMa, toMa),
        stageRow: createAgeRow(joinEpochNames(epochs) + " stages", stages, "stage", fromMa, toMa),
    };
}
