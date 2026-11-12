// The base map shared by every map on the site: OpenFreeMap's OpenStreetMap tiles (OpenMapTiles
// schema) styled from the --color-map-* tokens, so maps match the page in light and dark mode.
// Importing this module also loads MapLibre's styles and tells it where its worker is.

import "maplibre-gl/dist/maplibre-gl.css";
import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

/**
 * The map's colors, read from the theme's tokens.
 */
export type MapColors = {
    /**
     * Land: --color-map-land.
     */
    land: string;

    /**
     * Seas, lakes and rivers: --color-map-water.
     */
    water: string;

    /**
     * Country borders: --color-map-border.
     */
    border: string;

    /**
     * Region borders: --color-map-region-border.
     */
    regionBorder: string;

    /**
     * Place names: --color-map-label.
     */
    label: string;

    /**
     * The outline that keeps place names readable: --color-map-label-halo.
     */
    labelHalo: string;

    /**
     * Places where a species was found: --color-map-place.
     */
    place: string;

    /**
     * The ring around a dot: --color-map-place-ring.
     */
    placeRing: string;

    /**
     * Species labels: --color-map-place-label.
     */
    placeLabel: string;

    /**
     * The Map page's steps of genera per region, fewest first: --color-map-count-1 to -5.
     */
    counts: Array<string>;
};

// OpenFreeMap's OpenStreetMap tiles (OpenMapTiles schema) and the fonts for their labels.
export const tileSource = "https://tiles.openfreemap.org/planet";
export const glyphSource = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
export const labelFont = ["Noto Sans Regular"];
export const italicLabelFont = ["Noto Sans Italic"];

// How far a reader can zoom.
export const zoomLimit = 12;

// The place name in English where OpenStreetMap has one.
export const englishName: ExpressionSpecification = ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];

setWorkerUrl(workerUrl);

/**
 * Read one color token from the page.
 *
 * @param name - The token: "--color-map-land".
 * @returns The color.
 */
function readToken(name: string): string
{
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Read the map's colors from the theme, which differ in light and dark mode.
 *
 * @returns The colors.
 */
export function readMapColors(): MapColors
{
    return {
        land: readToken("--color-map-land"),
        water: readToken("--color-map-water"),
        border: readToken("--color-map-border"),
        regionBorder: readToken("--color-map-region-border"),
        label: readToken("--color-map-label"),
        labelHalo: readToken("--color-map-label-halo"),
        place: readToken("--color-map-place"),
        placeRing: readToken("--color-map-place-ring"),
        placeLabel: readToken("--color-map-place-label"),
        counts: [
            readToken("--color-map-count-1"),
            readToken("--color-map-count-2"),
            readToken("--color-map-count-3"),
            readToken("--color-map-count-4"),
            readToken("--color-map-count-5"),
        ],
    };
}

/**
 * Create the base map's ground: land, water and borders, with nothing else, so the places stand
 * out. Places are drawn over these layers.
 *
 * @param colors - The map's colors.
 * @returns The layers, bottom first.
 */
export function createGroundLayers(colors: MapColors): Array<LayerSpecification>
{
    return [
        { id: "land", type: "background", paint: { "background-color": colors.land } },
        { id: "water", type: "fill", source: "base", "source-layer": "water", paint: { "fill-color": colors.water } },
        {
            id: "region-borders",
            type: "line",
            source: "base",
            "source-layer": "boundary",
            minzoom: 3,
            filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
            paint: { "line-color": colors.regionBorder, "line-width": 0.75, "line-dasharray": [3, 2] },
        },
        {
            id: "country-borders",
            type: "line",
            source: "base",
            "source-layer": "boundary",
            filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
            paint: { "line-color": colors.border, "line-width": 1 },
        },
    ];
}

/**
 * Create the base map's place names: countries, then regions from zoom 3, then towns from zoom 6.
 * The Map page draws these over its shaded regions, so the names stay readable.
 *
 * @param colors - The map's colors.
 * @returns The layers, bottom first.
 */
export function createNameLayers(colors: MapColors): Array<LayerSpecification>
{
    return [
        {
            id: "country-names",
            type: "symbol",
            source: "base",
            "source-layer": "place",
            maxzoom: 7,
            filter: ["==", ["get", "class"], "country"],
            layout: { "text-field": englishName, "text-font": labelFont, "text-size": 13, "text-max-width": 8 },
            paint: { "text-color": colors.label, "text-halo-color": colors.labelHalo, "text-halo-width": 1.5 },
        },
        {
            id: "region-names",
            type: "symbol",
            source: "base",
            "source-layer": "place",
            minzoom: 3,
            maxzoom: 9,
            filter: ["==", ["get", "class"], "state"],
            layout: { "text-field": englishName, "text-font": italicLabelFont, "text-size": 12, "text-max-width": 8 },
            paint: { "text-color": colors.label, "text-halo-color": colors.labelHalo, "text-halo-width": 1.5 },
        },
        {
            id: "town-names",
            type: "symbol",
            source: "base",
            "source-layer": "place",
            minzoom: 6,
            filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
            layout: { "text-field": englishName, "text-font": labelFont, "text-size": 12 },
            paint: { "text-color": colors.label, "text-halo-color": colors.labelHalo, "text-halo-width": 1.5 },
        },
    ];
}
