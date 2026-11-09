// Draws a place map with MapLibre over OpenFreeMap's OpenStreetMap tiles. Loaded by
// place-map.ts only when a map comes near the viewport. The base map is styled from the
// --color-map-* tokens, so it matches the page in light and dark mode, and the places come
// from the container's data attributes, written at build time by GenusMap.astro.

import "maplibre-gl/dist/maplibre-gl.css";
import type { ExpressionSpecification, GeoJSONSourceSpecification, LayerSpecification, MapLayerMouseEvent, StyleSpecification } from "maplibre-gl";
import { Map as MapLibreMap, NavigationControl, Popup, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

import type { GenusMapFeatureCollection, MapBounds } from "../data/genus-map.ts";

/**
 * The map's colors, read from the theme's tokens.
 */
type MapColors = {
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
};

/**
 * The part of a mark's properties the popup shows.
 */
type PlaceProperties = {
    /**
     * One line per species at the place: "Psittacosaurus sinensis: Doushan Formation, Shandong,
     * China".
     */
    details: string;
};

// OpenFreeMap's OpenStreetMap tiles (OpenMapTiles schema) and the fonts for their labels.
const tileSource = "https://tiles.openfreemap.org/planet";
const glyphSource = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
const labelFont = ["Noto Sans Regular"];
const regionLabelFont = ["Noto Sans Italic"];

// How far the map zooms in when it opens on a place, and how far a reader can zoom.
const openingZoomLimit = 6;
const zoomLimit = 12;

// The place name in English where OpenStreetMap has one.
const englishName: ExpressionSpecification = ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];
const isArea: ExpressionSpecification = ["==", ["get", "kind"], "area"];
const isCountryArea: ExpressionSpecification = ["all", isArea, ["==", ["get", "precision"], "country"]];

// The type species' label is placed first, so it is the one kept when labels collide.
const labelPriority: ExpressionSpecification = ["case", ["get", "isTypeSpecies"], 0, 1];

// The layers a reader can select to see which species a mark stands for.
const selectableLayers = ["place-areas", "place-points", "place-point-labels", "place-area-labels"];

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
function readMapColors(): MapColors
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
    };
}

/**
 * Create the base map's layers: land, water, borders and place names, with nothing else, so the
 * places stand out.
 *
 * @param colors - The map's colors.
 * @returns The layers, bottom first.
 */
function createBaseLayers(colors: MapColors): Array<LayerSpecification>
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
            minzoom: 4,
            maxzoom: 9,
            filter: ["==", ["get", "class"], "state"],
            layout: { "text-field": englishName, "text-font": regionLabelFont, "text-size": 12, "text-max-width": 8 },
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

/**
 * Create the layers that draw the places: shaded regions and countries (a country lighter and
 * dashed, being less precise), dots for published coordinates, and each place's species as an
 * italic label. The type species is drawn more strongly than the others, and its label wins
 * when labels collide.
 *
 * @param colors - The map's colors.
 * @returns The layers, bottom first.
 */
function createPlaceLayers(colors: MapColors): Array<LayerSpecification>
{
    return [
        {
            id: "place-areas",
            type: "fill",
            source: "places",
            filter: isArea,
            paint: {
                "fill-color": colors.place,
                "fill-opacity": ["case", ["==", ["get", "precision"], "country"], 0.12, ["get", "isTypeSpecies"], 0.35, 0.2],
            },
        },
        {
            id: "place-region-outlines",
            type: "line",
            source: "places",
            filter: ["all", isArea, ["!=", ["get", "precision"], "country"]],
            paint: { "line-color": colors.place, "line-width": ["case", ["get", "isTypeSpecies"], 2, 1.25] },
        },
        {
            id: "place-country-outlines",
            type: "line",
            source: "places",
            filter: isCountryArea,
            paint: { "line-color": colors.place, "line-width": 1.25, "line-dasharray": [2, 2] },
        },
        {
            id: "place-points",
            type: "circle",
            source: "places",
            filter: ["==", ["get", "kind"], "point"],
            paint: {
                "circle-color": colors.place,
                "circle-radius": ["case", ["get", "isTypeSpecies"], 7, 5],
                "circle-stroke-color": colors.placeRing,
                "circle-stroke-width": 2,
            },
        },
        {
            id: "place-area-labels",
            type: "symbol",
            source: "places",
            filter: ["==", ["get", "kind"], "label"],
            layout: {
                "text-field": ["get", "label"],
                "text-font": regionLabelFont,
                "text-size": 14,
                "text-max-width": 10,
                "symbol-sort-key": labelPriority,
            },
            paint: { "text-color": colors.placeLabel, "text-halo-color": colors.land, "text-halo-width": 2 },
        },
        {
            id: "place-point-labels",
            type: "symbol",
            source: "places",
            filter: ["==", ["get", "kind"], "point"],
            layout: {
                "text-field": ["get", "label"],
                "text-font": regionLabelFont,
                "text-size": 14,
                "text-max-width": 10,
                "text-variable-anchor": ["left", "right", "top", "bottom"],
                "text-radial-offset": 0.9,
                "symbol-sort-key": labelPriority,
            },
            paint: { "text-color": colors.placeLabel, "text-halo-color": colors.land, "text-halo-width": 2 },
        },
    ];
}

/**
 * Create the map's style: the base map over OpenFreeMap's tiles, with the places on top.
 *
 * @param colors - The map's colors.
 * @param features - The places.
 * @returns The style.
 */
function createMapStyle(colors: MapColors, features: GenusMapFeatureCollection): StyleSpecification
{
    return {
        version: 8,
        glyphs: glyphSource,
        sources: {
            base: { type: "vector", url: tileSource },
            places: { type: "geojson", data: features as unknown as GeoJSONSourceSpecification["data"] },
        },
        layers: [...createBaseLayers(colors), ...createPlaceLayers(colors)],
    };
}

/**
 * Show the species and place of the mark a reader selected, one line per species found there.
 *
 * @param map - The map.
 * @param event - The click on a mark.
 */
function showPlacePopup(map: MapLibreMap, event: MapLayerMouseEvent): void
{
    const feature = event.features?.[0];

    if (!feature)
    {
        return;
    }

    const properties = feature.properties as PlaceProperties;
    const content = document.createElement("div");

    for (const line of properties.details.split("\n"))
    {
        const separator = line.indexOf(": ");
        const entry = document.createElement("p");
        const name = document.createElement("i");

        name.textContent = line.slice(0, separator);
        entry.append(name, line.slice(separator));
        content.append(entry);
    }

    new Popup({ closeButton: false, maxWidth: "18rem" }).setLngLat(event.lngLat).setDOMContent(content).addTo(map);
}

/**
 * Say in the map's place that it could not be drawn, for browsers without WebGL.
 *
 * @param container - The map container.
 */
function showMapUnavailable(container: HTMLElement): void
{
    const message = document.createElement("p");

    message.className = "map-unavailable";
    message.textContent = "The map could not be shown in this browser. The places are listed below.";
    container.replaceChildren(message);
}

/**
 * Draw a place map in its container.
 *
 * @param container - The container, with data-features and data-bounds written at build time.
 */
export function renderPlaceMap(container: HTMLElement): void
{
    const features = JSON.parse(container.dataset.features ?? "{}") as GenusMapFeatureCollection;
    const bounds = JSON.parse(container.dataset.bounds ?? "[]") as MapBounds;
    let map: MapLibreMap;

    try
    {
        map = new MapLibreMap({
            container,
            style: createMapStyle(readMapColors(), features),
            bounds,
            fitBoundsOptions: { padding: 48, maxZoom: openingZoomLimit },
            maxZoom: zoomLimit,
            attributionControl: { compact: true },
            cooperativeGestures: true,
            dragRotate: false,
            pitchWithRotate: false,
            touchPitch: false,
        });
    }
    catch
    {
        showMapUnavailable(container);

        return;
    }

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    map.on("click", selectableLayers, (event) => showPlacePopup(map, event));
    map.on("mouseenter", selectableLayers, () => map.getCanvas().style.setProperty("cursor", "pointer"));
    map.on("mouseleave", selectableLayers, () => map.getCanvas().style.removeProperty("cursor"));

    // Follow the reader's light or dark setting: the tokens change, so the style is rebuilt.
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => map.setStyle(createMapStyle(readMapColors(), features)));
}
