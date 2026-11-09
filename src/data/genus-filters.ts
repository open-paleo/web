// The filters of the Genera page: what each genus is filtered on, how those values are written
// into the page as data attributes, and how they are matched against the chosen filters. The
// build and the browser script share this module, so it imports nothing that needs Node.

/**
 * A filter chosen from a list: one value, or "" for any.
 */
export type ChoiceFilterName = "time" | "group" | "diet" | "locomotion" | "integument" | "status";

/**
 * The choice filters, in the order the page shows them.
 */
export const choiceFilterNames: Array<ChoiceFilterName> = ["time", "group", "diet", "locomotion", "integument", "status"];

/**
 * The value of a genus that matches no group of the group filter.
 */
export const otherGroupValue = "other";

/**
 * What one genus is filtered on. Values are slugs: "late-jurassic", "nomen-dubium".
 */
export type GenusFilterValues = {
    /**
     * The epochs of the type species and their periods: ["jurassic", "late-jurassic"].
     */
    time: Array<string>;

    /**
     * The major group the genus belongs to, or "other".
     */
    group: string;

    /**
     * Diet, or "" when not recorded.
     */
    diet: string;

    /**
     * Locomotion, or "" when not recorded.
     */
    locomotion: string;

    /**
     * Integument, or "" when not recorded.
     */
    integument: string;

    /**
     * Status of the type species.
     */
    status: string;

    /**
     * Year the genus was named, or undefined when not recorded.
     */
    year: number | undefined;
};

/**
 * The filters a reader has chosen. An empty string or undefined means the filter is off.
 */
export type GenusFilterCriteria = {
    /**
     * A period or epoch slug.
     */
    time: string;

    /**
     * A major group slug, or "other".
     */
    group: string;

    /**
     * A diet.
     */
    diet: string;

    /**
     * A locomotion.
     */
    locomotion: string;

    /**
     * An integument.
     */
    integument: string;

    /**
     * A status slug.
     */
    status: string;

    /**
     * Earliest year named, inclusive.
     */
    fromYear: number | undefined;

    /**
     * Latest year named, inclusive.
     */
    toYear: number | undefined;
};

/**
 * Data attributes for one genus's list item: "data-time" to "data-year".
 */
export type FilterAttributes = Record<string, string>;

/**
 * The data attributes a list item carries, as the browser reads them from its dataset.
 */
export type FilterDataset = Record<string, string | undefined>;

/**
 * Create criteria with every filter off.
 *
 * @returns Criteria that match every genus.
 */
export function createEmptyCriteria(): GenusFilterCriteria
{
    return { time: "", group: "", diet: "", locomotion: "", integument: "", status: "", fromYear: undefined, toYear: undefined };
}

/**
 * Report whether any filter is on.
 *
 * @param criteria - The chosen filters.
 * @returns True when at least one filter is on.
 */
export function hasActiveFilter(criteria: GenusFilterCriteria): boolean
{
    for (const name of choiceFilterNames)
    {
        if (criteria[name] !== "")
        {
            return true;
        }
    }

    return criteria.fromYear !== undefined || criteria.toYear !== undefined;
}

/**
 * Count the filters that are on, for the folded form's button: each list chosen, and the year
 * range as one.
 *
 * @param criteria - The chosen filters.
 * @returns How many filters are on.
 */
export function countActiveFilters(criteria: GenusFilterCriteria): number
{
    let count = 0;

    for (const name of choiceFilterNames)
    {
        count += criteria[name] !== "" ? 1 : 0;
    }

    return count + (criteria.fromYear !== undefined || criteria.toYear !== undefined ? 1 : 0);
}

/**
 * Write a genus's filter values as data attributes for its list item.
 *
 * @param values - The genus's filter values.
 * @returns The attributes, named "data-time" to "data-year".
 */
export function createFilterAttributes(values: GenusFilterValues): FilterAttributes
{
    return {
        "data-time": values.time.join(" "),
        "data-group": values.group,
        "data-diet": values.diet,
        "data-locomotion": values.locomotion,
        "data-integument": values.integument,
        "data-status": values.status,
        "data-year": values.year === undefined ? "" : String(values.year),
    };
}

/**
 * Read a genus's filter values back from its list item's data attributes.
 *
 * @param dataset - The item's dataset.
 * @returns The genus's filter values.
 */
export function readFilterAttributes(dataset: FilterDataset): GenusFilterValues
{
    const time = dataset.time ?? "";
    const year = Number.parseInt(dataset.year ?? "", 10);

    return {
        time: time === "" ? [] : time.split(" "),
        group: dataset.group ?? "",
        diet: dataset.diet ?? "",
        locomotion: dataset.locomotion ?? "",
        integument: dataset.integument ?? "",
        status: dataset.status ?? "",
        year: Number.isNaN(year) ? undefined : year,
    };
}

/**
 * Read a year from a query parameter or a form field.
 *
 * @param text - The text.
 * @returns The year, or undefined when the text is not a whole number.
 */
export function parseYear(text: string | null): number | undefined
{
    if (text === null || !/^\s*\d{1,4}\s*$/.test(text))
    {
        return undefined;
    }

    return Number.parseInt(text, 10);
}

/**
 * Read the chosen filters from a page address's query: "?time=jurassic&diet=carnivore".
 *
 * @param parameters - The query parameters.
 * @returns The criteria; unknown parameters are ignored.
 */
export function readFilterCriteria(parameters: URLSearchParams): GenusFilterCriteria
{
    const criteria = createEmptyCriteria();

    for (const name of choiceFilterNames)
    {
        criteria[name] = parameters.get(name) ?? "";
    }

    criteria.fromYear = parseYear(parameters.get("from"));
    criteria.toYear = parseYear(parameters.get("to"));

    return criteria;
}

/**
 * Write the chosen filters into a page address's query, leaving out filters that are off.
 *
 * @param criteria - The chosen filters.
 * @returns The query parameters.
 */
export function createFilterQuery(criteria: GenusFilterCriteria): URLSearchParams
{
    const parameters = new URLSearchParams();

    for (const name of choiceFilterNames)
    {
        if (criteria[name] !== "")
        {
            parameters.set(name, criteria[name]);
        }
    }

    if (criteria.fromYear !== undefined)
    {
        parameters.set("from", String(criteria.fromYear));
    }

    if (criteria.toYear !== undefined)
    {
        parameters.set("to", String(criteria.toYear));
    }

    return parameters;
}

/**
 * Report whether a genus matches one choice filter.
 *
 * @param values - The genus's filter values.
 * @param criteria - The chosen filters.
 * @param name - The filter.
 * @returns True when the filter is off or the genus has the chosen value.
 */
export function matchesChoice(values: GenusFilterValues, criteria: GenusFilterCriteria, name: ChoiceFilterName): boolean
{
    const chosen = criteria[name];

    if (chosen === "")
    {
        return true;
    }
    else if (name === "time")
    {
        return values.time.includes(chosen);
    }

    return values[name] === chosen;
}

/**
 * Report whether a genus matches every chosen filter, optionally leaving one choice filter out.
 * Leaving a filter out gives the counts shown beside that filter's options: how many genera each
 * option would show, given the other filters.
 *
 * @param values - The genus's filter values.
 * @param criteria - The chosen filters.
 * @param ignoredFilter - A choice filter to leave out, or undefined to apply them all.
 * @returns True when the genus matches.
 */
export function matchesGenusFilters(values: GenusFilterValues, criteria: GenusFilterCriteria, ignoredFilter: ChoiceFilterName | undefined): boolean
{
    for (const name of choiceFilterNames)
    {
        if (name !== ignoredFilter && !matchesChoice(values, criteria, name))
        {
            return false;
        }
    }

    if (criteria.fromYear !== undefined && (values.year === undefined || values.year < criteria.fromYear))
    {
        return false;
    }
    else if (criteria.toYear !== undefined && (values.year === undefined || values.year > criteria.toYear))
    {
        return false;
    }

    return true;
}
