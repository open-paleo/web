import * as assert from "node:assert/strict";
import { test } from "node:test";

import { getTypeSpecies, getSizeMeasurements, sortSynonyms } from "../src/data/records.ts";
import { readFixture } from "./fixture.ts";

const dataset = readFixture();

test("getTypeSpecies finds the marked type species", () =>
{
    assert.equal(getTypeSpecies(dataset.genera.Tyrannosaurus).name, "Tyrannosaurus rex");
});

test("getSizeMeasurements orders and formats the recorded sizes", () =>
{
    const measurements = getSizeMeasurements(getTypeSpecies(dataset.genera.Tyrannosaurus).size);

    assert.deepEqual(measurements, [
        { label: "Length", value: "11.9–13 m" },
        { label: "Mass", value: "5,400–9,500 kg" },
        { label: "Hip height", value: "3.75 m" },
    ]);
});

test("getSizeMeasurements returns nothing for a species without sizes", () =>
{
    assert.deepEqual(getSizeMeasurements(undefined), []);
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
