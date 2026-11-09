// The Map page. Loads the places and genera (map/places.json), draws the world map with
// site-map-renderer.ts, and connects the filter form: the map's shading, its dots, the selected
// place's list and the "Genera by place" index all show only the genera that match.

import { formatGenusCount } from "../data/format.ts";
import type { GenusFilterCriteria, GenusFilterValues } from "../data/genus-filters.ts";
import { matchesGenusFilters } from "../data/genus-filters.ts";
import type { SiteMapData, SiteMapGenus, SiteMapPlace } from "../data/site-map.ts";
import type { FilterForm } from "./filter-form.ts";
import { connectFilterForm, findFilterForm, readFormCriteria, updateFilterForm } from "./filter-form.ts";
import type { SiteMapState, SiteMapView } from "./site-map-renderer.ts";

/**
 * The renderer's function that shows new counts, dots and selection on a drawn map.
 */
type UpdateSiteMap = (view: SiteMapView, state: SiteMapState) => void;

/**
 * The parts of the page the script works with, and what it has loaded.
 */
type MapPage = {
    /**
     * The filter form.
     */
    controls: FilterForm;

    /**
     * The map and its panel.
     */
    layout: HTMLElement;

    /**
     * The map container.
     */
    container: HTMLElement;

    /**
     * Where the selected place's genera are listed.
     */
    selection: HTMLElement;

    /**
     * The site's base path, for genus links: "/".
     */
    baseUrl: string;

    /**
     * The places and genera.
     */
    data: SiteMapData;

    /**
     * The filter values of every genus, in data order, for the option counts.
     */
    values: Array<GenusFilterValues>;

    /**
     * Places by key.
     */
    placeByKey: Map<string, SiteMapPlace>;

    /**
     * The drawn map, once MapLibre has loaded; undefined before, or when it cannot be drawn.
     */
    view: SiteMapView | undefined;

    /**
     * The renderer's update function, once loaded.
     */
    updateMap: UpdateSiteMap | undefined;

    /**
     * The selected place's key, or an empty string.
     */
    selectedKey: string;
};

/**
 * Find the genera that match the filters.
 *
 * @param page - The page.
 * @param criteria - The chosen filters.
 * @returns The matching genera, in name order.
 */
function findMatchingGenera(page: MapPage, criteria: GenusFilterCriteria): Array<SiteMapGenus>
{
    const matches = new Array<SiteMapGenus>();

    for (const genus of page.data.genera)
    {
        if (matchesGenusFilters(genus.filterValues, criteria, undefined))
        {
            matches.push(genus);
        }
    }

    return matches;
}

/**
 * Create one genus's entry in the selected place's list: name, authority, and group and epochs.
 *
 * @param page - The page.
 * @param genus - The genus.
 * @returns The list item.
 */
function createSelectionItem(page: MapPage, genus: SiteMapGenus): HTMLLIElement
{
    const item = document.createElement("li");
    const heading = document.createElement("span");
    const link = document.createElement("a");
    const authority = document.createElement("span");
    const details = document.createElement("span");

    heading.className = "selection-heading";
    link.className = "taxon";
    link.href = page.baseUrl + "genus/" + genus.slug + "/";
    link.textContent = genus.name;
    authority.className = "selection-authority";
    authority.textContent = genus.authority;
    details.className = "selection-details";
    details.textContent = genus.details;
    heading.append(link, authority);
    item.append(heading, details);

    return item;
}

/**
 * List the selected place's matching genera in the panel.
 *
 * @param page - The page.
 * @param matches - The genera that match the filters.
 */
function showSelection(page: MapPage, matches: Array<SiteMapGenus>): void
{
    const place = page.placeByKey.get(page.selectedKey);

    if (!place)
    {
        const prompt = document.createElement("p");

        prompt.className = "selection-prompt";
        prompt.textContent = "Select a shaded region or a dot to list its genera.";
        page.selection.replaceChildren(prompt);

        return;
    }

    const heading = document.createElement("h2");
    const count = document.createElement("p");
    const list = document.createElement("ul");

    heading.textContent = place.name;

    for (const genus of matches)
    {
        if (genus.placeKey === place.key)
        {
            list.append(createSelectionItem(page, genus));
        }
    }

    count.className = "selection-count";
    count.textContent = list.children.length === 0 ? "No genera here match the filters." : formatGenusCount(list.children.length);
    page.selection.replaceChildren(heading, count, list);
}

/**
 * Show only the matching genera in the "Genera by place" index, with each country's and
 * region's count updated and empty ones hidden.
 *
 * @param page - The page.
 * @param matchingSlugs - The slugs of the genera that match.
 */
function filterPlaceIndex(page: MapPage, matchingSlugs: Set<string>): void
{
    for (const item of document.querySelectorAll<HTMLElement>("#place-index li[data-genus]"))
    {
        item.hidden = !matchingSlugs.has(item.dataset.genus ?? "");
    }

    // Regions come before their countries in document order, so a country counts its regions'
    // updated totals.
    const groups = [...document.querySelectorAll<HTMLElement>("#place-index [data-place-group]")].reverse();

    for (const group of groups)
    {
        const count = group.querySelectorAll("li[data-genus]:not([hidden])").length;
        const label = group.querySelector<HTMLElement>(".place-count");

        group.hidden = count === 0;

        if (label)
        {
            label.textContent = "(" + count.toLocaleString("en-US") + ")";
        }
    }
}

/**
 * Show what matches the form's filters on the map, in the panel and in the index.
 *
 * @param page - The page.
 */
function applyFilters(page: MapPage): void
{
    const criteria = readFormCriteria(page.controls);
    const matches = findMatchingGenera(page, criteria);
    const counts = new Map<string, number>();
    const points = new Array<SiteMapGenus>();
    const matchingSlugs = new Set<string>();

    for (const genus of matches)
    {
        counts.set(genus.placeKey, (counts.get(genus.placeKey) ?? 0) + 1);
        matchingSlugs.add(genus.slug);

        if (genus.position)
        {
            points.push(genus);
        }
    }

    if (page.view && page.updateMap)
    {
        page.updateMap(page.view, { counts, points, selectedKey: page.selectedKey });
    }

    showSelection(page, matches);
    filterPlaceIndex(page, matchingSlugs);
    updateFilterForm(page.controls, page.values, criteria, matches.length);
}

/**
 * Select a place on the map and list its genera.
 *
 * @param page - The page.
 * @param key - The place's key.
 */
function selectPlace(page: MapPage, key: string): void
{
    page.selectedKey = key;
    applyFilters(page);
}

/**
 * Load MapLibre and draw the map, then show the current filters on it.
 *
 * @param page - The page.
 */
async function drawMap(page: MapPage): Promise<void>
{
    const renderer = await import("./site-map-renderer.ts");
    const state: SiteMapState = { counts: new Map(), points: [], selectedKey: "" };

    page.view = renderer.renderSiteMap(page.container, page.data.places, state, (key) => selectPlace(page, key));
    page.updateMap = renderer.updateSiteMap;

    if (!page.view)
    {
        const message = document.createElement("p");

        message.className = "map-unavailable";
        message.textContent = "The map could not be shown in this browser. The genera are listed by place below.";
        page.container.replaceChildren(message);

        return;
    }

    page.view.map.once("load", () => applyFilters(page));
}

/**
 * Load the places and genera, connect the filter form, and draw the map.
 */
async function initializeMapPage(): Promise<void>
{
    const controls = findFilterForm();
    const layout = document.querySelector<HTMLElement>("#site-map-layout");
    const container = document.querySelector<HTMLElement>("#site-map");
    const selection = document.querySelector<HTMLElement>("#map-selection");

    if (!controls || !layout || !container || !selection)
    {
        return;
    }

    const response = await fetch(container.dataset.places ?? "");

    if (!response.ok)
    {
        return;
    }

    const data = await response.json() as SiteMapData;
    const values = new Array<GenusFilterValues>();
    const placeByKey = new Map<string, SiteMapPlace>();

    for (const genus of data.genera)
    {
        values.push(genus.filterValues);
    }

    for (const place of data.places)
    {
        placeByKey.set(place.key, place);
    }

    const page: MapPage = {
        controls,
        layout,
        container,
        selection,
        baseUrl: container.dataset.base ?? "/",
        data,
        values,
        placeByKey,
        view: undefined,
        updateMap: undefined,
        selectedKey: "",
    };

    layout.hidden = false;
    connectFilterForm(controls, () => applyFilters(page));
    await drawMap(page);
}

void initializeMapPage();
