import type { GeologicTimeline } from "./age-figure.ts";
import { getPeriodName } from "./age-figure.ts";
import type { Status } from "./dataset.ts";
import { capitalizeFirstLetter, formatAgeNumbers, formatAuthority, formatCountry, formatShortAge, formatVocabularyValue } from "./format.ts";
import type { ChoiceFilterName, GenusFilterValues } from "./genus-filters.ts";
import { otherGroupValue } from "./genus-filters.ts";
import { majorGroupNames } from "./home.ts";
import { getTypeSpecies } from "./records.ts";
import type { GenusEntry, SiteData } from "./site-data.ts";
import { createSlug } from "./slugs.ts";
import { listGenusEpochs } from "./time-pages.ts";

/**
 * The page a list of genera is on, which decides the details each genus shows:
 *
 * - "index": the Genera and period pages. Group, epochs and country.
 * - "stage": a stage page. Parent clade, stages with their dates, country, and whether the genus
 *   is under dispute.
 * - "clade": a clade page, listing the genera placed directly in it. Stages with their dates,
 *   country, whether its placement is incertae sedis, and whether it is under dispute.
 */
export type GenusListContext = "index" | "stage" | "clade";

/**
 * What one item of a genus's details line is, which sets how it is shown.
 */
export type GenusDetailKind = "text" | "clade" | "incertae-sedis" | "dispute";

/**
 * One item of a genus's details line.
 */
export type GenusDetail = {
    /**
     * What the item is: plain text, a link to a clade, the incertae sedis note (italic) or the
     * dispute note (in the caution color).
     */
    kind: GenusDetailKind;

    /**
     * The text: "Theropoda", "Bathonian–Callovian (168.2–161.5 Ma)", "Morocco".
     */
    text: string;

    /**
     * The clade's URL path segment when the item links to a clade; otherwise an empty string.
     */
    slug: string;
};

/**
 * Lists longer than this get letter headings and a row of letter links; shorter ones are a
 * single run of columns.
 */
const letterGroupingThreshold = 100;

/**
 * Decide whether a list of genera is long enough to group under letter headings.
 *
 * @param count - Number of genera in the list.
 * @returns True for lists of more than 100 genera.
 */
export function shouldGroupByLetter(count: number): boolean
{
    return count > letterGroupingThreshold;
}

/**
 * One genus in a list of genera: its name and authority, a line of details, and the values the
 * Genera page filters it on.
 */
export type GenusIndexRow = {
    /**
     * The genus.
     */
    entry: GenusEntry;

    /**
     * Authority without parentheses: "Osborn, 1905".
     */
    authority: string;

    /**
     * Its details line, shown with commas between items: "Theropoda, Late Cretaceous, United
     * States" on the Genera page.
     */
    details: Array<GenusDetail>;

    /**
     * Status of the type species, for its badge.
     */
    status: Status;

    /**
     * What the Genera page filters the genus on.
     */
    filterValues: GenusFilterValues;
};

/**
 * One option of a filter's list.
 */
export type FilterOption = {
    /**
     * The value, as written in the page address: "late-jurassic".
     */
    value: string;

    /**
     * The option's text, without its count: "Late Jurassic".
     */
    label: string;

    /**
     * Number of genera with this value, with no other filter on.
     */
    count: number;
};

/**
 * Options shown together in a filter's list, under a heading.
 */
export type FilterOptionGroup = {
    /**
     * The heading: "Jurassic".
     */
    label: string;

    /**
     * The options.
     */
    options: Array<FilterOption>;
};

/**
 * One filter chosen from a list.
 */
export type ChoiceFilter = {
    /**
     * The filter, which is also its name in the page address.
     */
    name: ChoiceFilterName;

    /**
     * The field's label: "Diet".
     */
    label: string;

    /**
     * The text of the option that turns the filter off: "Any diet".
     */
    anyLabel: string;

    /**
     * Options without a heading.
     */
    options: Array<FilterOption>;

    /**
     * Options under headings, after those without one: the time filter's epochs under their
     * periods.
     */
    groups: Array<FilterOptionGroup>;
};

/**
 * Everything the Genera page's filter form offers.
 */
export type GenusFilterOptions = {
    /**
     * The filters chosen from a list, in page order.
     */
    choices: Array<ChoiceFilter>;

    /**
     * The earliest year a genus was named.
     */
    firstYear: number;

    /**
     * The latest year a genus was named.
     */
    lastYear: number;
};

/**
 * A value of one filter with its option text, while the options are counted.
 */
type CountedValue = {
    /**
     * The option's text.
     */
    label: string;

    /**
     * Number of genera with the value.
     */
    count: number;
};

/**
 * Find the major group a genus belongs to, by walking up its lineage.
 *
 * @param genus - The genus.
 * @param siteData - The lookup tables.
 * @returns The group's name, or undefined when the genus is in none of them.
 */
export function findMajorGroup(genus: GenusEntry, siteData: SiteData): string | undefined
{
    let cladeName: string | undefined = genus.record.parent;

    while (cladeName !== undefined)
    {
        if (majorGroupNames.includes(cladeName))
        {
            return cladeName;
        }

        cladeName = siteData.cladeByName.get(cladeName)?.parentName;
    }

    return undefined;
}

/**
 * Turn a vocabulary value into option text: "nomen dubium" becomes "Nomen dubium".
 *
 * @param value - The value.
 * @returns The option text.
 */
function formatOptionLabel(value: string): string
{
    return capitalizeFirstLetter(formatVocabularyValue(value));
}

/**
 * Join epoch names for a details line: "Late Jurassic", or "Late Jurassic–Early Cretaceous"
 * for a span.
 *
 * @param names - The epoch names, oldest first.
 * @returns The span.
 */
function joinEpochSpan(names: Array<string>): string
{
    if (names.length <= 1)
    {
        return names[0] ?? "";
    }

    return names[0] + "–" + names[names.length - 1];
}

/**
 * Add a plain item to a details line, unless its text is empty.
 *
 * @param details - The details line.
 * @param text - The item's text.
 */
function addTextDetail(details: Array<GenusDetail>, text: string): void
{
    if (text !== "")
    {
        details.push({ kind: "text", text, slug: "" });
    }
}

/**
 * Format a type species' stages with their dates: "Bathonian–Callovian (168.2–161.5 Ma)".
 *
 * @param genus - The genus.
 * @returns The stages, or the epochs when no stage is recorded, with the dates when known.
 */
function formatStagesWithDates(genus: GenusEntry): string
{
    const period = getTypeSpecies(genus.record).period;
    const age = formatShortAge(period);

    if (period.from_ma === undefined || period.to_ma === undefined)
    {
        return age;
    }

    const dates = formatAgeNumbers(period.from_ma, period.to_ma) + " Ma";

    return age === "" ? dates : age + " (" + dates + ")";
}

/**
 * Create the details line of one genus for the page it is listed on.
 *
 * @param entry - The genus.
 * @param siteData - The lookup tables.
 * @param context - The page the list is on.
 * @param group - The genus's major group, if any.
 * @param epochNames - The epochs of its type species, oldest first.
 * @returns The details, in order.
 */
function createGenusDetails(
    entry: GenusEntry,
    siteData: SiteData,
    context: GenusListContext,
    group: string | undefined,
    epochNames: Array<string>,
): Array<GenusDetail>
{
    const genus = entry.record;
    const country = getTypeSpecies(genus).location?.country;
    const details = new Array<GenusDetail>();

    if (context === "index")
    {
        addTextDetail(details, group ?? genus.parent);
        addTextDetail(details, joinEpochSpan(epochNames));
    }
    else
    {
        if (context === "stage")
        {
            const parent = siteData.cladeByName.get(genus.parent);

            details.push(parent?.record ? { kind: "clade", text: genus.parent, slug: parent.slug } : { kind: "text", text: genus.parent, slug: "" });
        }

        addTextDetail(details, formatStagesWithDates(entry));
    }

    addTextDetail(details, country ? formatCountry(country) : "");

    if (context === "clade" && genus.placement === "incertae sedis")
    {
        details.push({ kind: "incertae-sedis", text: "incertae sedis", slug: "" });
    }

    // A disputed type species already has a "Disputed" badge, so the note would repeat it.
    if (context !== "index" && genus.dispute !== undefined && getTypeSpecies(genus).status !== "disputed")
    {
        details.push({ kind: "dispute", text: "under dispute", slug: "" });
    }

    return details;
}

/**
 * Create the rows of a list of genera.
 *
 * @param genera - The genera, sorted by name.
 * @param siteData - The lookup tables.
 * @param timeline - The arranged timescale, if the dataset has one.
 * @param context - The page the list is on, which decides each genus's details.
 * @returns One row per genus, in the same order.
 */
export function createGenusIndexRows(
    genera: Array<GenusEntry>,
    siteData: SiteData,
    timeline: GeologicTimeline | undefined,
    context: GenusListContext,
): Array<GenusIndexRow>
{
    const rows = new Array<GenusIndexRow>();

    for (const entry of genera)
    {
        const genus = entry.record;
        const species = getTypeSpecies(genus);
        const group = findMajorGroup(entry, siteData);
        const epochs = timeline ? listGenusEpochs(genus, timeline) : [];
        const epochNames = new Array<string>();
        const time = new Array<string>();

        for (const epoch of epochs)
        {
            const periodSlug = createSlug(getPeriodName(epoch.name));

            if (!time.includes(periodSlug))
            {
                time.push(periodSlug);
            }

            time.push(createSlug(epoch.name));
            epochNames.push(epoch.name);
        }

        rows.push({
            entry,
            authority: formatAuthority(genus.authors, genus.described, false),
            details: createGenusDetails(entry, siteData, context, group, epochNames),
            status: species.status,
            filterValues: {
                time,
                group: group ? createSlug(group) : otherGroupValue,
                diet: genus.diet ? createSlug(genus.diet) : "",
                locomotion: genus.locomotion ? createSlug(genus.locomotion) : "",
                integument: genus.appearance?.integument ? createSlug(genus.appearance.integument) : "",
                status: createSlug(species.status),
                year: genus.described,
            },
        });
    }

    return rows;
}

/**
 * Count one value of one filter.
 *
 * @param counts - Counts by value.
 * @param value - The value; empty values are not counted.
 * @param label - The value's option text.
 */
function countValue(counts: Map<string, CountedValue>, value: string, label: string): void
{
    if (value === "")
    {
        return;
    }

    const counted = counts.get(value) ?? { label, count: 0 };

    counted.count++;
    counts.set(value, counted);
}

/**
 * List counted values as options, most common first.
 *
 * @param counts - Counts by value.
 * @returns The options.
 */
function listByCount(counts: Map<string, CountedValue>): Array<FilterOption>
{
    const options = new Array<FilterOption>();

    for (const [value, counted] of counts)
    {
        options.push({ value, label: counted.label, count: counted.count });
    }

    options.sort((first, second) => second.count - first.count || first.label.localeCompare(second.label, "en"));

    return options;
}

/**
 * List the time filter's options: each period, then its epochs, oldest first, where they have
 * genera.
 *
 * @param counts - Genera by period and epoch slug.
 * @param timeline - The arranged timescale.
 * @returns One group per period.
 */
function listTimeOptions(counts: Map<string, CountedValue>, timeline: GeologicTimeline | undefined): Array<FilterOptionGroup>
{
    const groups = new Array<FilterOptionGroup>();

    for (const period of timeline?.periods ?? [])
    {
        const periodCount = counts.get(createSlug(period.name));

        if (!periodCount)
        {
            continue;
        }

        const options: Array<FilterOption> = [{ value: createSlug(period.name), label: "All of the " + period.name, count: periodCount.count }];

        for (const epoch of timeline?.epochs ?? [])
        {
            const epochCount = counts.get(createSlug(epoch.name));

            if (epochCount && getPeriodName(epoch.name) === period.name)
            {
                options.push({ value: createSlug(epoch.name), label: epoch.name, count: epochCount.count });
            }
        }

        groups.push({ label: period.name, options });
    }

    return groups;
}

/**
 * List the group filter's options: the major groups in tree order, then every other genus.
 *
 * @param counts - Genera by group slug.
 * @returns The options.
 */
function listGroupOptions(counts: Map<string, CountedValue>): Array<FilterOption>
{
    const options = new Array<FilterOption>();

    for (const name of majorGroupNames)
    {
        const counted = counts.get(createSlug(name));

        if (counted)
        {
            options.push({ value: createSlug(name), label: name, count: counted.count });
        }
    }

    const other = counts.get(otherGroupValue);

    if (other)
    {
        options.push({ value: otherGroupValue, label: "Other groups", count: other.count });
    }

    return options;
}

/**
 * List what the Genera page's filters offer, with the number of genera for each option.
 *
 * @param rows - The rows of every genus.
 * @param timeline - The arranged timescale, if the dataset has one.
 * @returns The filters and the range of years named.
 */
export function listGenusFilterOptions(rows: Array<GenusIndexRow>, timeline: GeologicTimeline | undefined): GenusFilterOptions
{
    const time = new Map<string, CountedValue>();
    const group = new Map<string, CountedValue>();
    const diet = new Map<string, CountedValue>();
    const locomotion = new Map<string, CountedValue>();
    const integument = new Map<string, CountedValue>();
    const status = new Map<string, CountedValue>();
    let firstYear = Number.POSITIVE_INFINITY;
    let lastYear = Number.NEGATIVE_INFINITY;

    for (const row of rows)
    {
        const genus = row.entry.record;
        const values = row.filterValues;

        for (const value of values.time)
        {
            countValue(time, value, value);
        }

        countValue(group, values.group, values.group);
        countValue(diet, values.diet, formatOptionLabel(genus.diet ?? ""));
        countValue(locomotion, values.locomotion, formatOptionLabel(genus.locomotion ?? ""));
        countValue(integument, values.integument, formatOptionLabel(genus.appearance?.integument ?? ""));
        countValue(status, values.status, formatOptionLabel(row.status));

        if (values.year !== undefined)
        {
            firstYear = Math.min(firstYear, values.year);
            lastYear = Math.max(lastYear, values.year);
        }
    }

    return {
        choices: [
            { name: "time", label: "Time", anyLabel: "Any time", options: [], groups: listTimeOptions(time, timeline) },
            { name: "group", label: "Group", anyLabel: "Any group", options: listGroupOptions(group), groups: [] },
            { name: "diet", label: "Diet", anyLabel: "Any diet", options: listByCount(diet), groups: [] },
            { name: "locomotion", label: "Locomotion", anyLabel: "Any locomotion", options: listByCount(locomotion), groups: [] },
            { name: "integument", label: "Integument", anyLabel: "Any integument", options: listByCount(integument), groups: [] },
            { name: "status", label: "Status", anyLabel: "Any status", options: listByCount(status), groups: [] },
        ],
        firstYear,
        lastYear,
    };
}
