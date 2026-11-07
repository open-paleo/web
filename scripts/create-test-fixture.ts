import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

import type { Clade, Genus, OpenPaleoDataset, TreeNode } from "../src/data/dataset.ts";
import { datasetFileName, findDatasetDirectory } from "../src/data/locate-dataset.ts";

// Builds test/fixtures/open-paleo.json: a small dataset cut from the real one, so tests run
// against real records. It keeps a few named genera plus the first genus (alphabetically) that
// shows each case the tests need, every clade on their lineages, and the tree pruned to those
// clades. Rerun it after a schema change and review the diff.

const namedGenera = ["Tyrannosaurus", "Tarbosaurus", "Nanotyrannus", "Daspletosaurus"];

const scriptDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const rootDirectory = path.join(scriptDirectory, "..");
const datasetDirectory = findDatasetDirectory(rootDirectory, process.env.OPEN_PALEO_DATA);
const dataset = JSON.parse(fs.readFileSync(path.join(datasetDirectory, datasetFileName), "utf8")) as OpenPaleoDataset;

/**
 * Report whether a genus has a species with the given status.
 *
 * @param genus - The genus record.
 * @param status - The status to look for.
 * @returns True if any species has that status.
 */
function hasSpeciesWithStatus(genus: Genus, status: string): boolean
{
    for (const species of genus.species)
    {
        if (species.status === status)
        {
            return true;
        }
    }

    return false;
}

/**
 * Report whether a genus cites a reference whose key matches a pattern.
 *
 * @param genus - The genus record.
 * @param pattern - Pattern tested against each reference key.
 * @returns True if any key matches.
 */
function hasReferenceKeyMatching(genus: Genus, pattern: RegExp): boolean
{
    for (const reference of genus.references ?? [])
    {
        if (pattern.test(reference.id))
        {
            return true;
        }
    }

    return false;
}

/**
 * Find the first genus, alphabetically, that is not yet chosen and passes a test.
 *
 * @param chosen - Genera already in the fixture.
 * @param test - Returns true for a genus that shows the needed case.
 * @returns The genus name.
 */
function findFirstGenus(chosen: Set<string>, test: (genus: Genus) => boolean): string
{
    for (const name of Object.keys(dataset.genera).sort())
    {
        if (!chosen.has(name) && test(dataset.genera[name]))
        {
            return name;
        }
    }

    throw new Error("No genus in the dataset passes the test.");
}

/**
 * Copy the part of a tree whose nodes are all in the kept set.
 *
 * @param node - A node of the full tree.
 * @param keptClades - Names of the clades to keep.
 * @returns The pruned subtree.
 */
function pruneTree(node: TreeNode, keptClades: Set<string>): TreeNode
{
    const pruned: TreeNode = {};

    for (const name of Object.keys(node))
    {
        if (keptClades.has(name))
        {
            pruned[name] = pruneTree(node[name], keptClades);
        }
    }

    return pruned;
}

const chosen = new Set<string>(namedGenera);

chosen.add(findFirstGenus(chosen, (genus) => hasSpeciesWithStatus(genus, "nomen dubium")));
chosen.add(findFirstGenus(chosen, (genus) => (genus.iczn_cases ?? []).length > 0));
chosen.add(findFirstGenus(chosen, (genus) => hasReferenceKeyMatching(genus, /'/)));
chosen.add(findFirstGenus(chosen, (genus) => hasReferenceKeyMatching(genus, /\P{ASCII}/u)));

const genera: Record<string, Genus> = {};
const keptClades = new Set<string>();

for (const name of [...chosen].sort())
{
    const genus = dataset.genera[name];

    genera[name] = genus;

    for (const cladeName of genus.taxonomy)
    {
        keptClades.add(cladeName);
    }
}

const clades: Record<string, Clade> = {};

for (const name of [...keptClades].sort())
{
    if (dataset.clades[name])
    {
        clades[name] = dataset.clades[name];
    }
}

const fixture: OpenPaleoDataset = {
    _metadata: {
        ...dataset._metadata,
        genus_count: Object.keys(genera).length,
        clade_count: Object.keys(clades).length,
    },
    timescale: dataset.timescale,
    tree: pruneTree(dataset.tree, keptClades),
    clades,
    genera,
};

const outputPath = path.join(rootDirectory, "test", "fixtures", datasetFileName);

fs.writeFileSync(outputPath, JSON.stringify(fixture, null, 2) + "\n");
console.log("Wrote " + Object.keys(genera).join(", ") + " to " + outputPath);
