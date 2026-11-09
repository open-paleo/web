import * as fs from "node:fs";
import * as path from "node:path";

import type { Genus, Location } from "./dataset.ts";
import { formatPlace, formatStratigraphicUnits, joinNonEmpty } from "./format.ts";
import type { MapPolygon, MapPosition, MapShapes } from "./map-shapes.ts";

/**
 * How precisely a place is known: published coordinates, only the region, or only the country.
 */
export type MapPrecision = "point" | "region" | "country";

/**
 * Where one species was found, as the genus map draws it.
 */
export type GenusMapPlace = {
    /**
     * The species: "Tyrannosaurus rex".
     */
    speciesName: string;

    /**
     * Whether it is the type species, which the map draws more strongly.
     */
    isTypeSpecies: boolean;

    /**
     * How precisely the place is known, which decides the mark: a dot, a shaded region or a
     * shaded country.
     */
    precision: MapPrecision;

    /**
     * The place in words: "Hell Creek Formation, Montana, United States".
     */
    description: string;

    /**
     * How the map shows the place and why: "published coordinates", "region shaded; no
     * coordinates published".
     */
    precisionNote: string;

    /**
     * What the mark stands on, so species found at the same place share one mark: the
     * coordinates, region code or country code.
     */
    placeKey: string;

    /**
     * The coordinates, for a point.
     */
    position: MapPosition | undefined;

    /**
     * The shaded outline, for a region or country.
     */
    polygons: Array<MapPolygon>;
};

/**
 * The area a map opens on: [[west, south], [east, north]] in degrees.
 */
export type MapBounds = [MapPosition, MapPosition];

/**
 * Everything a genus page's map draws.
 */
export type GenusMap = {
    /**
     * One place per species with a location, the type species first.
     */
    places: Array<GenusMapPlace>;

    /**
     * The area covering every place.
     */
    bounds: MapBounds;
};

/**
 * The geometry and properties of one mark on the map, in GeoJSON form for MapLibre.
 */
export type GenusMapFeature = {
    /**
     * Always "Feature".
     */
    type: "Feature";

    /**
     * What the mark says about the place.
     */
    properties: GenusMapFeatureProperties;

    /**
     * The mark's geometry.
     */
    geometry: GenusMapGeometry;
};

/**
 * What a feature draws: a shaded area, a dot, or the label of a shaded area.
 */
export type GenusMapFeatureKind = "area" | "point" | "label";

/**
 * The properties the map styles and labels a mark by.
 */
export type GenusMapFeatureProperties = {
    /**
     * What the feature draws.
     */
    kind: GenusMapFeatureKind;

    /**
     * The species at the place, abbreviated, for the map label: "P. mongoliensis", or
     * "D. horneri, D. wilsoni" when several share the place.
     */
    label: string;

    /**
     * What the popup says, one line per species: "Psittacosaurus mongoliensis: Cannonball
     * Member, Öösh Formation, Övörkhangai, Mongolia".
     */
    details: string;

    /**
     * How precisely the place is known.
     */
    precision: MapPrecision;

    /**
     * Whether the type species is among the species at the place.
     */
    isTypeSpecies: boolean;
};

/**
 * Species found at one place, gathered while the features are built.
 */
type SharedPlace = {
    /**
     * The first species' place, which gives the mark its geometry and precision.
     */
    place: GenusMapPlace;

    /**
     * The abbreviated names of every species at the place.
     */
    labels: Array<string>;

    /**
     * One popup line per species.
     */
    details: Array<string>;

    /**
     * Whether the type species is among them.
     */
    isTypeSpecies: boolean;
};

/**
 * A point or a multipolygon, in GeoJSON form.
 */
export type GenusMapGeometry = {
    /**
     * "Point" or "MultiPolygon".
     */
    type: "Point" | "MultiPolygon";

    /**
     * A position for a point; polygons for a multipolygon.
     */
    coordinates: MapPosition | Array<MapPolygon>;
};

/**
 * The marks of a genus map, in GeoJSON form.
 */
export type GenusMapFeatureCollection = {
    /**
     * Always "FeatureCollection".
     */
    type: "FeatureCollection";

    /**
     * The marks: shaded areas first, so dots draw over them.
     */
    features: Array<GenusMapFeature>;
};

// The latitudes the map can show. Web maps cannot reach the poles, so an outline such as
// Antarctica's is cut to these for opening the map.
const southernmostLatitude = -78;
const northernmostLatitude = 84;

let cachedMapShapes: MapShapes | undefined;

/**
 * Read the region and country outlines once per build. The file is read rather than imported so
 * TypeScript does not infer a type from 1.3 MB of coordinates.
 *
 * @returns The outlines file.
 */
export function getMapShapes(): MapShapes
{
    if (!cachedMapShapes)
    {
        cachedMapShapes = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "data", "map-shapes.json"), "utf8")) as MapShapes;
    }

    return cachedMapShapes;
}

/**
 * Find how precisely a location is known and the outline to shade for it.
 *
 * @param location - The species' location.
 * @param shapes - The region and country outlines.
 * @returns The precision and the outline (empty for a point, or when no outline is known).
 */
function locatePlace(location: Location, shapes: MapShapes): [MapPrecision, Array<MapPolygon>]
{
    if (location.coordinates)
    {
        return ["point", []];
    }

    const region = location.region_code ? shapes.regions[location.region_code] : undefined;

    if (region)
    {
        return ["region", region];
    }

    return ["country", location.country ? shapes.countries[location.country] ?? [] : []];
}

/**
 * Describe how the map shows a place and why.
 *
 * @param precision - How precisely the place is known.
 * @param location - The species' location.
 * @returns The note: "published coordinates", "region shaded; no coordinates published".
 */
function describePrecision(precision: MapPrecision, location: Location): string
{
    if (precision === "point")
    {
        return "published coordinates";
    }
    else if (precision === "region")
    {
        return "region shaded; no coordinates published";
    }

    return location.region_code
        ? "country shaded; no outline for its region"
        : "country shaded; no region recorded";
}

/**
 * Report region codes that have no outline and are not known to lack one, so a new region in
 * the dataset is noticed: its species would otherwise be drawn at country level without anyone
 * deciding that.
 *
 * @param location - The species' location.
 * @param shapes - The region and country outlines.
 * @returns A warning, or an empty string.
 */
export function findMissingOutline(location: Location, shapes: MapShapes): string
{
    const code = location.region_code;

    if (!code || location.coordinates || shapes.regions[code] || shapes.regionsWithoutOutline.includes(code))
    {
        return "";
    }

    return "No outline for region " + code + "; run npm run create-map-shapes";
}

/**
 * Warn during the build about each species whose region has no outline and is not known to lack
 * one, so a new region in the dataset is noticed rather than silently drawn at country level.
 *
 * @param genus - The genus record.
 * @param shapes - The region and country outlines.
 */
export function warnAboutMissingOutlines(genus: Genus, shapes: MapShapes): void
{
    for (const species of genus.species)
    {
        const warning = species.location ? findMissingOutline(species.location, shapes) : "";

        if (warning !== "")
        {
            console.warn(species.name + ": " + warning);
        }
    }
}

/**
 * Widen bounds to take in a point.
 *
 * @param bounds - The bounds so far, or undefined for none.
 * @param position - The point.
 * @returns The widened bounds.
 */
function extendBounds(bounds: MapBounds | undefined, position: MapPosition): MapBounds
{
    const latitude = Math.min(Math.max(position[1], southernmostLatitude), northernmostLatitude);

    if (!bounds)
    {
        return [[position[0], latitude], [position[0], latitude]];
    }

    return [
        [Math.min(bounds[0][0], position[0]), Math.min(bounds[0][1], latitude)],
        [Math.max(bounds[1][0], position[0]), Math.max(bounds[1][1], latitude)],
    ];
}

/**
 * Work out what a genus page's map draws: one place per species with a location, at the
 * precision it is known to.
 *
 * @param genus - The genus record.
 * @param shapes - The region and country outlines.
 * @returns The map, or undefined when no species has a place the map can draw.
 */
export function createGenusMap(genus: Genus, shapes: MapShapes): GenusMap | undefined
{
    const places = new Array<GenusMapPlace>();
    let bounds: MapBounds | undefined;

    for (const species of genus.species)
    {
        const location = species.location;

        if (!location)
        {
            continue;
        }

        const [precision, polygons] = locatePlace(location, shapes);
        const position: MapPosition | undefined = location.coordinates ? [location.coordinates[1], location.coordinates[0]] : undefined;

        if (!position && polygons.length === 0)
        {
            continue;
        }

        const place: GenusMapPlace = {
            speciesName: species.name,
            isTypeSpecies: species.type_species === true,
            precision,
            description: joinNonEmpty([formatStratigraphicUnits(location), formatPlace(location)]),
            precisionNote: describePrecision(precision, location),
            placeKey: position ? position.join(",") : (precision === "region" ? location.region_code ?? "" : location.country ?? ""),
            position,
            polygons,
        };

        if (place.isTypeSpecies)
        {
            places.unshift(place);
        }
        else
        {
            places.push(place);
        }

        if (position)
        {
            bounds = extendBounds(bounds, position);
        }

        for (const polygon of polygons)
        {
            for (const point of polygon[0])
            {
                bounds = extendBounds(bounds, point);
            }
        }
    }

    return bounds ? { places, bounds } : undefined;
}

/**
 * Abbreviate a species name for a map label: "Psittacosaurus mongoliensis" becomes
 * "P. mongoliensis".
 *
 * @param name - The species name.
 * @returns The name with the genus shortened to its initial.
 */
export function abbreviateSpeciesName(name: string): string
{
    const space = name.indexOf(" ");

    return space === -1 ? name : name.charAt(0) + "." + name.slice(space);
}

/**
 * Measure a ring's area with the shoelace formula, in square degrees.
 *
 * @param ring - The ring.
 * @returns The area, positive whichever way the ring runs.
 */
function measureRingArea(ring: Array<MapPosition>): number
{
    let doubledArea = 0;

    for (let index = 0; index < ring.length - 1; index++)
    {
        doubledArea += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
    }

    return Math.abs(doubledArea) / 2;
}

/**
 * Find where a horizontal line crosses a ring.
 *
 * @param ring - The ring.
 * @param latitude - The line's latitude.
 * @returns The longitudes of the crossings, sorted west to east.
 */
function findRingCrossings(ring: Array<MapPosition>, latitude: number): Array<number>
{
    const crossings = new Array<number>();

    for (let index = 0; index < ring.length - 1; index++)
    {
        const [startLongitude, startLatitude] = ring[index];
        const [endLongitude, endLatitude] = ring[index + 1];

        if ((startLatitude <= latitude) !== (endLatitude <= latitude))
        {
            crossings.push(startLongitude + (latitude - startLatitude) / (endLatitude - startLatitude) * (endLongitude - startLongitude));
        }
    }

    crossings.sort((first, second) => first - second);

    return crossings;
}

/**
 * Find a point inside an outline to put its label on: on the line through the middle of its
 * largest polygon, halfway across the widest stretch of land that line crosses. Unlike the
 * centroid, this lies inside crescent- and ring-shaped outlines too.
 *
 * @param polygons - The outline.
 * @returns The label's position.
 */
export function findLabelPosition(polygons: Array<MapPolygon>): MapPosition
{
    let largest = polygons[0][0];
    let largestArea = -1;

    for (const polygon of polygons)
    {
        const area = measureRingArea(polygon[0]);

        if (area > largestArea)
        {
            largest = polygon[0];
            largestArea = area;
        }
    }

    let south = Number.POSITIVE_INFINITY;
    let north = Number.NEGATIVE_INFINITY;

    for (const point of largest)
    {
        south = Math.min(south, point[1]);
        north = Math.max(north, point[1]);
    }

    const latitude = (south + north) / 2;
    const crossings = findRingCrossings(largest, latitude);
    let bestWest = largest[0][0];
    let bestWidth = -1;

    for (let index = 0; index + 1 < crossings.length; index += 2)
    {
        if (crossings[index + 1] - crossings[index] > bestWidth)
        {
            bestWest = crossings[index];
            bestWidth = crossings[index + 1] - crossings[index];
        }
    }

    return [bestWest + Math.max(bestWidth, 0) / 2, latitude];
}

/**
 * Gather the species found at the same place, so they share one mark and one label.
 *
 * @param map - The genus map.
 * @returns The places, in the order their first species is listed (the type species first).
 */
function gatherSharedPlaces(map: GenusMap): Array<SharedPlace>
{
    const placesByKey = new Map<string, SharedPlace>();

    for (const place of map.places)
    {
        const shared = placesByKey.get(place.placeKey) ?? { place, labels: [], details: [], isTypeSpecies: false };

        shared.labels.push(abbreviateSpeciesName(place.speciesName));
        shared.details.push(place.speciesName + ": " + place.description);
        shared.isTypeSpecies ||= place.isTypeSpecies;
        placesByKey.set(place.placeKey, shared);
    }

    return [...placesByKey.values()];
}

/**
 * Turn a genus map's places into GeoJSON for MapLibre: one shaded area or dot per place, shared
 * by the species found there, and a label point inside each area. Areas come first, so dots and
 * labels draw over them.
 *
 * @param map - The genus map.
 * @returns The marks.
 */
export function createGenusMapFeatures(map: GenusMap): GenusMapFeatureCollection
{
    const areas = new Array<GenusMapFeature>();
    const marks = new Array<GenusMapFeature>();

    for (const shared of gatherSharedPlaces(map))
    {
        const place = shared.place;
        const properties: GenusMapFeatureProperties = {
            kind: "area",
            label: shared.labels.join(", "),
            details: shared.details.join("\n"),
            precision: place.precision,
            isTypeSpecies: shared.isTypeSpecies,
        };

        if (place.position)
        {
            marks.push({ type: "Feature", properties: { ...properties, kind: "point" }, geometry: { type: "Point", coordinates: place.position } });
        }
        else
        {
            areas.push({ type: "Feature", properties, geometry: { type: "MultiPolygon", coordinates: place.polygons } });
            marks.push({ type: "Feature", properties: { ...properties, kind: "label" }, geometry: { type: "Point", coordinates: findLabelPosition(place.polygons) } });
        }
    }

    return { type: "FeatureCollection", features: [...areas, ...marks] };
}
