// Draws the Tree page's chart with MapLibre. Clicking a clade opens its page; clicking a tip
// lists its genera. The find field sends a "tree-chart-find" event to show a clade or genus.

import type { ExpressionSpecification, GeoJSONSource, GeoJSONSourceSpecification, MapLayerMouseEvent, StyleSpecification } from "maplibre-gl";
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";

import { coloredCladeNames, createCladeColorToken, otherCladeColorToken } from "../data/clade-colors.ts";
import type { LngLat, TreeChart, TreeChartTip } from "../data/tree-chart.ts";
import { glyphSource, italicLabelFont, labelFont, readToken } from "./map-style.ts";

/**
 * The chart's colors, read from the theme, which differ in light and dark mode.
 */
type TreeChartColors = {
    /**
     * The chart's box, and the halo around its labels: --color-surface, so the chart stands out as
     * a panel on the page.
     */
    background: string;

    /**
     * Text: --color-ink.
     */
    ink: string;

    /**
     * Secondary text, such as "12 genera": --color-muted.
     */
    muted: string;

    /**
     * The highlight on a clade or tip the find field shows: --color-accent.
     */
    accent: string;

    /**
     * Each colored clade's color, in the order of coloredCladeNames: --color-clade-{clade}.
     */
    groups: Array<string>;

    /**
     * Every other branch: --color-clade-other.
     */
    other: string;
};

/**
 * What the find field asks the chart to show.
 */
export type TreeChartFindRequest = {
    /**
     * The clade to show: the clade found, or the clade a genus is placed in.
     */
    cladeSlug: string;

    /**
     * The genus found, or empty for a clade.
     */
    genusName: string;
};

/**
 * The chart, its data and its panel.
 */
type TreeChartView = {
    /**
     * The map drawing the chart.
     */
    map: MapLibreMap;

    /**
     * The chart's data.
     */
    chart: TreeChart;

    /**
     * The panel listing a tip's genera.
     */
    panel: HTMLElement;

    /**
     * The zoom that fits the whole chart.
     */
    fittedZoom: number;
};

// The bold face for the major groups' names.
const boldLabelFont = ["Noto Sans Bold"];

// How many zoom levels past the fitted view the reader may zoom in, and out.
const zoomInRange = 5;
const zoomOutRange = 0.5;

const baseUrl = document.documentElement.dataset.baseUrl ?? "/";

/**
 * Read the chart's colors from the theme.
 *
 * @returns The colors.
 */
function readTreeColors(): TreeChartColors
{
    const groups = new Array<string>();

    for (const name of coloredCladeNames)
    {
        groups.push(readToken(createCladeColorToken(name)));
    }

    return {
        background: readToken("--color-surface"),
        ink: readToken("--color-ink"),
        muted: readToken("--color-muted"),
        accent: readToken("--color-accent"),
        groups,
        other: readToken(otherCladeColorToken),
    };
}

/**
 * Create the expression that colors a feature by its major group.
 *
 * @param colors - The chart's colors.
 * @returns The expression.
 */
function createGroupColor(colors: TreeChartColors): ExpressionSpecification
{
    const expression: Array<unknown> = ["match", ["get", "group"]];

    for (let index = 0; index < coloredCladeNames.length; index++)
    {
        expression.push(coloredCladeNames[index], colors.groups[index]);
    }

    expression.push(colors.other);

    return expression as ExpressionSpecification;
}

/**
 * Create the chart's style: the background, the groups' tints, the branches, and the labels.
 *
 * @param colors - The chart's colors.
 * @param chart - The chart's data.
 * @returns The style.
 */
function createChartStyle(colors: TreeChartColors, chart: TreeChart): StyleSpecification
{
    const groupColor = createGroupColor(colors);
    const isTip: ExpressionSpecification = ["get", "isTip"];

    return {
        version: 8,
        glyphs: glyphSource,
        sources: {
            tints: { type: "geojson", data: chart.tints as unknown as GeoJSONSourceSpecification["data"] },
            branches: { type: "geojson", data: chart.branches as unknown as GeoJSONSourceSpecification["data"] },
            labels: { type: "geojson", data: chart.labels as unknown as GeoJSONSourceSpecification["data"] },
            found: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
        },
        layers: [
            { id: "background", type: "background", paint: { "background-color": colors.background } },
            { id: "tints", type: "fill", source: "tints", paint: { "fill-color": groupColor, "fill-opacity": 0.12 } },
            {
                id: "branches",
                type: "line",
                source: "branches",
                layout: { "line-cap": "round", "line-join": "round" },
                // Branches to tips are lighter while zoomed out, so the clades' structure reads.
                paint: {
                    "line-color": groupColor,
                    "line-width": ["interpolate", ["linear"], ["zoom"], 0, ["case", isTip, 0.6, 1.2], 6, ["case", isTip, 1, 1.8], 10, ["case", isTip, 1.6, 2.6]],
                    "line-opacity": ["interpolate", ["linear"], ["zoom"], 0, ["case", isTip, 0.55, 1], 6, ["case", isTip, 0.8, 1], 9, 1],
                },
            },
            {
                id: "found",
                type: "circle",
                source: "found",
                // A ring at the end of the found clade's branch, nudged left so it clears the label.
                paint: { "circle-radius": 6, "circle-color": "transparent", "circle-stroke-color": colors.accent, "circle-stroke-width": 2.5, "circle-translate": [-3, 0] },
            },
            {
                id: "tip-labels",
                type: "symbol",
                source: "labels",
                filter: ["==", ["get", "kind"], "tip"],
                layout: {
                    // A clade tip shows its name above its genus summary; a tip for a clade's own genera shows
                    // only the summary.
                    "text-field": ["case", ["==", ["get", "name"], ""],
                        ["format",
                            ["get", "summaryItalic"], { "text-font": ["literal", italicLabelFont] },
                            ["get", "summaryRest"], { "text-color": colors.muted }],
                        ["format",
                            ["get", "name"], {},
                            "\n", {},
                            ["get", "summaryItalic"], { "text-font": ["literal", italicLabelFont], "font-scale": 0.85 },
                            ["get", "summaryRest"], { "font-scale": 0.85, "text-color": colors.muted }]],
                    "text-font": labelFont,
                    "text-size": 13,
                    "text-anchor": "left",
                    "text-justify": "left",
                    "text-offset": [0.5, 0],
                    "symbol-sort-key": ["-", 0, ["get", "size"]],
                    "text-padding": 1,
                },
                paint: { "text-color": colors.ink, "text-halo-color": colors.background, "text-halo-width": 1.5 },
            },
            {
                id: "clade-labels",
                type: "symbol",
                source: "labels",
                filter: ["==", ["get", "kind"], "clade"],
                layout: {
                    "text-field": ["get", "name"],
                    "text-font": ["case", ["get", "isGroup"], ["literal", boldLabelFont], ["literal", labelFont]],
                    "text-size": ["case", ["get", "isGroup"], 17, [">=", ["get", "size"], 100], 14, 12],
                    "text-anchor": "bottom-right",
                    "text-offset": [-0.2, -0.2],
                    // The major groups first, then larger clades before smaller ones.
                    "symbol-sort-key": ["case", ["get", "isGroup"], -100000, ["-", 0, ["get", "size"]]],
                    "text-padding": 3,
                },
                paint: { "text-color": colors.ink, "text-halo-color": colors.background, "text-halo-width": 2 },
            },
        ],
    };
}

/**
 * Fill the panel with a tip's genera, each linked to its page, and show it.
 *
 * @param view - The chart.
 * @param tip - The tip.
 * @param highlightedGenus - A genus to mark in the list, or empty.
 */
function showTipPanel(view: TreeChartView, tip: TreeChartTip, highlightedGenus: string): void
{
    const heading = view.panel.querySelector<HTMLElement>(".tree-chart-panel-heading");
    const summary = view.panel.querySelector<HTMLElement>(".tree-chart-panel-summary");
    const list = view.panel.querySelector<HTMLElement>(".tree-chart-panel-genera");
    const cladeLink = document.createElement("a");

    if (!heading || !summary || !list)
    {
        return;
    }

    heading.textContent = tip.isDirect ? "Placed directly in " + tip.cladeName : tip.cladeName;
    cladeLink.href = baseUrl + "clade/" + tip.cladeSlug + "/";
    cladeLink.textContent = tip.cladeName;
    summary.replaceChildren((tip.genera.length === 1 ? "1 genus" : tip.genera.length + " genera") + ". Open ", cladeLink, ".");
    list.replaceChildren();

    for (const genus of tip.genera)
    {
        const item = document.createElement("li");
        const link = document.createElement("a");

        link.href = baseUrl + "genus/" + genus.slug + "/";
        link.className = "taxon";
        link.textContent = genus.name;

        if (genus.name === highlightedGenus)
        {
            link.setAttribute("aria-current", "true");
        }

        item.append(link);
        list.append(item);
    }

    view.panel.hidden = false;
    heading.focus({ preventScroll: true });
}

/**
 * Hide the panel.
 *
 * @param view - The chart.
 */
function hidePanel(view: TreeChartView): void
{
    view.panel.hidden = true;
}

/**
 * Open the panel for the tip that was selected.
 *
 * @param view - The chart.
 * @param event - The click on a tip's label.
 */
function handleTipClick(view: TreeChartView, event: MapLayerMouseEvent): void
{
    const key = String(event.features?.[0]?.properties.tipKey ?? "");
    const tip = view.chart.tips[key];

    if (tip)
    {
        showTipPanel(view, tip, "");
    }
}

/**
 * Open the page of the clade that was selected.
 *
 * @param event - The click on a clade's label.
 */
function handleCladeClick(event: MapLayerMouseEvent): void
{
    const slug = String(event.features?.[0]?.properties.slug ?? "");

    if (slug !== "")
    {
        window.location.assign(baseUrl + "clade/" + slug + "/");
    }
}

/**
 * Report whether a tip holds a genus.
 *
 * @param tip - The tip.
 * @param genusName - The genus.
 * @returns True if the genus is among the tip's genera.
 */
function hasGenus(tip: TreeChartTip, genusName: string): boolean
{
    for (const genus of tip.genera)
    {
        if (genus.name === genusName)
        {
            return true;
        }
    }

    return false;
}

/**
 * Find where a clade's label sits, or for a genus, the label of the tip that holds it.
 *
 * @param view - The chart.
 * @param request - What to find.
 * @returns The label's position and, for a genus, its tip; or undefined if the chart lacks it.
 */
function locateFindRequest(view: TreeChartView, request: TreeChartFindRequest): [LngLat, TreeChartTip | undefined] | undefined
{
    for (const label of view.chart.labels.features)
    {
        const properties = label.properties;

        if (properties.slug !== request.cladeSlug)
        {
            continue;
        }

        if (request.genusName === "")
        {
            return [label.geometry.coordinates, undefined];
        }

        const tip = view.chart.tips[properties.tipKey];

        if (tip && hasGenus(tip, request.genusName))
        {
            return [label.geometry.coordinates, tip];
        }
    }

    return undefined;
}

/**
 * Move the chart to the clade or genus the find field chose and mark it; for a genus, also open
 * its tip's panel with the genus highlighted.
 *
 * @param view - The chart.
 * @param request - What to show.
 */
function showFindRequest(view: TreeChartView, request: TreeChartFindRequest): void
{
    const found = locateFindRequest(view, request);

    if (!found)
    {
        return;
    }

    const [position, tip] = found;
    const isMotionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // With the panel open over the chart's left side, the found tip sits right of center.
    const offset: [number, number] = tip ? [Math.min(view.panel.offsetWidth || 352, view.map.getContainer().clientWidth / 3) / 2, 0] : [0, 0];
    const camera = { center: position, zoom: Math.max(view.map.getZoom(), view.fittedZoom + 2), offset };
    view.map.getSource<GeoJSONSource>("found")?.setData({ type: "Feature", geometry: { type: "Point", coordinates: position }, properties: {} });

    view.map.getContainer().scrollIntoView({ block: "nearest", behavior: isMotionReduced ? "auto" : "smooth" });

    if (isMotionReduced)
    {
        view.map.jumpTo(camera);
    }
    else
    {
        view.map.flyTo({ ...camera, duration: 800 });
    }

    if (tip)
    {
        showTipPanel(view, tip, request.genusName);
    }
    else
    {
        hidePanel(view);
    }
}

/**
 * Close the panel on Escape.
 *
 * @param view - The chart.
 * @param event - The key press inside the panel.
 */
function handlePanelKey(view: TreeChartView, event: KeyboardEvent): void
{
    if (event.key === "Escape")
    {
        hidePanel(view);
    }
}

/**
 * Replace the chart with a note, for browsers that cannot draw it (no WebGL).
 *
 * @param container - The chart's container.
 */
function showChartUnavailable(container: HTMLElement): void
{
    const message = document.createElement("p");

    message.className = "tree-chart-unavailable";
    message.textContent = "The chart could not be shown in this browser. The outline below lists the same clades.";
    container.replaceChildren(message);
}

/**
 * Draw the chart in its container, with its panel.
 *
 * @param container - The chart's container.
 * @param panel - The panel listing a tip's genera.
 * @param chart - The chart's data.
 */
export function renderTreeChart(container: HTMLElement, panel: HTMLElement, chart: TreeChart): void
{
    let map: MapLibreMap;

    try
    {
        map = new MapLibreMap({
            container,
            style: createChartStyle(readTreeColors(), chart),
            bounds: chart.bounds,
            fitBoundsOptions: { padding: 24 },
            renderWorldCopies: false,
            attributionControl: false,
            cooperativeGestures: true,
            dragRotate: false,
            pitchWithRotate: false,
            touchPitch: false,
        });
    }
    catch
    {
        showChartUnavailable(container);

        return;
    }

    const view: TreeChartView = { map, chart, panel, fittedZoom: map.getZoom() };

    map.setMinZoom(view.fittedZoom - zoomOutRange);
    map.setMaxZoom(view.fittedZoom + zoomInRange);
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    map.on("click", "tip-labels", (event) => handleTipClick(view, event));
    map.on("click", "clade-labels", (event) => handleCladeClick(event));

    for (const layer of ["tip-labels", "clade-labels"])
    {
        map.on("mouseenter", layer, () => map.getCanvas().style.setProperty("cursor", "pointer"));
        map.on("mouseleave", layer, () => map.getCanvas().style.removeProperty("cursor"));
    }

    panel.querySelector(".tree-chart-panel-close")?.addEventListener("click", () => hidePanel(view));
    panel.addEventListener("keydown", (event) => handlePanelKey(view, event));

    container.addEventListener("tree-chart-find", (event) => showFindRequest(view, (event as CustomEvent<TreeChartFindRequest>).detail));

    // Follow the reader's light or dark setting: the tokens change, so the style is rebuilt.
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => map.setStyle(createChartStyle(readTreeColors(), chart)));

    map.on("load", () =>
    {
        container.dataset.ready = "true";
    });
}
