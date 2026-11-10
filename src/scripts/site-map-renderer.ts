// Draws the Map page's world map with MapLibre, over the shared base map (map-style.ts): every
// place a genus's type species was found, shaded by how many genera match the filters, and a
// dot for each matching genus with published coordinates. Loaded by site-map.ts, which decides
// what matches and shows the selected place's genera.

import type {
    ExpressionSpecification,
    GeoJSONSource,
    GeoJSONSourceSpecification,
    LayerSpecification,
    MapGeoJSONFeature,
    MapLayerMouseEvent,
    StyleSpecification,
} from "maplibre-gl";
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";

import type { MapPosition } from "../data/map-shapes.ts";
import type { SiteMapGenus, SiteMapPlace } from "../data/site-map.ts";
import type { MapColors } from "./map-style.ts";
import { createGroundLayers, createNameLayers, glyphSource, readMapColors, tileSource, zoomLimit } from "./map-style.ts";

/**
 * What the map shows: how many matching genera each place holds, the matching genera with
 * coordinates, and the selected place.
 */
export type SiteMapState = {
    /**
     * Matching genera per place key; places without any are not shaded.
     */
    counts: Map<string, number>;

    /**
     * The matching genera with published coordinates.
     */
    points: Array<SiteMapGenus>;

    /**
     * The selected place's key, or an empty string.
     */
    selectedKey: string;
};

/**
 * A drawn map, and how to change what it shows.
 */
export type SiteMapView = {
    /**
     * The MapLibre map.
     */
    map: MapLibreMap;

    /**
     * The places, for rebuilding the shaded areas.
     */
    places: Array<SiteMapPlace>;

    /**
     * What the map shows now, kept so the style can be rebuilt when the color scheme changes.
     */
    state: SiteMapState;
};

/**
 * A GeoJSON feature for a place or a dot, in the form MapLibre's sources take.
 */
type SiteMapFeature = {
    /**
     * Always "Feature".
     */
    type: "Feature";

    /**
     * What the map styles and selects the feature by.
     */
    properties: SiteMapFeatureProperties;

    /**
     * The outline or point.
     */
    geometry: SiteMapGeometry;
};

/**
 * The properties of a place or dot feature.
 */
type SiteMapFeatureProperties = {
    /**
     * The place's key; for a dot, the key of the place its genus is counted in.
     */
    key: string;

    /**
     * Whether the place is a region or a whole country; "point" for a dot.
     */
    kind: string;

    /**
     * Matching genera in the place; 1 for a dot.
     */
    count: number;
};

/**
 * A place's outline or a dot's position.
 */
type SiteMapGeometry = {
    /**
     * "MultiPolygon" or "Point".
     */
    type: "MultiPolygon" | "Point";

    /**
     * The polygons or the position.
     */
    coordinates: SiteMapPlace["polygons"] | MapPosition;
};

/**
 * A collection of features, as a MapLibre GeoJSON source takes it.
 */
type SiteMapFeatureCollection = {
    /**
     * Always "FeatureCollection".
     */
    type: "FeatureCollection";

    /**
     * The features.
     */
    features: Array<SiteMapFeature>;
};

// The world, less the polar seas, which the Mercator projection stretches without any genera.
const worldBounds: [MapPosition, MapPosition] = [[-170, -58], [180, 78]];

// The bins of genera per place, the lower bound of each step after the first: 1, 2–4, 5–9,
// 10–24, 25 or more. The legend on the page repeats them.
const countSteps = [2, 5, 10, 25];

// The data a GeoJSON source takes; MapLibre types it with the GeoJSON namespace, which this
// project does not load.
type SourceData = Parameters<GeoJSONSource["setData"]>[0];

const isCountry: ExpressionSpecification = ["==", ["get", "kind"], "country"];

/**
 * Turn the places into features carrying their matching genus counts.
 *
 * @param places - The places.
 * @param counts - Matching genera per place key.
 * @returns The features of places with at least one matching genus.
 */
function createPlaceFeatures(places: Array<SiteMapPlace>, counts: Map<string, number>): SiteMapFeatureCollection
{
    const countries = new Array<SiteMapFeature>();
    const regions = new Array<SiteMapFeature>();

    for (const place of places)
    {
        const count = counts.get(place.key) ?? 0;
        const feature: SiteMapFeature = { type: "Feature", properties: { key: place.key, kind: place.kind, count }, geometry: { type: "MultiPolygon", coordinates: place.polygons } };

        if (count === 0)
        {
            continue;
        }
        else if (place.kind === "country")
        {
            countries.push(feature);
        }
        else
        {
            regions.push(feature);
        }
    }

    // Countries are drawn first, under their regions: the United States holds two genera known
    // only to the country, and drawn on top it covered the states.
    return { type: "FeatureCollection", features: [...countries, ...regions] };
}

/**
 * Choose the place a click selects from everything under the pointer: a dot first, then a
 * region, and a whole country only where no region is shaded.
 *
 * @param features - The features under the pointer, top first.
 * @returns The selected place's key, or an empty string.
 */
function choosePlaceKey(features: Array<MapGeoJSONFeature>): string
{
    let regionKey = "";
    let countryKey = "";

    for (const feature of features)
    {
        const kind = String(feature.properties.kind);
        const key = String(feature.properties.key);

        if (kind === "point")
        {
            return key;
        }
        else if (kind === "region" && regionKey === "")
        {
            regionKey = key;
        }
        else if (kind === "country" && countryKey === "")
        {
            countryKey = key;
        }
    }

    return regionKey !== "" ? regionKey : countryKey;
}

/**
 * Turn the matching genera with coordinates into dot features.
 *
 * @param points - The genera.
 * @returns The dots.
 */
function createPointFeatures(points: Array<SiteMapGenus>): SiteMapFeatureCollection
{
    const features = new Array<SiteMapFeature>();

    for (const genus of points)
    {
        if (genus.position)
        {
            features.push({ type: "Feature", properties: { key: genus.placeKey, kind: "point", count: 1 }, geometry: { type: "Point", coordinates: genus.position } });
        }
    }

    return { type: "FeatureCollection", features };
}

/**
 * Create the layers that draw the places and dots: the places shaded by count in the green
 * ramp, a dashed outline for places known only to the country, a strong outline for the
 * selected place, and the dots on top.
 *
 * @param colors - The map's colors.
 * @param selectedKey - The selected place's key, or an empty string.
 * @returns The layers, bottom first.
 */
function createPlaceLayers(colors: MapColors, selectedKey: string): Array<LayerSpecification>
{
    const fillColor: ExpressionSpecification = ["step", ["get", "count"], colors.counts[0]];

    for (let index = 0; index < countSteps.length; index++)
    {
        fillColor.push(countSteps[index], colors.counts[index + 1]);
    }

    return [
        // A whole country is shaded lightly, as a backdrop its regions stand out from: its genera
        // could be from anywhere in it.
        { id: "place-fills", type: "fill", source: "places", paint: { "fill-color": fillColor, "fill-opacity": ["case", isCountry, 0.35, 0.85] } },
        {
            id: "place-country-outlines",
            type: "line",
            source: "places",
            filter: isCountry,
            paint: { "line-color": colors.placeLabel, "line-width": 1, "line-dasharray": [2, 2] },
        },
        {
            id: "place-selected",
            type: "line",
            source: "places",
            filter: ["==", ["get", "key"], selectedKey],
            paint: { "line-color": colors.label, "line-width": 2.5 },
        },
        {
            id: "place-points",
            type: "circle",
            source: "points",
            paint: {
                "circle-color": colors.placeLabel,
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 2.5, 6, 5],
                "circle-stroke-color": colors.placeRing,
                "circle-stroke-width": 1.25,
            },
        },
    ];
}

/**
 * Create the map's style: the ground, the shaded places, then place names over them so they stay
 * readable, then the dots.
 *
 * @param places - Every place.
 * @param state - What the map shows.
 * @returns The style.
 */
function createSiteMapStyle(places: Array<SiteMapPlace>, state: SiteMapState): StyleSpecification
{
    const colors = readMapColors();
    const placeLayers = createPlaceLayers(colors, state.selectedKey);

    return {
        version: 8,
        glyphs: glyphSource,
        sources: {
            base: { type: "vector", url: tileSource },
            places: { type: "geojson", data: createPlaceFeatures(places, state.counts) as unknown as GeoJSONSourceSpecification["data"] },
            points: { type: "geojson", data: createPointFeatures(state.points) as unknown as GeoJSONSourceSpecification["data"] },
        },
        layers: [...createGroundLayers(colors), ...placeLayers.slice(0, 3), ...createNameLayers(colors), ...placeLayers.slice(3)],
    };
}

/**
 * Show new counts, dots and selection.
 *
 * @param view - The drawn map.
 * @param state - What to show.
 */
export function updateSiteMap(view: SiteMapView, state: SiteMapState): void
{
    view.state = state;

    const places = view.map.getSource<GeoJSONSource>("places");
    const points = view.map.getSource<GeoJSONSource>("points");

    places?.setData(createPlaceFeatures(view.places, state.counts) as unknown as SourceData);
    points?.setData(createPointFeatures(state.points) as unknown as SourceData);

    if (view.map.getLayer("place-selected"))
    {
        view.map.setFilter("place-selected", ["==", ["get", "key"], state.selectedKey]);
    }
}

/**
 * Draw the world map.
 *
 * @param container - The map container.
 * @param places - Every place.
 * @param state - What to show first.
 * @param selectPlace - Called with a place's key when a reader selects it or one of its dots.
 * @returns The drawn map, or undefined when the browser cannot draw it.
 */
export function renderSiteMap(container: HTMLElement, places: Array<SiteMapPlace>, state: SiteMapState, selectPlace: (key: string) => void): SiteMapView | undefined
{
    let map: MapLibreMap;

    try
    {
        map = new MapLibreMap({
            container,
            style: createSiteMapStyle(places, state),
            bounds: worldBounds,
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
        return undefined;
    }

    const view: SiteMapView = { map, places, state };

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("click", ["place-fills", "place-points"], (event: MapLayerMouseEvent) => selectPlace(choosePlaceKey(event.features ?? [])));
    map.on("mouseenter", ["place-fills", "place-points"], () => map.getCanvas().style.setProperty("cursor", "pointer"));
    map.on("mouseleave", ["place-fills", "place-points"], () => map.getCanvas().style.removeProperty("cursor"));

    // Follow the reader's light or dark setting: the tokens change, so the style is rebuilt.
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => map.setStyle(createSiteMapStyle(view.places, view.state)));

    return view;
}
