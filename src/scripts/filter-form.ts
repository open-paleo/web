// The genus filter form shared by the Genera page and the Map page (GenusFilterForm.astro):
// reading and setting its fields, the counts beside each option, the summary sentence, and
// keeping the filters in the page address. Each page decides what matching genera look like.

import { formatGenusCount } from "../data/format.ts";
import type { ChoiceFilterName, GenusFilterCriteria, GenusFilterValues } from "../data/genus-filters.ts";
import {
    choiceFilterNames,
    createEmptyCriteria,
    createFilterQuery,
    hasActiveFilter,
    matchesChoice,
    matchesGenusFilters,
    parseYear,
    readFilterCriteria,
} from "../data/genus-filters.ts";

/**
 * The parts of the filter form the scripts work with.
 */
export type FilterForm = {
    /**
     * The form.
     */
    form: HTMLFormElement;

    /**
     * Each choice filter's list.
     */
    selects: Map<ChoiceFilterName, HTMLSelectElement>;

    /**
     * The earliest-year field.
     */
    fromField: HTMLInputElement;

    /**
     * The latest-year field.
     */
    toField: HTMLInputElement;

    /**
     * The sentence that says how many genera are shown.
     */
    status: HTMLElement;

    /**
     * The button that turns every filter off.
     */
    clearButton: HTMLButtonElement;
};

/**
 * Find the filter form's parts.
 *
 * @returns The parts, or undefined when the page has no filter form.
 */
export function findFilterForm(): FilterForm | undefined
{
    const form = document.querySelector<HTMLFormElement>("#genus-filters");
    const fromField = form?.querySelector<HTMLInputElement>("input[name=from]");
    const toField = form?.querySelector<HTMLInputElement>("input[name=to]");
    const status = document.querySelector<HTMLElement>("#genus-filter-status");
    const clearButton = document.querySelector<HTMLButtonElement>("#genus-filter-clear");

    if (!form || !fromField || !toField || !status || !clearButton)
    {
        return undefined;
    }

    const selects = new Map<ChoiceFilterName, HTMLSelectElement>();

    for (const name of choiceFilterNames)
    {
        const select = form.querySelector<HTMLSelectElement>("select[name=" + name + "]");

        if (select)
        {
            selects.set(name, select);
        }
    }

    return { form, selects, fromField, toField, status, clearButton };
}

/**
 * Read the chosen filters from the form.
 *
 * @param controls - The form's parts.
 * @returns The criteria.
 */
export function readFormCriteria(controls: FilterForm): GenusFilterCriteria
{
    const criteria = createEmptyCriteria();

    for (const [name, select] of controls.selects)
    {
        criteria[name] = select.value;
    }

    criteria.fromYear = parseYear(controls.fromField.value);
    criteria.toYear = parseYear(controls.toField.value);

    return criteria;
}

/**
 * Set the form to the given filters. A value the list does not offer, from an old or mistyped
 * address, turns that filter off.
 *
 * @param controls - The form's parts.
 * @param criteria - The filters to show.
 */
function writeFormCriteria(controls: FilterForm, criteria: GenusFilterCriteria): void
{
    for (const [name, select] of controls.selects)
    {
        select.value = criteria[name];

        if (select.value !== criteria[name])
        {
            select.value = "";
        }
    }

    controls.fromField.value = criteria.fromYear === undefined ? "" : String(criteria.fromYear);
    controls.toField.value = criteria.toYear === undefined ? "" : String(criteria.toYear);
}

/**
 * Update the count beside each option of one filter: how many genera that option would show,
 * given the other filters.
 *
 * @param genera - The filter values of every genus the page shows.
 * @param criteria - The chosen filters.
 * @param name - The filter.
 * @param select - The filter's list.
 */
function updateFilterOptionCounts(genera: Array<GenusFilterValues>, criteria: GenusFilterCriteria, name: ChoiceFilterName, select: HTMLSelectElement): void
{
    const counts = new Map<string, number>();
    const optionCriteria = { ...criteria };

    for (const option of select.options)
    {
        if (option.value === "")
        {
            continue;
        }

        optionCriteria[name] = option.value;
        let count = 0;

        for (const values of genera)
        {
            if (matchesChoice(values, optionCriteria, name) && matchesGenusFilters(values, criteria, name))
            {
                count++;
            }
        }

        counts.set(option.value, count);
    }

    // An option that would show no genera is disabled, unless it is the one chosen, so the
    // list never offers a dead end but still shows what is selected.
    for (const option of select.options)
    {
        const label = option.dataset.label;
        const count = counts.get(option.value) ?? 0;

        if (label !== undefined)
        {
            option.textContent = label + " (" + count.toLocaleString("en-US") + ")";
            option.disabled = count === 0 && option.value !== select.value;
        }
    }
}

/**
 * Describe how many genera are shown.
 *
 * @param shown - Genera that match.
 * @param total - Genera on the page.
 * @returns The sentence.
 */
function describeShownGenera(shown: number, total: number): string
{
    if (shown === total)
    {
        return "Showing all " + formatGenusCount(total) + ".";
    }
    else if (shown === 0)
    {
        return "No genera match these filters.";
    }

    return "Showing " + shown.toLocaleString("en-US") + " of " + formatGenusCount(total) + ".";
}

/**
 * Bring the form up to date after the filters change: the option counts, the summary sentence,
 * the "Clear filters" button and the page address.
 *
 * @param controls - The form's parts.
 * @param genera - The filter values of every genus the page shows.
 * @param criteria - The chosen filters.
 * @param shown - How many genera match them.
 */
export function updateFilterForm(controls: FilterForm, genera: Array<GenusFilterValues>, criteria: GenusFilterCriteria, shown: number): void
{
    for (const [name, select] of controls.selects)
    {
        updateFilterOptionCounts(genera, criteria, name, select);
    }

    controls.status.textContent = describeShownGenera(shown, genera.length);
    controls.clearButton.hidden = !hasActiveFilter(criteria);

    const address = new URL(window.location.href);

    address.search = createFilterQuery(criteria).toString();
    window.history.replaceState(null, "", address);
}

/**
 * Show the form with the filters from the page address, and call back whenever they change.
 *
 * @param controls - The form's parts.
 * @param applyFilters - Shows the genera that match the form's filters.
 */
export function connectFilterForm(controls: FilterForm, applyFilters: () => void): void
{
    writeFormCriteria(controls, readFilterCriteria(new URLSearchParams(window.location.search)));
    controls.form.hidden = false;
    applyFilters();
    controls.form.addEventListener("change", applyFilters);
    controls.form.addEventListener("input", applyFilters);
    controls.form.addEventListener("submit", (event) => event.preventDefault());
    controls.clearButton.addEventListener("click", () =>
    {
        writeFormCriteria(controls, createEmptyCriteria());
        applyFilters();
    });
}
