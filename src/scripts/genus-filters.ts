// Filters for the Genera page. The page lists every genus under its letter; with a filter on,
// this script gathers the matching genera into one list and hides the letter groups. The form
// itself is handled by filter-form.ts, shared with the Map page.

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
            const genus = { element, values: readFilterAttributes(element.dataset), letterList };

            genera.push(genus);
            values.push(genus.values);
        }
    }

    return { controls, genera, values, letterGroups, letterNavigation, results };
}

/**
 * Show the genera that match the form's filters. While a filter is on, the matches move into one
 * list and the letter groups are hidden; with every filter off, each genus goes back under its
 * letter.
 *
 * @param page - The page's parts.
 */
function applyFilters(page: FilterPage): void
{
    const criteria = readFormCriteria(page.controls);
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
