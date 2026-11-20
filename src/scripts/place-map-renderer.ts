// Draws a genus page's map with MapLibre, over the shared base map (map-style.ts). Loaded by
// place-map.ts only when a map comes near the viewport. The places come from the container's
// data attributes, written at build time by GenusMap.astro.

import type { ExpressionSpecification, GeoJSONSourceSpecification, LayerSpecification, MapLayerMouseEvent, StyleSpecification } from "maplibre-gl";
import { Map as MapLibreMap, NavigationControl, Popup } from "maplibre-gl";

import type { GenusMapFeatureCollection, GenusMapView, MapBounds } from "../data/genus-map.ts";
import type { MapPolygon } from "../data/map-shapes.ts";
import type { PaleoView } from "../data/paleo-positions.ts";
import type { MapColors } from "./map-style.ts";
import { createGroundLayers, createNameLayers, glyphSource, italicLabelFont, labelFont, readMapColors, tileSource, zoomLimit } from "./map-style.ts";

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

// Zoom levels to back out from a tight fit, so places show among their neighbors (each level
// doubles the area shown).
const contextZoomLevels = 1;

// Never zoom out past this for context: region names aren't drawn below it.
const contextZoomFloor = 3;

// The space around the places in a tight fit, in pixels.
const fitPadding = 48;

// The opening zoom for places too spread out to fit. Negative because near a pole the globe uses
// the flat map's much larger scale, so all of Antarctica only fits below zoom 0.
const wideOpeningZoom = -1.5;

const isArea: ExpressionSpecification = ["==", ["get", "kind"], "area"];
// Country outlines are drawn from their own lines, which skip the artificial edges Natural
// Earth adds to close Antarctica.
const isCountryOutline: ExpressionSpecification = ["==", ["get", "kind"], "outline"];

// The type species' label is placed first, so it is the one kept when labels collide.
const labelPriority: ExpressionSpecification = ["case", ["get", "isTypeSpecies"], 0, 1];

// The credit for the "when it lived" views, which the map's attribution shows as HTML. CC BY 3.0
// asks for the license's address and a note of the changes made.
const paleoCredit = "Ancient positions and coastlines: <a href=\"https://doi.org/10.5194/bg-10-1529-2013\">Wright et al. 2013</a> "
    + "(<a href=\"https://creativecommons.org/licenses/by/3.0/au/\">CC BY 3.0 AU</a>), simplified and moved to each stage’s midpoint";

// The zoom a "when it lived" view opens at: the whole globe fits the map's height, poles included.
const paleoZoom = 1;

const baseUrl = document.documentElement.dataset.baseUrl ?? "/";

// Each stage's coastlines, loaded once (public/paleo-coastlines/).
const coastlinesBySlug = new Map<string, Promise<PaleoCoastlines>>();

/**
 * A stage's coastlines, as public/paleo-coastlines/{stage}.json holds them.
 */
type PaleoCoastlines = {
    /**
     * The land, as polygons of [longitude, latitude] rings.
     */
    polygons: Array<MapPolygon>;
};

/**
 * A genus map and what it can show.
 */
type PlaceMapState = {
    /**
     * The map.
     */
    map: MapLibreMap;

    /**
     * Today's places.
     */
    features: GenusMapFeatureCollection;

    /**
     * How today's map opens.
     */
    view: GenusMapView;

    /**
     * Where the species were when they lived, one view per stage.
     */
    paleoViews: Array<PaleoView>;

    /**
     * The view shown: an index into paleoViews, or -1 for today.
     */
    current: number;

    /**
     * Today's opening camera, to return to.
     */
    todayCamera: MapCamera;
};

/**
 * A camera position.
 */
type MapCamera = {
    /**
     * The center: longitude, then latitude.
     */
    center: [number, number];

    /**
     * The zoom.
     */
    zoom: number;
};

// The layers a reader can select to see which species a mark stands for.
const selectableLayers = ["place-areas", "place-points", "place-point-labels", "place-area-labels"];

/**
 * Create the place layers: shaded regions and countries (countries lighter and dashed), dots for
 * coordinates, and italic species labels. The type species is drawn more strongly and its label
 * wins collisions.
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
 * Load a stage's coastlines, once.
 *
 * @param slug - The stage's slug: "kimmeridgian".
 * @returns The coastlines.
 */
async function loadCoastlines(slug: string): Promise<PaleoCoastlines>
{
    if (!coastlinesBySlug.has(slug))
    {
        coastlinesBySlug.set(slug, fetch(baseUrl + "paleo-coastlines/" + slug + ".json").then((response) => response.json() as Promise<PaleoCoastlines>));
    }

    return await (coastlinesBySlug.get(slug) as Promise<PaleoCoastlines>);
}

/**
 * Turn a "when it lived" view's places into map features: a point for each, labeled with its
 * species, and marked as approximate when it is a region's center.
 *
 * @param view - The view.
 * @returns The features.
 */
function createPaleoFeatures(view: PaleoView): GeoJSONSourceSpecification["data"]
{
    const features = new Array<unknown>();

    for (const place of view.places)
    {
        features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: place.position },
            properties: { kind: "point", label: place.labels.join(", "), details: place.details.join("\n"), isTypeSpecies: place.isTypeSpecies, isApproximate: place.isApproximate },
        });
    }

    return { type: "FeatureCollection", features } as GeoJSONSourceSpecification["data"];
}

/**
 * Turn a stage's coastlines into map features.
 *
 * @param coastlines - The coastlines.
 * @returns The land, as polygon features.
 */
function createLandFeatures(coastlines: PaleoCoastlines): GeoJSONSourceSpecification["data"]
{
    const features = new Array<unknown>();

    for (const polygon of coastlines.polygons)
    {
        features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: polygon }, properties: {} });
    }

    return { type: "FeatureCollection", features } as GeoJSONSourceSpecification["data"];
}

/**
 * Create the ancient globe's grid: meridians and parallels every 30°, with each parallel labeled
 * at several longitudes and the poles marked, so the reader keeps north and south.
 *
 * @returns The lines and labels.
 */
function createGraticule(): GeoJSONSourceSpecification["data"]
{
    const features = new Array<unknown>();

    for (let longitude = -180; longitude < 180; longitude += 30)
    {
        features.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[longitude, -89], [longitude, 0], [longitude, 89]] }, properties: { kind: "line", isEquator: false } });
    }

    for (let latitude = -60; latitude <= 60; latitude += 30)
    {
        const line = new Array<[number, number]>();
        const label = latitude === 0 ? "Equator" : Math.abs(latitude) + "° " + (latitude > 0 ? "N" : "S");

        for (let longitude = -180; longitude <= 180; longitude += 5)
        {
            line.push([longitude, latitude]);
        }

        features.push({ type: "Feature", geometry: { type: "LineString", coordinates: line }, properties: { kind: "line", isEquator: latitude === 0 } });

        for (let longitude = -150; longitude < 180; longitude += 60)
        {
            features.push({ type: "Feature", geometry: { type: "Point", coordinates: [longitude, latitude] }, properties: { kind: "label", label } });
        }
    }

    features.push({ type: "Feature", geometry: { type: "Point", coordinates: [0, 89.5] }, properties: { kind: "label", label: "North Pole" } });
    features.push({ type: "Feature", geometry: { type: "Point", coordinates: [0, -89.5] }, properties: { kind: "label", label: "South Pole" } });

    return { type: "FeatureCollection", features } as GeoJSONSourceSpecification["data"];
}

/**
 * Create the globe style for a "when it lived" view: the stage's coastlines, and the species as
 * filled dots (published sites) or rings (region centers). Layer names match today's map, so
 * popups still work.
 *
 * @param colors - The map's colors.
 * @param view - The view.
 * @param coastlines - The stage's coastlines.
 * @returns The style.
 */
function createPaleoStyle(colors: MapColors, view: PaleoView, coastlines: PaleoCoastlines): StyleSpecification
{
    const isApproximate: ExpressionSpecification = ["get", "isApproximate"];

    return {
        version: 8,
        projection: { type: "globe" },
        glyphs: glyphSource,
        sources: {
            land: { type: "geojson", data: createLandFeatures(coastlines), attribution: paleoCredit },
            graticule: { type: "geojson", data: createGraticule() },
            places: { type: "geojson", data: createPaleoFeatures(view) },
        },
        layers: [
            { id: "water", type: "background", paint: { "background-color": colors.water } },
            // No coastline stroke: the model's crustal-block edges would look like borders.
            { id: "land", type: "fill", source: "land", paint: { "fill-color": colors.land } },
            {
                id: "graticule",
                type: "line",
                source: "graticule",
                filter: ["==", ["get", "kind"], "line"],
                paint: { "line-color": colors.graticule, "line-width": ["case", ["get", "isEquator"], 1.6, 0.7] },
            },
            {
                id: "graticule-labels",
                type: "symbol",
                source: "graticule",
                filter: ["==", ["get", "kind"], "label"],
                layout: { "text-field": ["get", "label"], "text-font": labelFont, "text-size": 11, "text-offset": [0, -0.7] },
                paint: { "text-color": colors.label, "text-halo-color": colors.labelHalo, "text-halo-width": 1.5 },
            },
            {
                id: "place-points",
                type: "circle",
                source: "places",
                paint: {
                    "circle-color": colors.place,
                    "circle-opacity": ["case", isApproximate, 0, 1],
                    "circle-radius": ["case", ["get", "isTypeSpecies"], 7, 5],
                    "circle-stroke-color": ["case", isApproximate, colors.place, colors.placeRing],
                    "circle-stroke-width": ["case", isApproximate, 2.5, 2],
                },
            },
            {
                id: "place-point-labels",
                type: "symbol",
                source: "places",
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
        ],
    };
}

/**
 * Find the middle of a view's places, to center the globe on.
 *
 * @param view - The view.
 * @returns The center: longitude, then latitude.
 */
function findPaleoCenter(view: PaleoView): [number, number]
{
    let longitude = 0;
    let latitude = 0;

    for (const place of view.places)
    {
        longitude += place.position[0];
        latitude += place.position[1];
    }

    return [longitude / view.places.length, latitude / view.places.length];
}

/**
 * Show today's map or a "when it lived" view, and update the switch and the note under the map.
 *
 * @param state - The map and what it can show.
 * @param index - The view: an index into the paleo views, or -1 for today.
 * @param buttons - The switch's buttons, today first.
 * @param note - The note under the map.
 */
async function showMapView(state: PlaceMapState, index: number, buttons: Array<HTMLButtonElement>, note: HTMLElement | null): Promise<void>
{
    const isMotionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    state.current = index;
    state.map.getContainer().classList.toggle("is-ancient", index !== -1);

    for (let position = 0; position < buttons.length; position++)
    {
        buttons[position].setAttribute("aria-pressed", String(position === index + 1));
    }

    if (note)
    {
        note.textContent = buttons[index + 1]?.dataset.note ?? "";
    }

    if (index === -1)
    {
        state.map.setStyle(createMapStyle(readMapColors(), state.features, state.view));
        state.map.jumpTo(state.todayCamera);

        return;
    }

    const view = state.paleoViews[index];
    const coastlines = await loadCoastlines(view.stageSlug);

    // Another view may have been chosen while the coastlines loaded.
    if (state.current !== index)
    {
        return;
    }

    state.map.setStyle(createPaleoStyle(readMapColors(), view, coastlines));

    if (isMotionReduced)
    {
        state.map.jumpTo({ center: findPaleoCenter(view), zoom: paleoZoom });
    }
    else
    {
        state.map.flyTo({ center: findPaleoCenter(view), zoom: paleoZoom, duration: 900 });
    }
}

/**
 * Turn on the switch between today's map and the "when it lived" views, when the genus has any.
 *
 * @param state - The map and what it can show.
 * @param container - The map's container.
 */
function connectViewSwitch(state: PlaceMapState, container: HTMLElement): void
{
    const group = container.closest(".genus-map")?.querySelector<HTMLElement>(".map-views");
    const note = container.closest(".genus-map")?.querySelector<HTMLElement>(".map-note") ?? null;

    if (!group || state.paleoViews.length === 0)
    {
        return;
    }

    const buttons = [...group.querySelectorAll<HTMLButtonElement>("button[data-map-view]")];

    group.hidden = false;

    for (const button of buttons)
    {
        const index = button.dataset.mapView === "today" ? -1 : Number(button.dataset.mapView);

        button.addEventListener("click", () => void showMapView(state, index, buttons, note));
    }
}

/**
 * Rebuild the current view's style after the reader switches between light and dark.
 *
 * @param state - The map and what it can show.
 */
async function redrawForTheme(state: PlaceMapState): Promise<void>
{
    if (state.current === -1)
    {
        state.map.setStyle(createMapStyle(readMapColors(), state.features, state.view));

        return;
    }

    const view = state.paleoViews[state.current];

    state.map.setStyle(createPaleoStyle(readMapColors(), view, await loadCoastlines(view.stageSlug)));
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
 * Show a message in the map's place that it couldn't be drawn, for browsers without WebGL.
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
 * Zoom a new map out from a tight fit (by contextZoomLevels, not past contextZoomFloor) before
 * its first frame, so the places show among their neighbors.
 *
 * @param map - The map, just created.
 * @param bounds - The places' bounds.
 */
function showSurroundings(map: MapLibreMap, bounds: MapBounds): void
{
    const camera = map.cameraForBounds(bounds, { padding: fitPadding, maxZoom: openingZoomLimit });

    if (camera?.zoom !== undefined && camera.zoom > contextZoomFloor)
    {
        map.jumpTo({ ...camera, zoom: Math.max(camera.zoom - contextZoomLevels, contextZoomFloor) });
    }
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
    const paleoViews = JSON.parse(container.dataset.paleo ?? "[]") as Array<PaleoView>;
    let map: MapLibreMap;

    try
    {
        map = new MapLibreMap({
            container,
            style: createMapStyle(readMapColors(), features, view),
            // Places spanning more than half the world can't be fitted, so the map centers on them,
            // zoomed out.
            ...(view.isWide ? { center: view.center, zoom: wideOpeningZoom } : { bounds, fitBoundsOptions: { padding: fitPadding, maxZoom: openingZoomLimit } }),
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

    if (!view.isWide)
    {
        showSurroundings(map, bounds);
    }

    const center = map.getCenter();
    const state: PlaceMapState = { map, features, view, paleoViews, current: -1, todayCamera: { center: [center.lng, center.lat], zoom: map.getZoom() } };

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    connectViewSwitch(state, container);

    map.on("click", selectableLayers, (event) => showPlacePopup(map, event));
    map.on("mouseenter", selectableLayers, () => map.getCanvas().style.setProperty("cursor", "pointer"));
    map.on("mouseleave", selectableLayers, () => map.getCanvas().style.removeProperty("cursor"));

    // Follow the reader's light or dark setting: the tokens change, so the style is rebuilt.
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => void redrawForTheme(state));
}
