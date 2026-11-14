import { coloredCladeNames, createCladeColorToken } from "./clade-colors.ts";
import type { CladeEntry, SiteData } from "./site-data.ts";

// The Tree page's chart: the classification from Dinosauria down, drawn left to right, with the
// genera summarized. A clade with no clades below it is a tip itself; a clade with both
// subclades and genera of its own gets one more tip for those genera. Each tip ends one step past
// its parent. The layout is written as GeoJSON in Web Mercator coordinates, so MapLibre, which
// draws the site's maps, can pan and zoom it like a map.

/**
 * A longitude and latitude.
 */
export type LngLat = [number, number];

/**
 * A branch: a line from a clade to a child, or the line joining a clade's children.
 */
export type TreeChartBranch = {
    /**
     * GeoJSON feature type.
     */
    type: "Feature";

    /**
     * The line.
     */
    geometry: TreeChartLine;

    /**
     * How the line is drawn.
     */
    properties: TreeChartBranchProperties;
};

/**
 * A GeoJSON line.
 */
export type TreeChartLine = {
    /**
     * GeoJSON geometry type.
     */
    type: "LineString";

    /**
     * The line's points.
     */
    coordinates: Array<LngLat>;
};

/**
 * How a branch is drawn.
 */
export type TreeChartBranchProperties = {
    /**
     * The major group it belongs to, for its color, or "other".
     */
    group: string;

    /**
     * Whether it leads to a tip, which is drawn lighter.
     */
    isTip: boolean;
};

/**
 * The tinted area behind a major group.
 */
export type TreeChartTint = {
    /**
     * GeoJSON feature type.
     */
    type: "Feature";

    /**
     * The area.
     */
    geometry: TreeChartArea;

    /**
     * The group.
     */
    properties: TreeChartTintProperties;
};

/**
 * A GeoJSON polygon.
 */
export type TreeChartArea = {
    /**
     * GeoJSON geometry type.
     */
    type: "Polygon";

    /**
     * The outline, as one closed ring.
     */
    coordinates: Array<Array<LngLat>>;
};

/**
 * Which group a tinted area belongs to.
 */
export type TreeChartTintProperties = {
    /**
     * The major group.
     */
    group: string;
};

/**
 * A label: a clade's name at its node, or a tip's name and the summary of its genera.
 */
export type TreeChartLabel = {
    /**
     * GeoJSON feature type.
     */
    type: "Feature";

    /**
     * Where the label is anchored.
     */
    geometry: TreeChartPoint;

    /**
     * What the label shows and what selecting it does.
     */
    properties: TreeChartLabelProperties;
};

/**
 * A GeoJSON point.
 */
export type TreeChartPoint = {
    /**
     * GeoJSON geometry type.
     */
    type: "Point";

    /**
     * The point.
     */
    coordinates: LngLat;
};

/**
 * What a label shows and what selecting it does.
 */
export type TreeChartLabelProperties = {
    /**
     * "clade" for a clade's name at its node, "tip" for a tip.
     */
    kind: "clade" | "tip";

    /**
     * The clade's name; empty for a tip of genera placed directly in a clade, which shows only
     * the summary.
     */
    name: string;

    /**
     * The slug of the clade the label belongs to.
     */
    slug: string;

    /**
     * For a tip, the key of its entry in the chart's tips; otherwise empty.
     */
    tipKey: string;

    /**
     * For a tip, the type genus when it is among the tip's genera, set in italic; otherwise
     * empty. A tip of a single genus shows that genus here.
     */
    summaryItalic: string;

    /**
     * For a tip, the rest of its summary: " and 12 others", "12 genera".
     */
    summaryRest: string;

    /**
     * How many genera the label's clade or tip holds, which ranks labels when they collide.
     */
    size: number;

    /**
     * Whether it names one of the major groups, which are labeled first and largest.
     */
    isGroup: boolean;
};

/**
 * A genus listed in a tip's panel.
 */
export type TreeChartGenus = {
    /**
     * The genus name.
     */
    name: string;

    /**
     * Its page's slug.
     */
    slug: string;
};

/**
 * A tip's genera, for the panel that selecting the tip opens.
 */
export type TreeChartTip = {
    /**
     * The clade the genera belong to.
     */
    cladeName: string;

    /**
     * That clade's slug.
     */
    cladeSlug: string;

    /**
     * Whether these are the genera placed directly in a clade that also has subclades, rather
     * than the genera of a clade with no clades below it.
     */
    isDirect: boolean;

    /**
     * The genera, A to Z.
     */
    genera: Array<TreeChartGenus>;
};

/**
 * Every feature of one kind.
 */
export type TreeChartCollection<Feature> = {
    /**
     * GeoJSON collection type.
     */
    type: "FeatureCollection";

    /**
     * The features.
     */
    features: Array<Feature>;
};

/**
 * Everything the chart draws.
 */
export type TreeChart = {
    /**
     * The branches.
     */
    branches: TreeChartCollection<TreeChartBranch>;

    /**
     * The tinted areas behind the major groups.
     */
    tints: TreeChartCollection<TreeChartTint>;

    /**
     * The labels.
     */
    labels: TreeChartCollection<TreeChartLabel>;

    /**
     * Each tip's genera, by the tip's key.
     */
    tips: Record<string, TreeChartTip>;

    /**
     * The corners of the area the chart covers: south-west, then north-east.
     */
    bounds: [LngLat, LngLat];

    /**
     * The distance between neighboring rows, in Web Mercator world units (the world is 1 wide).
     */
    rowHeight: number;
};

/**
 * A node of the chart while it is laid out: a clade, or a tip of genera.
 */
type ChartNode = {
    /**
     * The clade.
     */
    clade: CladeEntry;

    /**
     * Whether this node is the tip of genera placed directly in the clade, rather than the clade.
     */
    isDirectGenera: boolean;

    /**
     * Steps from the top clade.
     */
    depth: number;

    /**
     * The major group it belongs to, or "other".
     */
    group: string;

    /**
     * The nodes below it, subclades first.
     */
    children: Array<ChartNode>;

    /**
     * For a tip, its genera, A to Z; otherwise empty.
     */
    genera: Array<string>;

    /**
     * The row it sits on: a tip's own row, or midway between its first and last child.
     */
    row: number;

    /**
     * The first and last rows of the tips below it.
     */
    firstRow: number;

    /**
     * The last row of the tips below it.
     */
    lastRow: number;
};

/**
 * The scale of the layout, in rows.
 */
type ChartScale = {
    /**
     * World units per row.
     */
    unit: number;

    /**
     * How far one step of depth reaches, in rows.
     */
    stepWidth: number;

    /**
     * The left and top edges of the layout, in rows, so it is centered on the world.
     */
    left: number;

    /**
     * The top edge, in rows.
     */
    top: number;
};

// How far one step of depth reaches, in rows: wide enough that the branches spread across the
// chart instead of bunching on the left.
const stepWidth = 4.5;

// Room past a tip for its label, in steps of depth.
const labelRoom = 5;

// The chart's height in Web Mercator world units: a quarter of the world, well clear of the poles.
const chartHeight = 0.25;

/**
 * Build the chart's node for a clade and everything below it.
 *
 * @param clade - The clade.
 * @param depth - Steps from the top clade.
 * @param group - The major group above it, or "other".
 * @param siteData - The lookup tables.
 * @returns The node.
 */
function buildNode(clade: CladeEntry, depth: number, group: string, siteData: SiteData): ChartNode
{
    const ownGroup = coloredCladeNames.includes(clade.name) ? clade.name : group;
    const node: ChartNode = { clade, isDirectGenera: false, depth, group: ownGroup, children: [], genera: [], row: 0, firstRow: 0, lastRow: 0 };
    const genera = [...clade.genusNames].sort((first, second) => first.localeCompare(second, "en"));

    for (const childName of clade.childCladeNames)
    {
        const child = siteData.cladeByName.get(childName);

        if (child)
        {
            node.children.push(buildNode(child, depth + 1, ownGroup, siteData));
        }
    }

    if (node.children.length === 0)
    {
        node.genera = genera;
    }
    else if (genera.length > 0)
    {
        node.children.push({ clade, isDirectGenera: true, depth: depth + 1, group: ownGroup, children: [], genera, row: 0, firstRow: 0, lastRow: 0 });
    }

    return node;
}

/**
 * Give each tip its row, in order, and each clade the row midway between its first and last
 * child.
 *
 * @param node - The node.
 * @param nextRow - The row the next tip takes.
 * @returns The row after the last tip below the node.
 */
function placeNode(node: ChartNode, nextRow: number): number
{
    if (node.children.length === 0)
    {
        node.row = nextRow;
        node.firstRow = nextRow;
        node.lastRow = nextRow;

        return nextRow + 1;
    }

    let row = nextRow;

    for (const child of node.children)
    {
        row = placeNode(child, row);
    }

    node.firstRow = node.children[0].firstRow;
    node.lastRow = node.children[node.children.length - 1].lastRow;
    node.row = (node.children[0].row + node.children[node.children.length - 1].row) / 2;

    return row;
}

/**
 * List a node and every node below it, parents before children.
 *
 * @param node - The node.
 * @param nodes - The list to add to.
 */
function listNodes(node: ChartNode, nodes: Array<ChartNode>): void
{
    nodes.push(node);

    for (const child of node.children)
    {
        listNodes(child, nodes);
    }
}

/**
 * Find the greatest depth of any tip below a node.
 *
 * @param node - The node.
 * @returns The depth.
 */
function findDeepestTip(node: ChartNode): number
{
    let deepest = node.depth;

    for (const child of node.children)
    {
        deepest = Math.max(deepest, findDeepestTip(child));
    }

    return deepest;
}

/**
 * Turn a position in the layout, in steps of depth across and rows down, into a longitude and
 * latitude. Web Mercator is conformal, so placing the layout linearly in its world square keeps
 * distances on screen true at every zoom.
 *
 * @param depth - Steps of depth from the top clade.
 * @param row - Rows from the top.
 * @param scale - The layout's scale.
 * @returns The longitude and latitude.
 */
function locate(depth: number, row: number, scale: ChartScale): LngLat
{
    const worldX = 0.5 + (scale.left + depth * scale.stepWidth) * scale.unit;
    const worldY = 0.5 + (scale.top + row) * scale.unit;

    return [worldX * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * worldY))) * 180 / Math.PI];
}

/**
 * Summarize a tip's genera: its type genus and how many others when the type genus is among
 * them ("Ornithomimus" and " and 12 others"), the genus itself when there is one, or a count.
 *
 * @param clade - The clade the genera belong to.
 * @param genera - The genera.
 * @returns The italic part and the rest.
 */
function summarizeGenera(clade: CladeEntry, genera: Array<string>): [string, string]
{
    const typeGenus = clade.record?.type_genus;

    if (genera.length === 1)
    {
        return [genera[0], ""];
    }

    if (typeGenus && genera.includes(typeGenus))
    {
        const others = genera.length - 1;

        return [typeGenus, " and " + others + (others === 1 ? " other" : " others")];
    }

    return ["", genera.length + " genera"];
}

/**
 * Add a clade node's branches and label to the chart.
 *
 * @param node - The clade node.
 * @param scale - The layout's scale.
 * @param chart - The chart to add to.
 */
function drawClade(node: ChartNode, scale: ChartScale, chart: TreeChart): void
{
    const first = node.children[0];
    const last = node.children[node.children.length - 1];

    chart.branches.features.push(createBranch([locate(node.depth, first.row, scale), locate(node.depth, last.row, scale)], node.group, false));

    for (const child of node.children)
    {
        chart.branches.features.push(createBranch([locate(node.depth, child.row, scale), locate(child.depth, child.row, scale)], child.group, child.children.length === 0));
    }

    chart.labels.features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: locate(node.depth, node.row, scale) },
        properties: {
            kind: "clade",
            name: node.clade.name,
            slug: node.clade.slug,
            tipKey: "",
            summaryItalic: "",
            summaryRest: "",
            size: node.clade.totalGenusCount,
            isGroup: coloredCladeNames.includes(node.clade.name),
        },
    });

    if (coloredCladeNames.includes(node.clade.name))
    {
        const right = findDeepestTip(node) + labelRoom;
        const ring = [
            locate(node.depth, node.firstRow - 0.5, scale),
            locate(right, node.firstRow - 0.5, scale),
            locate(right, node.lastRow + 0.5, scale),
            locate(node.depth, node.lastRow + 0.5, scale),
        ];

        chart.tints.features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] }, properties: { group: node.group } });
    }
}

/**
 * Add a tip's label and its entry in the chart's tips.
 *
 * @param node - The tip.
 * @param scale - The layout's scale.
 * @param siteData - The lookup tables.
 * @param chart - The chart to add to.
 */
function drawTip(node: ChartNode, scale: ChartScale, siteData: SiteData, chart: TreeChart): void
{
    const key = node.clade.slug + (node.isDirectGenera ? "/direct" : "");
    const [summaryItalic, summaryRest] = summarizeGenera(node.clade, node.genera);
    const genera = new Array<TreeChartGenus>();

    for (const name of node.genera)
    {
        genera.push({ name, slug: siteData.genusByName.get(name)?.slug ?? "" });
    }

    chart.tips[key] = { cladeName: node.clade.name, cladeSlug: node.clade.slug, isDirect: node.isDirectGenera, genera };
    chart.labels.features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: locate(node.depth, node.row, scale) },
        properties: {
            kind: "tip",
            name: node.isDirectGenera ? "" : node.clade.name,
            slug: node.clade.slug,
            tipKey: key,
            summaryItalic,
            summaryRest,
            size: node.genera.length,
            isGroup: false,
        },
    });
}

/**
 * Create one branch.
 *
 * @param coordinates - Its two ends.
 * @param group - The major group it belongs to.
 * @param isTip - Whether it leads to a tip.
 * @returns The branch.
 */
function createBranch(coordinates: Array<LngLat>, group: string, isTip: boolean): TreeChartBranch
{
    return { type: "Feature", geometry: { type: "LineString", coordinates }, properties: { group, isTip } };
}

/**
 * Find the clade the Tree page's chart and outline start from: the first clade with a record of
 * its own (today Dinosauria). The ranks above it carry no record and have no page.
 *
 * @param siteData - The lookup tables.
 * @returns The clade, or undefined if no clade has a record.
 */
export function findTreeTop(siteData: SiteData): CladeEntry | undefined
{
    for (const clade of siteData.clades)
    {
        if (clade.record)
        {
            return clade;
        }
    }

    return undefined;
}

/**
 * Lay out the Tree page's chart.
 *
 * @param top - The chart's top clade (Dinosauria).
 * @param siteData - The lookup tables.
 * @returns Everything the chart draws.
 */
export function createTreeChart(top: CladeEntry, siteData: SiteData): TreeChart
{
    const root = buildNode(top, 0, "other", siteData);
    const rowCount = placeNode(root, 0);
    const width = (findDeepestTip(root) + labelRoom) * stepWidth;
    const scale: ChartScale = { unit: chartHeight / rowCount, stepWidth, left: -width / 2, top: -rowCount / 2 };
    const nodes = new Array<ChartNode>();
    const chart: TreeChart = {
        branches: { type: "FeatureCollection", features: [] },
        tints: { type: "FeatureCollection", features: [] },
        labels: { type: "FeatureCollection", features: [] },
        tips: {},
        bounds: [locate(0, rowCount, scale), locate(findDeepestTip(root) + labelRoom, -1, scale)],
        rowHeight: scale.unit,
    };

    listNodes(root, nodes);

    for (const node of nodes)
    {
        if (node.children.length > 0)
        {
            drawClade(node, scale, chart);
        }
        else
        {
            drawTip(node, scale, siteData, chart);
        }
    }

    return chart;
}

/**
 * One entry of the chart's legend: a major group, its page and its color token.
 */
export type TreeChartLegendEntry = {
    /**
     * The group's name: "Theropoda".
     */
    name: string;

    /**
     * Its clade page's slug.
     */
    slug: string;

    /**
     * Its color token: "--color-clade-theropoda".
     */
    colorToken: string;
};

/**
 * List the chart's legend: each major group the tree has, with its page and color.
 *
 * @param siteData - The lookup tables.
 * @returns The entries, in the order of coloredCladeNames.
 */
export function listTreeChartLegend(siteData: SiteData): Array<TreeChartLegendEntry>
{
    const entries = new Array<TreeChartLegendEntry>();

    for (const name of coloredCladeNames)
    {
        const clade = siteData.cladeByName.get(name);

        if (clade)
        {
            entries.push({ name, slug: clade.slug, colorToken: createCladeColorToken(name) });
        }
    }

    return entries;
}
