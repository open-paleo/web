import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { createGeologicTimeline } from "../src/data/age-figure.ts";
import type { GenusIndexRow } from "../src/data/genus-index.ts";
import type { GenusDetail } from "../src/data/genus-index.ts";
import { createGenusIndexRows, findMajorGroup, listGenusFilterOptions, shouldGroupByLetter } from "../src/data/genus-index.ts";
import { readDataset } from "../src/data/load-dataset.ts";
import { createSiteData } from "../src/data/site-data.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.3.0");
const siteData = createSiteData(dataset);

assert.ok(dataset.timescale, "the fixture should carry the timescale");

const timeline = createGeologicTimeline(dataset.timescale);
const rows = createGenusIndexRows(siteData.genera, siteData, timeline, "index");

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

/**
 * Write a details line as text, marking each item's kind when it is not plain text.
 *
 * @param details - The details.
 * @returns The items joined with commas: "Tyrannosaurinae [clade], Maastrichtian (72.2–66.0 Ma)".
 */
function describeDetails(details: Array<GenusDetail>): string
{
    const items = new Array<string>();

    for (const detail of details)
    {
        items.push(detail.kind === "text" ? detail.text : detail.text + " [" + detail.kind + "]");
    }

    return items.join(", ");
}

/**
 * Find a genus's row in a list made for another page.
 *
 * @param name - The genus name.
 * @param context - The page the list is on.
 * @returns The row.
 */
function findContextRow(name: string, context: "stage" | "clade"): GenusIndexRow
{
    const entry = siteData.genusByName.get(name);

    assert.ok(entry);

    return createGenusIndexRows([entry], siteData, timeline, context)[0];
}

test("on the Genera page a row's details give its group, epochs and country", () =>
{
    assert.equal(describeDetails(findRow("Tyrannosaurus").details), "Theropoda, Late Cretaceous, United States");
});

test("on a stage page a row's details link its clade and give its dated stages", () =>
{
    assert.equal(describeDetails(findContextRow("Tyrannosaurus", "stage").details), "Tyrannosaurinae [clade], Maastrichtian (72.2–66.0 Ma), United States");
    assert.ok(describeDetails(findContextRow("Tarbosaurus", "stage").details).endsWith("under dispute [dispute]"));
});

test("on a clade page a row's details leave out the clade", () =>
{
    assert.equal(describeDetails(findContextRow("Tyrannosaurus", "clade").details), "Maastrichtian (72.2–66.0 Ma), United States");
});

test("only lists of more than 100 genera are grouped by letter", () =>
{
    assert.equal(shouldGroupByLetter(100), false);
    assert.equal(shouldGroupByLetter(101), true);
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

    let firstYear = Number.POSITIVE_INFINITY;
    let lastYear = Number.NEGATIVE_INFINITY;

    for (const row of rows)
    {
        firstYear = Math.min(firstYear, row.filterValues.year ?? firstYear);
        lastYear = Math.max(lastYear, row.filterValues.year ?? lastYear);
    }

    assert.equal(options.firstYear, firstYear);
    assert.equal(options.lastYear, lastYear);
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
