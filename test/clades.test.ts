import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { createAgeSpan, listDescendantGenera, listPlacedGenera } from "../src/data/clades.ts";
import { readDataset } from "../src/data/load-dataset.ts";
import type { CladeEntry, GenusEntry } from "../src/data/site-data.ts";
import { createSiteData } from "../src/data/site-data.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const siteData = createSiteData(readDataset(path.join(testDirectory, "fixtures"), "3.4.0"));

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

test("listPlacedGenera lists only the genera placed directly in a clade", () =>
{
    const clade = getClade("Tyrannosaurinae");
    const genera = listPlacedGenera(clade, siteData);
    const names = new Array<string>();

    for (const genus of genera)
    {
        names.push(genus.name);
    }

    assert.deepEqual(names, clade.genusNames);
    assert.ok(names.includes("Tyrannosaurus"));
});
