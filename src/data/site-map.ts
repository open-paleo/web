import type { GeologicTimeline } from "./age-figure.ts";
import { formatCountry } from "./format.ts";
import type { GenusFilterValues } from "./genus-filters.ts";
import type { GenusIndexRow } from "./genus-index.ts";
import { createGenusIndexRows } from "./genus-index.ts";
import { findLabelPosition } from "./genus-map.ts";
import { simplifyPolygons } from "./map-geometry.ts";
import type { MapPolygon, MapPosition, MapShapes } from "./map-shapes.ts";
import { getTypeSpecies } from "./records.ts";
import type { SiteData } from "./site-data.ts";

/**
 * Whether a place on the Map page is a region or, where no region outline is known, a country.
 */
export type SiteMapPlaceKind = "region" | "country";

/**
 * A region or country the Map page shades by its number of genera.
 */
export type SiteMapPlace = {
    /**
     * The region or country code: "US-MT", "MA".
     */
    key: string;

    /**
     * The place's name: "Montana, United States", "Morocco".
     */
    name: string;

    /**
     * Whether it is a region or a whole country.
     */
    kind: SiteMapPlaceKind;

    /**
     * The outline.
     */
    polygons: Array<MapPolygon>;

    /**
     * A point inside the outline, for selecting the place from the keyboard list.
     */
    labelPosition: MapPosition;
};

/**
 * One genus as the Map page's script needs it.
 */
export type SiteMapGenus = {
    /**
     * Genus name.
     */
    name: string;

    /**
     * URL path segment of its page.
     */
    slug: string;

    /**
     * Authority: "Osborn, 1905".
     */
    authority: string;

    /**
     * Group and epochs: "Theropoda, Late Cretaceous".
     */
    details: string;

    /**
     * The key of its type species' place.
     */
    placeKey: string;

    /**
     * Its type species' published coordinates, or null when there are none.
     */
    position: MapPosition | null;

    /**
     * The values the filters match it on.
     */
    filterValues: GenusFilterValues;
};

/**
 * Everything the Map page's script loads: the places and the genera in them.
 */
export type SiteMapData = {
    /**
     * Every place a genus's type species was found, regions and countries.
     */
    places: Array<SiteMapPlace>;

    /**
     * Every genus with a place, sorted by name.
     */
    genera: Array<SiteMapGenus>;
};

/**
 * The genera of one region in the "Genera by place" index.
 */
export type PlaceIndexRegion = {
    /**
     * The region's name, or "Region not recorded".
     */
    name: string;

    /**
     * The genera, sorted by name.
     */
    rows: Array<GenusIndexRow>;
};

/**
 * The genera of one country in the "Genera by place" index.
 */
export type PlaceIndexCountry = {
    /**
     * Country name: "United States".
     */
    name: string;

    /**
     * Number of genera.
     */
    count: number;

    /**
     * Its regions, sorted by name, with "Region not recorded" last.
     */
    regions: Array<PlaceIndexRegion>;
};

/**
 * Where a genus sits on the Map page: its place's key, name and kind, and outline.
 */
type GenusPlace = {
    /**
     * The place.
     */
    place: SiteMapPlace;

    /**
     * Published coordinates of the type species, if any.
     */
    position: MapPosition | null;
};

const regionNotRecorded = "Region not recorded";

// The Map page opens on the whole world, so its outlines are simplified further than the genus
// maps' and rounded to two decimal places (about a kilometer): the file is downloaded whole.
const worldTolerance = 0.03;
const worldDigits = 2;

/**
 * Find the place a genus is counted in on the Map page: its type species' region, or its country
 * when the region is not recorded or has no outline.
 *
 * @param row - The genus's row.
 * @param shapes - The region and country outlines.
 * @returns The place and any coordinates, or undefined when the genus has no place with an
 * outline.
 */
function findGenusPlace(row: GenusIndexRow, shapes: MapShapes): GenusPlace | undefined
{
    const location = getTypeSpecies(row.entry.record).location;

    if (!location?.country)
    {
        return undefined;
    }

    const coordinates = location.coordinates;
    const position: MapPosition | null = coordinates ? [coordinates[1], coordinates[0]] : null;
    const region = location.region_code ? shapes.regions[location.region_code] : undefined;
    const country = shapes.countries[location.country];

    if (region && location.region_code)
    {
        const name = (location.region ?? location.region_code) + ", " + formatCountry(location.country);

        return { place: { key: location.region_code, name, kind: "region", polygons: region, labelPosition: findLabelPosition(region) }, position };
    }
    else if (country)
    {
        const name = formatCountry(location.country);

        return { place: { key: location.country, name, kind: "country", polygons: country, labelPosition: findLabelPosition(country) }, position };
    }

    return undefined;
}

/**
 * Create what the Map page's script loads: every place with its outline, and every genus with
 * the place it is counted in.
 *
 * @param siteData - The lookup tables.
 * @param timeline - The arranged timescale, if the dataset has one.
 * @param shapes - The region and country outlines.
 * @returns The places and genera.
 */
export function createSiteMapData(siteData: SiteData, timeline: GeologicTimeline | undefined, shapes: MapShapes): SiteMapData
{
    const placesByKey = new Map<string, SiteMapPlace>();
    const genera = new Array<SiteMapGenus>();

    for (const row of createGenusIndexRows(siteData.genera, siteData, timeline, "place"))
    {
        const genusPlace = findGenusPlace(row, shapes);

        if (!genusPlace)
        {
            continue;
        }

        const detailTexts = new Array<string>();

        for (const detail of row.details)
        {
            detailTexts.push(detail.text);
        }

        if (!placesByKey.has(genusPlace.place.key))
        {
            const polygons = simplifyPolygons(genusPlace.place.polygons, worldTolerance, worldDigits);

            placesByKey.set(genusPlace.place.key, { ...genusPlace.place, polygons: polygons.length > 0 ? polygons : genusPlace.place.polygons });
        }

        genera.push({
            name: row.entry.name,
            slug: row.entry.slug,
            authority: row.authority,
            details: detailTexts.join(", "),
            placeKey: genusPlace.place.key,
            position: genusPlace.position,
            filterValues: row.filterValues,
        });
    }

    return { places: [...placesByKey.values()], genera };
}

/**
 * Group the genera by the country and region of their type species, for the "Genera by place"
 * index under the map.
 *
 * @param rows - The genera's rows, sorted by name.
 * @returns The countries, sorted by name, each with its regions.
 */
export function groupGeneraByPlace(rows: Array<GenusIndexRow>): Array<PlaceIndexCountry>
{
    const countries = new Map<string, Map<string, Array<GenusIndexRow>>>();

    for (const row of rows)
    {
        const location = getTypeSpecies(row.entry.record).location;

        if (!location?.country)
        {
            continue;
        }

        const countryName = formatCountry(location.country);
        const regions = countries.get(countryName) ?? new Map<string, Array<GenusIndexRow>>();
        const regionName = location.region ?? regionNotRecorded;
        const regionRows = regions.get(regionName) ?? new Array<GenusIndexRow>();

        regionRows.push(row);
        regions.set(regionName, regionRows);
        countries.set(countryName, regions);
    }

    const index = new Array<PlaceIndexCountry>();

    for (const [name, regions] of countries)
    {
        const regionList = new Array<PlaceIndexRegion>();
        let count = 0;

        for (const [regionName, regionRows] of regions)
        {
            regionList.push({ name: regionName, rows: regionRows });
            count += regionRows.length;
        }

        regionList.sort(compareRegions);
        index.push({ name, count, regions: regionList });
    }

    index.sort((first, second) => first.name.localeCompare(second.name, "en"));

    return index;
}

/**
 * Order regions by name, with "Region not recorded" last.
 *
 * @param first - One region.
 * @param second - The other.
 * @returns A negative number when the first comes first.
 */
function compareRegions(first: PlaceIndexRegion, second: PlaceIndexRegion): number
{
    if ((first.name === regionNotRecorded) !== (second.name === regionNotRecorded))
    {
        return first.name === regionNotRecorded ? 1 : -1;
    }

    return first.name.localeCompare(second.name, "en");
}

/**
 * List the genera in the "Genera by place" index, country by country, for the filter form's
 * option counts.
 *
 * @param countries - The index.
 * @returns Every genus in it, in index order.
 */
export function listPlaceIndexRows(countries: Array<PlaceIndexCountry>): Array<GenusIndexRow>
{
    const rows = new Array<GenusIndexRow>();

    for (const country of countries)
    {
        for (const region of country.regions)
        {
            rows.push(...region.rows);
        }
    }

    return rows;
}
