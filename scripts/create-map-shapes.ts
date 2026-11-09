import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

import type { OpenPaleoDataset } from "../src/data/dataset.ts";
import { datasetFileName, findDatasetDirectory } from "../src/data/locate-dataset.ts";
import type { MapPolygon, MapPosition, MapShapes } from "../src/data/map-shapes.ts";

// Builds src/data/map-shapes.json: the outlines the maps shade when a species' place is known
// only to its region or country. They come from Natural Earth (public domain), simplified and
// rounded so the file stays small. Only the regions the dataset uses are kept, and only the
// countries some species is known just to (directly, or through a region without an outline).
// Rerun it when the dataset adds a region or country: the build warns about any region code that
// has no outline and is not listed in the file's regionsWithoutOutline.
//
//     npm run create-map-shapes

/**
 * One Natural Earth feature, as far as this script reads it.
 */
type NaturalEarthFeature = {
    /**
     * The feature's attributes.
     */
    properties: Record<string, string | number | null>;

    /**
     * The outline.
     */
    geometry: NaturalEarthGeometry;
};

/**
 * A Natural Earth outline: one polygon or several.
 */
type NaturalEarthGeometry = {
    /**
     * "Polygon" or "MultiPolygon".
     */
    type: string;

    /**
     * Rings of [longitude, latitude] for a polygon; an array of those for a multipolygon.
     */
    coordinates: Array<Array<MapPosition>> | Array<Array<Array<MapPosition>>>;
};

/**
 * A Natural Earth GeoJSON file.
 */
type NaturalEarthCollection = {
    /**
     * The features.
     */
    features: Array<NaturalEarthFeature>;
};

const naturalEarthVersion = "v5.1.2";
const regionFile = "ne_10m_admin_1_states_provinces";
const countryFile = "ne_10m_admin_0_countries";

// Simplification tolerances in degrees, and the decimal places kept. A tenth of a degree is
// about 11 km; at the zoom levels the maps open at, these keep outlines recognizable.
const regionTolerance = 0.01;
const countryTolerance = 0.02;
const coordinateDigits = 3;

// Region codes the dataset uses (current ISO 3166-2) that Natural Earth 5.1.2 records under an
// older code, mapped to the Natural Earth regions covering the same area. Hauts-de-France was
// formed from five departments in 2016; Turkistan is the former South Kazakhstan region less
// Shymkent city, so its outline is approximate.
const regionEquivalents = new Map<string, Array<string>>([
    ["FR-HDF", ["FR-02", "FR-59", "FR-60", "FR-62", "FR-80"]],
    ["IN-TS", ["IN-TG"]],
    ["KZ-23", ["KZ-ATY"]],
    ["KZ-43", ["KZ-KZY"]],
    ["KZ-61", ["KZ-YUZ"]],
    ["PL-16", ["PL-OP"]],
]);

const scriptDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const rootDirectory = path.join(scriptDirectory, "..");
const downloadDirectory = path.join(rootDirectory, "scratch", "natural-earth", naturalEarthVersion);
const outputPath = path.join(rootDirectory, "src", "data", "map-shapes.json");

/**
 * Read a Natural Earth GeoJSON file, downloading it the first time.
 *
 * @param name - The file name without extension: "ne_10m_admin_0_countries".
 * @returns The parsed file.
 */
async function readNaturalEarthFile(name: string): Promise<NaturalEarthCollection>
{
    const filePath = path.join(downloadDirectory, name + ".geojson");

    if (!fs.existsSync(filePath))
    {
        const address = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/" + naturalEarthVersion + "/geojson/" + name + ".geojson";

        console.log("Downloading " + address);
        const response = await fetch(address);

        if (!response.ok)
        {
            throw new Error("Could not download " + address + ": " + response.status);
        }

        fs.mkdirSync(downloadDirectory, { recursive: true });
        fs.writeFileSync(filePath, Buffer.from(await response.arrayBuffer()));
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8")) as NaturalEarthCollection;
}

/**
 * Measure how far a point lies from the line through two others.
 *
 * @param point - The point.
 * @param start - One end of the line.
 * @param end - The other end.
 * @returns The distance, in degrees.
 */
function measureDistanceFromLine(point: MapPosition, start: MapPosition, end: MapPosition): number
{
    const deltaX = end[0] - start[0];
    const deltaY = end[1] - start[1];
    const length = Math.hypot(deltaX, deltaY);

    if (length === 0)
    {
        return Math.hypot(point[0] - start[0], point[1] - start[1]);
    }

    return Math.abs(deltaY * point[0] - deltaX * point[1] + end[0] * start[1] - end[1] * start[0]) / length;
}

/**
 * Simplify a ring with the Douglas–Peucker algorithm: keep the points that lie farther than the
 * tolerance from the simplified line, and round what is kept.
 *
 * @param ring - The ring's points, first and last equal.
 * @param tolerance - The largest distance a dropped point may lie from the result, in degrees.
 * @returns The simplified ring, or an empty array when too few points remain to enclose an area.
 */
function simplifyRing(ring: Array<MapPosition>, tolerance: number): Array<MapPosition>
{
    const isKept = new Array<boolean>(ring.length).fill(false);
    const spans: Array<Array<number>> = [[0, ring.length - 1]];

    isKept[0] = true;
    isKept[ring.length - 1] = true;

    while (spans.length > 0)
    {
        const [first, last] = spans.pop() as Array<number>;
        let farthest = -1;
        let farthestDistance = 0;

        for (let index = first + 1; index < last; index++)
        {
            const distance = measureDistanceFromLine(ring[index], ring[first], ring[last]);

            if (distance > farthestDistance)
            {
                farthest = index;
                farthestDistance = distance;
            }
        }

        if (farthest !== -1 && farthestDistance > tolerance)
        {
            isKept[farthest] = true;
            spans.push([first, farthest], [farthest, last]);
        }
    }

    const factor = 10 ** coordinateDigits;
    const simplified = new Array<MapPosition>();

    for (let index = 0; index < ring.length; index++)
    {
        if (isKept[index])
        {
            simplified.push([Math.round(ring[index][0] * factor) / factor, Math.round(ring[index][1] * factor) / factor]);
        }
    }

    return simplified.length >= 4 ? simplified : [];
}

/**
 * Simplify a Natural Earth outline into polygons, dropping rings too small to keep.
 *
 * @param geometry - The outline.
 * @param tolerance - The simplification tolerance, in degrees.
 * @returns The polygons, each an outer ring followed by any holes.
 */
function simplifyGeometry(geometry: NaturalEarthGeometry, tolerance: number): Array<MapPolygon>
{
    const sourcePolygons = geometry.type === "MultiPolygon"
        ? geometry.coordinates as Array<Array<Array<MapPosition>>>
        : [geometry.coordinates as Array<Array<MapPosition>>];
    const polygons = new Array<MapPolygon>();

    for (const sourcePolygon of sourcePolygons)
    {
        const outer = simplifyRing(sourcePolygon[0], tolerance);

        if (outer.length === 0)
        {
            continue;
        }

        const polygon: MapPolygon = [outer];

        for (const hole of sourcePolygon.slice(1))
        {
            const simplifiedHole = simplifyRing(hole, tolerance);

            if (simplifiedHole.length > 0)
            {
                polygon.push(simplifiedHole);
            }
        }

        polygons.push(polygon);
    }

    return polygons;
}

/**
 * Add a feature's simplified outline to a shape table, joining it to any outline already there
 * under the same code (Natural Earth splits some regions into several features).
 *
 * @param shapes - Outlines by code.
 * @param code - The code to file the outline under.
 * @param feature - The feature.
 * @param tolerance - The simplification tolerance, in degrees.
 */
function addShape(shapes: Record<string, Array<MapPolygon>>, code: string, feature: NaturalEarthFeature, tolerance: number): void
{
    const polygons = simplifyGeometry(feature.geometry, tolerance);

    if (polygons.length > 0)
    {
        shapes[code] = [...(shapes[code] ?? []), ...polygons];
    }
}

/**
 * Read a text attribute of a feature.
 *
 * @param feature - The feature.
 * @param name - The attribute.
 * @returns The value, or an empty string when absent or Natural Earth's "-99".
 */
function readAttribute(feature: NaturalEarthFeature, name: string): string
{
    const value = feature.properties[name];

    return typeof value === "string" && value !== "-99" ? value : "";
}

/**
 * Write the outlines file, listing the region codes the dataset uses that have no outline.
 */
async function createMapShapes(): Promise<void>
{
    const datasetDirectory = findDatasetDirectory(rootDirectory, process.env.OPEN_PALEO_DATA);
    const dataset = JSON.parse(fs.readFileSync(path.join(datasetDirectory, datasetFileName), "utf8")) as OpenPaleoDataset;
    const countriesWithoutRegion = new Set<string>();
    const countryByRegion = new Map<string, string>();

    for (const genus of Object.values(dataset.genera))
    {
        for (const species of genus.species)
        {
            const country = species.location?.country;
            const region = species.location?.region_code;

            if (country && region)
            {
                countryByRegion.set(region, country);
            }
            else if (country)
            {
                countriesWithoutRegion.add(country);
            }
        }
    }

    const regionsUsed = new Set(countryByRegion.keys());

    const regionFeatures = await readNaturalEarthFile(regionFile);
    const countryFeatures = await readNaturalEarthFile(countryFile);
    const regions: Record<string, Array<MapPolygon>> = {};
    const countries: Record<string, Array<MapPolygon>> = {};
    const featuresByRegion = new Map<string, Array<NaturalEarthFeature>>();

    for (const feature of regionFeatures.features)
    {
        const code = readAttribute(feature, "iso_3166_2");
        const features = featuresByRegion.get(code) ?? new Array<NaturalEarthFeature>();

        features.push(feature);
        featuresByRegion.set(code, features);

        if (regionsUsed.has(code))
        {
            addShape(regions, code, feature, regionTolerance);
        }
    }

    for (const [code, naturalEarthCodes] of regionEquivalents)
    {
        if (!regionsUsed.has(code))
        {
            continue;
        }

        for (const naturalEarthCode of naturalEarthCodes)
        {
            for (const feature of featuresByRegion.get(naturalEarthCode) ?? [])
            {
                addShape(regions, code, feature, regionTolerance);
            }
        }
    }

    // A country outline is shaded only for a species known just to its country, or to a region
    // without an outline, so only those countries are kept.
    const regionsWithoutOutline = new Array<string>();
    const countriesNeeded = new Set(countriesWithoutRegion);

    for (const code of [...regionsUsed].sort())
    {
        if (!regions[code])
        {
            regionsWithoutOutline.push(code);
            countriesNeeded.add(countryByRegion.get(code) ?? "");
        }
    }

    // ISO_A2_EH fills in the codes Natural Earth leaves as -99 in ISO_A2 (France, Norway).
    for (const feature of countryFeatures.features)
    {
        const code = readAttribute(feature, "ISO_A2_EH");

        if (countriesNeeded.has(code))
        {
            addShape(countries, code, feature, countryTolerance);
        }
    }

    const shapes: MapShapes = {
        source: "Natural Earth " + naturalEarthVersion + " (public domain), 1:10m admin-0 and admin-1, simplified",
        regions,
        countries,
        regionsWithoutOutline,
    };

    fs.writeFileSync(outputPath, JSON.stringify(shapes) + "\n");
    console.log("Wrote " + Object.keys(regions).length + " regions and " + Object.keys(countries).length + " countries to " + outputPath + " (" + Math.round(fs.statSync(outputPath).size / 1024) + " KB)");

    console.log(regionsWithoutOutline.length === 0
        ? "Every region the dataset uses has an outline."
        : "Drawn at country level, no outline for: " + regionsWithoutOutline.join(", "));
}

await createMapShapes();
