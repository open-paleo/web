// Draws a genus page's map with MapLibre, over the shared base map (map-style.ts). Loaded by
// place-map.ts only when a map comes near the viewport. The places come from the container's
// data attributes, written at build time by GenusMap.astro.

import type { ExpressionSpecification, GeoJSONSourceSpecification, LayerSpecification, MapLayerMouseEvent, StyleSpecification } from "maplibre-gl";
import { Map as MapLibreMap, NavigationControl, Popup } from "maplibre-gl";

import type { GenusMapFeatureCollection, GenusMapView, MapBounds } from "../data/genus-map.ts";
import type { MapColors } from "./map-style.ts";
import { createGroundLayers, createNameLayers, glyphSource, italicLabelFont, readMapColors, tileSource, zoomLimit } from "./map-style.ts";

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

// How far the map zooms in when it opens on a place.
const openingZoomLimit = 6;

// The zoom a map opens at when its places are too wide to fit. Over a pole it is negative: the
// globe matches the flat map's scale at the center latitude, which near a pole is many times
// enlarged, so only a zoom below 0 shows the whole of Antarctica.
const wideOpeningZoom = -1.5;

const isArea: ExpressionSpecification = ["==", ["get", "kind"], "area"];
// A country-level area's dashed outline is drawn from its own lines, which leave out the
// artificial edges Natural Earth closes Antarctica with.
const isCountryOutline: ExpressionSpecification = ["==", ["get", "kind"], "outline"];

// The type species' label is placed first, so it is the one kept when labels collide.
const labelPriority: ExpressionSpecification = ["case", ["get", "isTypeSpecies"], 0, 1];

// The layers a reader can select to see which species a mark stands for.
const selectableLayers = ["place-areas", "place-points", "place-point-labels", "place-area-labels"];

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
            filter: isCountryOutline,
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
                "text-font": italicLabelFont,
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
                "text-font": italicLabelFont,
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
 * @param view - How the map opens, which sets its projection.
 * @returns The style.
 */
function createMapStyle(colors: MapColors, features: GenusMapFeatureCollection, view: GenusMapView): StyleSpecification
{
    return {
        version: 8,
        projection: { type: view.projection },
        glyphs: glyphSource,
        sources: {
            base: { type: "vector", url: tileSource },
            places: { type: "geojson", data: features as unknown as GeoJSONSourceSpecification["data"] },
        },
        layers: [...createGroundLayers(colors), ...createNameLayers(colors), ...createPlaceLayers(colors)],
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
    const view = JSON.parse(container.dataset.view ?? "{}") as GenusMapView;
    let map: MapLibreMap;

    try
    {
        map = new MapLibreMap({
            container,
            style: createMapStyle(readMapColors(), features, view),
            // Places spanning more than half the world cannot be fitted; the map opens on their
            // middle, far enough out to show them.
            ...(view.isWide ? { center: view.center, zoom: wideOpeningZoom } : { bounds, fitBoundsOptions: { padding: 48, maxZoom: openingZoomLimit } }),
            minZoom: -2,
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
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => map.setStyle(createMapStyle(readMapColors(), features, view)));
}
