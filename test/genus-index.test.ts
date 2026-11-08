import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { createGeologicTimeline } from "../src/data/age-figure.ts";
import type { GenusIndexRow } from "../src/data/genus-index.ts";
import { createGenusIndexRows, findMajorGroup, listGenusFilterOptions } from "../src/data/genus-index.ts";
import { readDataset } from "../src/data/load-dataset.ts";
import { createSiteData } from "../src/data/site-data.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.3.0");
const siteData = createSiteData(dataset);

assert.ok(dataset.timescale, "the fixture should carry the timescale");

const timeline = createGeologicTimeline(dataset.timescale);
const rows = createGenusIndexRows(siteData.genera, siteData, timeline);

/**
 * Find a genus's row.
 *
 * @param name - The genus name.
 * @returns The row.
 */
function findRow(name: string): GenusIndexRow
{
    for (const row of rows)
    {
        if (row.entry.name === name)
        {
            return row;
        }
    }

    throw new Error("no row for " + name);
}

test("a genus belongs to the major group above it in the tree", () =>
{
    assert.equal(findMajorGroup(findRow("Tyrannosaurus").entry, siteData), "Theropoda");
    assert.equal(findMajorGroup(findRow("Acanthopholis").entry, siteData), "Thyreophora");
    assert.equal(findMajorGroup(findRow("Adeopapposaurus").entry, siteData), "Sauropodomorpha");
});

test("a row's details give its group, epochs and country", () =>
{
    assert.equal(findRow("Tyrannosaurus").details, "Theropoda, Late Cretaceous, United States");
});

test("a row's filter values hold its period and epochs, traits, status and year", () =>
{
    const values = findRow("Acanthopholis").filterValues;

    assert.deepEqual(values.time, ["cretaceous", "late-cretaceous"]);
    assert.equal(values.group, "thyreophora");
    assert.equal(values.diet, "herbivore");
    assert.equal(values.integument, "armored");
    assert.equal(values.status, "nomen-dubium");
    assert.equal(values.year, 1867);
});

test("a genus dated to an epoch but no stage is still filtered by time", () =>
{
    assert.deepEqual(findRow("Anhuilong").filterValues.time, ["jurassic", "middle-jurassic"]);
});

test("filter options count every genus once per filter", () =>
{
    const options = listGenusFilterOptions(rows, timeline);

    for (const choice of options.choices)
    {
        if (choice.name === "time")
        {
            continue;
        }

        let total = 0;

        for (const option of choice.options)
        {
            total += option.count;
        }

        assert.ok(total <= rows.length, choice.name);
        assert.equal(choice.groups.length, 0, choice.name);
    }

    assert.equal(options.firstYear, 1867);
    assert.equal(options.lastYear, 2020);
});

test("the time filter lists periods oldest first, each followed by its epochs", () =>
{
    const time = listGenusFilterOptions(rows, timeline).choices[0];
    const labels = new Array<string>();

    for (const group of time.groups)
    {
        labels.push(group.label);
        assert.equal(group.options[0].label, "All of the " + group.label);
    }

    assert.deepEqual(labels, ["Jurassic", "Cretaceous"]);
});
