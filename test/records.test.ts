import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { readDataset } from "../src/data/load-dataset.ts";
import { getTypeSpecies, listSizeMeasurements } from "../src/data/records.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.3.0");

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
