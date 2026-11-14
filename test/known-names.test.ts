import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { listKnownCladeNames, listKnownTaxonNames } from "../src/data/known-names.ts";
import { readDataset } from "../src/data/load-dataset.ts";
import { createSiteData } from "../src/data/site-data.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const siteData = createSiteData(readDataset(path.join(testDirectory, "fixtures"), "3.4.0"));

test("the known names hold every genus, species, synonym and original combination once, sorted", () =>
{
    const names = listKnownTaxonNames(siteData);

    assert.ok(names.includes("Tyrannosaurus"));
    assert.ok(names.includes("Tyrannosaurus rex"));
    assert.ok(names.includes("Tyrannosaurus bataar"), "Tarbosaurus bataar's original combination");
    assert.deepEqual(names, [...new Set(names)], "each name once");
    assert.deepEqual(names, [...names].sort((first, second) => first.localeCompare(second, "en")));

    for (const genus of siteData.genera)
    {
        for (const synonym of genus.record.synonyms ?? [])
        {
            assert.ok(names.includes(synonym.name), synonym.name);
        }
    }
});

test("the known clades hold every clade with a record, once, sorted, and no genera", () =>
{
    const names = listKnownCladeNames(siteData);
    let recordCount = 0;

    for (const clade of siteData.clades)
    {
        if (clade.record)
        {
            recordCount++;
        }
    }

    assert.equal(names.length, recordCount);
    assert.ok(names.includes("Tyrannosauridae"));
    assert.ok(!names.includes("Tyrannosaurus"));
    assert.deepEqual(names, [...new Set(names)], "each name once");
    assert.deepEqual(names, [...names].sort((first, second) => first.localeCompare(second, "en")));
});
