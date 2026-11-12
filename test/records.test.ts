import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { readDataset } from "../src/data/load-dataset.ts";
import { getTypeSpecies, listSizeMeasurements, sortSynonyms } from "../src/data/records.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.4.0");

test("getTypeSpecies finds the marked type species", () =>
{
    assert.equal(getTypeSpecies(dataset.genera.Tyrannosaurus).name, "Tyrannosaurus rex");
});

test("listSizeMeasurements orders and formats the recorded sizes", () =>
{
    const measurements = listSizeMeasurements(getTypeSpecies(dataset.genera.Tyrannosaurus).size);

    assert.deepEqual(measurements, [
        { label: "Length", value: "11.9–13 m" },
        { label: "Mass", value: "5,400–9,500 kg" },
        { label: "Hip height", value: "3.75 m" },
    ]);
});

test("listSizeMeasurements returns nothing for a species without sizes", () =>
{
    assert.deepEqual(listSizeMeasurements(undefined), []);
});

test("sortSynonyms orders by name and leaves the given list unchanged", () =>
{
    // Tyrannosaurus rex's synonyms, reversed so the sort has work to do.
    const synonyms = [...(getTypeSpecies(dataset.genera.Tyrannosaurus).synonyms ?? [])].reverse();
    const before = new Array<string>();
    const sorted = new Array<string>();

    for (const synonym of synonyms)
    {
        before.push(synonym.name);
    }

    for (const synonym of sortSynonyms(synonyms))
    {
        sorted.push(synonym.name);
    }

    assert.deepEqual(before, ["Manospondylus gigas", "Dynamosaurus imperiosus", "Dinotyrannus megagracilis"]);
    assert.deepEqual(sorted, ["Dinotyrannus megagracilis", "Dynamosaurus imperiosus", "Manospondylus gigas"]);
    assert.equal(synonyms[0].name, "Manospondylus gigas", "the given list keeps its order");
});
