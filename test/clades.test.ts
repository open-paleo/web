import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import {
    createAgeSpan,
    createCladeGenusRows,
    createRangeBarGeometry,
    listDescendantGenera,
} from "../src/data/clades.ts";
import { readDataset } from "../src/data/load-dataset.ts";
import type { CladeEntry, GenusEntry } from "../src/data/site-data.ts";
import { createSiteData } from "../src/data/site-data.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const siteData = createSiteData(readDataset(path.join(testDirectory, "fixtures"), "3.3.0"));

/**
 * Get a clade entry that the fixture is known to contain.
 *
 * @param name - Clade name.
 * @returns The entry.
 */
function getClade(name: string): CladeEntry
{
    const clade = siteData.cladeByName.get(name);

    assert.ok(clade, name + " should be in the fixture");

    return clade;
}

/**
 * List the names of genus entries.
 *
 * @param genera - The entries.
 * @returns Their names.
 */
function listNames(genera: Array<GenusEntry>): Array<string>
{
    const names = new Array<string>();

    for (const genus of genera)
    {
        names.push(genus.name);
    }

    return names;
}

test("listDescendantGenera gathers genera from every clade below, sorted", () =>
{
    assert.deepEqual(
        listNames(listDescendantGenera(getClade("Tyrannosauridae"), siteData)),
        ["Daspletosaurus", "Tarbosaurus", "Tyrannosaurus"],
    );
    assert.equal(listDescendantGenera(getClade("Dinosauria"), siteData).length, siteData.genera.length);
});

test("createAgeSpan runs from the oldest genus to the youngest and names the epochs at each end", () =>
{
    const span = createAgeSpan(listDescendantGenera(getClade("Tyrannosaurinae"), siteData), siteData.timeline);

    assert.ok(span);
    assert.equal(span.from_ma, 83.6);
    assert.equal(span.to_ma, 66);
    assert.deepEqual(span.name, ["Late Cretaceous"]);
});

test("createAgeSpan names both epochs when a span crosses periods", () =>
{
    const span = createAgeSpan(listDescendantGenera(getClade("Dinosauria"), siteData), siteData.timeline);

    assert.ok(span);
    assert.equal(span.name?.length, 2);
    assert.equal(span.name?.[1], "Late Cretaceous");
});

test("createRangeBarGeometry places a range on its scale", () =>
{
    assert.deepEqual(createRangeBarGeometry(83.6, 72.2, { from_ma: 83.6, to_ma: 66 }), {
        leftPercent: 0,
        widthPercent: (83.6 - 72.2) / (83.6 - 66) * 100,
    });
    assert.deepEqual(createRangeBarGeometry(70, 70, { from_ma: 70, to_ma: 70 }), { leftPercent: 0, widthPercent: 100 });
});

test("createCladeGenusRows formats each directly placed genus", () =>
{
    const clade = getClade("Tyrannosaurinae");
    const rows = createCladeGenusRows(clade, siteData, { from_ma: 83.6, to_ma: 66 });
    const tyrannosaurus = rows[rows.length - 1];

    assert.equal(rows.length, clade.genusNames.length);
    assert.equal(tyrannosaurus.entry.name, "Tyrannosaurus");
    assert.equal(tyrannosaurus.authority, "Osborn, 1905");
    assert.equal(tyrannosaurus.age, "Maastrichtian");
    assert.equal(tyrannosaurus.ageNumbers, "72.2–66.0");
    assert.equal(tyrannosaurus.country, "United States");
    assert.equal(tyrannosaurus.status, "valid");
    assert.equal(rows[1].entry.name, "Tarbosaurus");
    assert.equal(rows[1].isDisputed, true);
});
