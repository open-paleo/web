// Filters for the Genera page. The page lists every genus under its letter; with a filter on,
// this script shows copies of the matching genera in one list and hides the letter groups. The
// form itself is handled by filter-form.ts, shared with the Map page.

import type { GenusFilterValues } from "../data/genus-filters.ts";
import { hasActiveFilter, matchesGenusFilters, readFilterAttributes } from "../data/genus-filters.ts";
import type { FilterForm } from "./filter-form.ts";
import { connectFilterForm, findFilterForm, readFormCriteria, updateFilterForm } from "./filter-form.ts";

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
     * Its copy for the list of matches, made the first time it matches.
     */
    copy: HTMLElement | undefined;
};

/**
 * The parts of the page the script works with.
 */
type FilterPage = {
    /**
     * The filter form.
     */
    controls: FilterForm;

    /**
     * Every genus on the page, in name order.
     */
    genera: Array<FilteredGenus>;

    /**
     * The filter values of every genus, in the same order, for the option counts.
     */
    values: Array<GenusFilterValues>;

    /**
     * The letter groups.
     */
    letterGroups: Array<HTMLElement>;

    /**
     * The row of letter links.
     */
    letterNavigation: HTMLElement;

    /**
     * The list that shows copies of the matching genera while a filter is on.
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
    const controls = findFilterForm();
    const letterNavigation = document.querySelector<HTMLElement>(".letter-jump-list");
    const results = document.querySelector<HTMLElement>("#genus-results");

    if (!controls || !letterNavigation || !results)
    {
        return undefined;
    }

    const genera = new Array<FilteredGenus>();
    const values = new Array<GenusFilterValues>();
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
            const genus: FilteredGenus = { element, values: readFilterAttributes(element.dataset), copy: undefined };

            genera.push(genus);
            values.push(genus.values);
        }
    }

    return { controls, genera, values, letterGroups, letterNavigation, results };
}

/**
 * Show the genera that match the form's filters. While a filter is on, copies of the matches fill
 * one list and the letter groups are hidden; when every filter goes off, the list empties and the
 * letter groups show again. The genera under their letters never move, so clearing the filters
 * costs no more than laying out the letter groups on screen.
 *
 * @param page - The page's parts.
 */
function applyFilters(page: FilterPage): void
{
    const criteria = readFormCriteria(page.controls);
    const isFiltered = hasActiveFilter(criteria);
    const matches = new Array<HTMLElement>();

    if (isFiltered)
    {
        for (const genus of page.genera)
        {
            if (matchesGenusFilters(genus.values, criteria, undefined))
            {
                genus.copy ??= genus.element.cloneNode(true) as HTMLElement;
                matches.push(genus.copy);
            }
        }
    }

    page.results.replaceChildren(...matches);
    page.results.hidden = !isFiltered;
    page.letterNavigation.hidden = isFiltered;

    for (const section of page.letterGroups)
    {
        section.hidden = isFiltered;
    }

    updateFilterForm(page.controls, page.values, criteria, isFiltered ? matches.length : page.genera.length);
}

/**
 * Connect the filter form to the list.
 */
function initializeGenusFilters(): void
{
    const page = findFilterPage();

    if (page)
    {
        connectFilterForm(page.controls, () => applyFilters(page));
    }
}

initializeGenusFilters();
