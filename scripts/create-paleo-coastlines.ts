import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

import type { OpenPaleoDataset } from "../src/data/dataset.ts";
import { datasetFileName, findDatasetDirectory } from "../src/data/locate-dataset.ts";
import { measureRingArea, simplifyPolygons } from "../src/data/map-geometry.ts";
import type { MapPolygon } from "../src/data/map-shapes.ts";
import { createSlug } from "../src/data/slugs.ts";

// Builds public/paleo-coastlines/{stage}.json: the coastlines of the world at the middle of each
// stage the dataset's species are dated to, from the plate model of Wright et al. (2013), which
// the GPlates web service calls GOLONKA. The data repository reconstructs each species' position
// with the same model, so the positions and these coastlines match. Run by hand when the stages in
// the dataset change; the files are committed, so building the site needs no network, and readers'
// browsers never contact GPlates.
//
// The model is licensed CC BY 3.0 AU (University of Sydney); every map drawn from these files
// credits it with the citation below.

/**
 * One stage's coastlines, as written.
 */
type PaleoCoastlines = {
    /**
     * The stage: "Kimmeridgian".
     */
    stage: string;

    /**
     * The age the coastlines are reconstructed at: the stage's midpoint, in millions of years.
     */
    ageMa: number;

    /**
     * The plate model, as the GPlates web service names it.
     */
    model: string;

    /**
     * The model's citation and license, for the credit on maps.
     */
    credit: string;

    /**
     * The land, as polygons of [longitude, latitude] rings; the first ring of each is its outline.
     */
    polygons: Array<MapPolygon>;
};

/**
 * A GeoJSON polygon feature, as the GPlates web service returns it.
 */
type ServicePolygon = {
    /**
     * The geometry.
     */
    geometry: ServiceGeometry;
};

/**
 * A GeoJSON polygon geometry.
 */
type ServiceGeometry = {
    /**
     * The geometry type; the service returns "Polygon".
     */
    type: string;

    /**
     * The polygon's rings.
     */
    coordinates: MapPolygon;
};

/**
 * The service's response.
 */
type ServiceCollection = {
    /**
     * The coastline polygons.
     */
    features: Array<ServicePolygon>;
};

const model = "GOLONKA";
const credit = "Wright, N., Zahirovic, S., Müller, R. D., & Seton, M. (2013). Towards community-driven paleogeographic reconstructions: integrating open-access paleogeographic and paleobiology data with plate tectonics. Biogeosciences, 10, 1529–1541. CC BY 3.0 AU.";
const serviceAddress = "https://gws.gplates.org/reconstruct/coastlines/";

// The largest distance a dropped point may lie from the simplified outline, in degrees, and the
// decimal places kept. Enough for a world map; a genus page shows the whole ancient world.
const tolerance = 0.12;
const coordinateDigits = 2;

// Land smaller than this many square degrees (at the equator, about 2,500 km²) is dropped: the
// service returns over a thousand islets of a few points each.
const minimumArea = 0.2;

const scriptDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const rootDirectory = path.join(scriptDirectory, "..");
const outputDirectory = path.join(rootDirectory, "public", "paleo-coastlines");

/**
 * Get the stages the dataset's species are dated to, with each stage's midpoint, oldest first.
 *
 * @param dataset - The dataset.
 * @returns The stages and their midpoints in millions of years.
 */
function getDatedStages(dataset: OpenPaleoDataset): Array<[string, number]>
{
    const names = new Set<string>();

    for (const genus of Object.values(dataset.genera))
    {
        for (const species of genus.species)
        {
            for (const stage of species.period.stage ?? [])
            {
                names.add(stage);
            }
        }
    }

    const stages = new Array<[string, number]>();

    for (const name of names)
    {
        const range = dataset.timescale?.stages[name];

        if (range)
        {
            stages.push([name, Math.round((range.from_ma + range.to_ma) / 2 * 10) / 10]);
        }
    }

    return stages.sort((first, second) => second[1] - first[1]);
}

/**
 * Download the coastlines at an age, retrying twice: the service is sometimes slow.
 *
 * @param ageMa - The age, in millions of years.
 * @returns The service's polygons.
 */
async function downloadCoastlines(ageMa: number): Promise<ServiceCollection>
{
    const address = serviceAddress + "?" + new URLSearchParams({ time: String(ageMa), model }).toString();

    for (let attempt = 1; attempt <= 3; attempt++)
    {
        const response = await fetch(address, { headers: { "User-Agent": "open-paleo-paleo-coastlines" } });

        if (response.ok)
        {
            return await response.json() as ServiceCollection;
        }

        console.log("  attempt " + attempt + " failed: " + response.status);
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error("Could not download the coastlines at " + ageMa + " Ma from " + address);
}

/**
 * Keep the land large enough to see on a world map, simplified.
 *
 * @param collection - The service's polygons.
 * @returns The polygons kept.
 */
function simplifyCoastlines(collection: ServiceCollection): Array<MapPolygon>
{
    const large = new Array<MapPolygon>();

    for (const feature of collection.features)
    {
        if (feature.geometry.type === "Polygon" && measureRingArea(feature.geometry.coordinates[0]) >= minimumArea)
        {
            large.push(feature.geometry.coordinates);
        }
    }

    return simplifyPolygons(large, tolerance, coordinateDigits);
}

/**
 * Write the coastlines for every dated stage.
 */
async function createPaleoCoastlines(): Promise<void>
{
    const datasetDirectory = findDatasetDirectory(rootDirectory, process.env.OPEN_PALEO_DATA);
    const dataset = JSON.parse(fs.readFileSync(path.join(datasetDirectory, datasetFileName), "utf8")) as OpenPaleoDataset;
    const stages = getDatedStages(dataset);

    fs.mkdirSync(outputDirectory, { recursive: true });

    for (const [stage, ageMa] of stages)
    {
        const collection = await downloadCoastlines(ageMa);
        const polygons = simplifyCoastlines(collection);
        const output: PaleoCoastlines = { stage, ageMa, model, credit, polygons };
        const file = path.join(outputDirectory, createSlug(stage) + ".json");
        const json = JSON.stringify(output);

        fs.writeFileSync(file, json + "\n");
        console.log(stage + " (" + ageMa + " Ma): " + collection.features.length + " polygons from the service, " + polygons.length + " kept, " + Math.round(json.length / 1024) + " KB");
    }

    console.log("Wrote " + stages.length + " stages to " + path.relative(rootDirectory, outputDirectory));
}

await createPaleoCoastlines();
