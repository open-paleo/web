// Filters for the Genera page. The page lists every genus under its letter; this script shows
// the filter form, gathers the matching genera into one list, updates the counts beside each
// option, and keeps the filters in the page address so a filtered list can be bookmarked or
// shared.

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
    readFilterAttributes,
    readFilterCriteria,
} from "../data/genus-filters.ts";

/**
 * One genus in the list, with the values it is filtered on.
 */
type FilteredGenus = {
    /**
     * The genus's list item.
     */
    element: HTMLElement;

    /**
     * Its filter values, read once from its data attributes.
     */
    values: GenusFilterValues;

    /**
     * The list under its letter, where it goes back when the filters are cleared.
     */
    letterList: HTMLElement;
};

/**
 * The parts of the page the script works with.
 */
type FilterPage = {
    /**
     * The filter form.
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

    /**
     * Every genus on the page, in name order.
     */
    genera: Array<FilteredGenus>;

    /**
     * The letter groups.
     */
    letterGroups: Array<HTMLElement>;

    /**
     * The row of letter links.
     */
    letterNavigation: HTMLElement;

    /**
     * The list the matching genera move into while a filter is on.
     */
    results: HTMLElement;
};

/**
 * Find the filter form, the genera and the letter groups.
 *
 * @returns The page's parts, or undefined when the page has no filter form.
 */
function findFilterPage(): FilterPage | undefined
{
    const form = document.querySelector<HTMLFormElement>("#genus-filters");
    const fromField = form?.querySelector<HTMLInputElement>("input[name=from]");
    const toField = form?.querySelector<HTMLInputElement>("input[name=to]");
    const status = document.querySelector<HTMLElement>("#genus-filter-status");
    const clearButton = document.querySelector<HTMLButtonElement>("#genus-filter-clear");
    const letterNavigation = document.querySelector<HTMLElement>(".letter-jump-list");
    const results = document.querySelector<HTMLElement>("#genus-results");

    if (!form || !fromField || !toField || !status || !clearButton || !letterNavigation || !results)
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

    const genera = new Array<FilteredGenus>();
    const letterGroups = new Array<HTMLElement>();

    for (const section of document.querySelectorAll<HTMLElement>(".letter-group"))
    {
        const letterList = section.querySelector<HTMLElement>("ul");

        letterGroups.push(section);

        if (!letterList)
        {
            continue;
        }

        for (const element of letterList.querySelectorAll<HTMLElement>("li[data-group]"))
        {
            genera.push({ element, values: readFilterAttributes(element.dataset), letterList });
        }
    }

    return { form, selects, fromField, toField, status, clearButton, genera, letterGroups, letterNavigation, results };
}

/**
 * Read the chosen filters from the form.
 *
 * @param page - The page's parts.
 * @returns The criteria.
 */
function readFormCriteria(page: FilterPage): GenusFilterCriteria
{
    const criteria = createEmptyCriteria();

    for (const [name, select] of page.selects)
    {
        criteria[name] = select.value;
    }

    criteria.fromYear = parseYear(page.fromField.value);
    criteria.toYear = parseYear(page.toField.value);

    return criteria;
}

/**
 * Set the form to the given filters. A value the list does not offer, from an old or mistyped
 * address, turns that filter off.
 *
 * @param page - The page's parts.
 * @param criteria - The filters to show.
 */
function writeFormCriteria(page: FilterPage, criteria: GenusFilterCriteria): void
{
    for (const [name, select] of page.selects)
    {
        select.value = criteria[name];

        if (select.value !== criteria[name])
        {
            select.value = "";
        }
    }

    page.fromField.value = criteria.fromYear === undefined ? "" : String(criteria.fromYear);
    page.toField.value = criteria.toYear === undefined ? "" : String(criteria.toYear);
}

/**
 * Update the count beside each option of one filter: how many genera that option would show,
 * given the other filters.
 *
 * @param page - The page's parts.
 * @param criteria - The chosen filters.
 * @param name - The filter.
 * @param select - The filter's list.
 */
function updateOptionCounts(page: FilterPage, criteria: GenusFilterCriteria, name: ChoiceFilterName, select: HTMLSelectElement): void
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

        for (const genus of page.genera)
        {
            if (matchesChoice(genus.values, optionCriteria, name) && matchesGenusFilters(genus.values, criteria, name))
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
 * Show the genera that match the form's filters, then update the option counts, the summary
 * and the page address. While a filter is on, the matches move into one list and the letter
 * groups are hidden; with every filter off, each genus goes back under its letter.
 *
 * @param page - The page's parts.
 */
function applyFilters(page: FilterPage): void
{
    const criteria = readFormCriteria(page);
    const isFiltered = hasActiveFilter(criteria);
    const matches = new Array<HTMLElement>();

    for (const genus of page.genera)
    {
        if (!isFiltered)
        {
            genus.letterList.append(genus.element);
        }
        else if (matchesGenusFilters(genus.values, criteria, undefined))
        {
            matches.push(genus.element);
        }
    }

    page.results.replaceChildren(...matches);
    page.results.hidden = !isFiltered;
    page.letterNavigation.hidden = isFiltered;

    for (const section of page.letterGroups)
    {
        section.hidden = isFiltered;
    }

    for (const [name, select] of page.selects)
    {
        updateOptionCounts(page, criteria, name, select);
    }

    page.status.textContent = describeShownGenera(isFiltered ? matches.length : page.genera.length, page.genera.length);
    page.clearButton.hidden = !isFiltered;

    const address = new URL(window.location.href);

    address.search = createFilterQuery(criteria).toString();
    window.history.replaceState(null, "", address);
}

/**
 * Turn every filter off.
 *
 * @param page - The page's parts.
 */
function clearFilters(page: FilterPage): void
{
    writeFormCriteria(page, createEmptyCriteria());
    applyFilters(page);
}

/**
 * Show the filter form, apply the filters in the page address, and follow changes to the form.
 */
function initializeGenusFilters(): void
{
    const page = findFilterPage();

    if (!page)
    {
        return;
    }

    writeFormCriteria(page, readFilterCriteria(new URLSearchParams(window.location.search)));
    page.form.hidden = false;
    applyFilters(page);
    page.form.addEventListener("change", () => applyFilters(page));
    page.form.addEventListener("input", () => applyFilters(page));
    page.form.addEventListener("submit", (event) => event.preventDefault());
    page.clearButton.addEventListener("click", () => clearFilters(page));
}

initializeGenusFilters();
