import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import {
    createLetterAnchor,
    formatFileSize,
    getGenusIndexName,
    getIndexLetter,
    getReferenceIndexName,
    groupByLetter,
    listDatasetFiles,
} from "../src/data/indexes.ts";
import { readDataset } from "../src/data/load-dataset.ts";
import { createSiteData } from "../src/data/site-data.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const fixtureDirectory = path.join(testDirectory, "fixtures");
const siteData = createSiteData(readDataset(fixtureDirectory, "3.3.0"));

test("getIndexLetter files names under their first letter without accents", () =>
{
    assert.equal(getIndexLetter("Tyrannosaurus"), "T");
    assert.equal(getIndexLetter("Ősi"), "O");
    assert.equal(getIndexLetter("d'Emic"), "D");
    assert.equal(getIndexLetter("Łowiak"), "L");
    assert.equal(getIndexLetter("2024 survey"), "#");
});

test("groupByLetter keeps the given order within and across letters", () =>
{
    const groups = groupByLetter(siteData.genera, getGenusIndexName);
    const letters = new Array<string>();

    for (const group of groups)
    {
        letters.push(group.letter);
    }

    const names = new Array<string>();

    for (const group of groups)
    {
        for (const entry of group.entries)
        {
            assert.equal(getIndexLetter(entry.name), group.letter);
            names.push(entry.name);
        }
    }

    assert.deepEqual(letters, [...new Set(letters)].sort(), "each letter once, in order");
    assert.deepEqual(names, siteData.genera.map((genus) => genus.name), "the given order is kept");
});

test("references are indexed under the first author's surname", () =>
{
    const reference = siteData.referenceById.get("osborn1905a");

    assert.ok(reference);
    assert.equal(getReferenceIndexName(reference), "Osborn");
});

test("listDatasetFiles reports sizes for files that exist and none for those that do not", () =>
{
    const files = listDatasetFiles(fixtureDirectory);

    assert.equal(files[0].name, "open-paleo.json");
    assert.ok((files[0].sizeBytes ?? 0) > 0);
    assert.equal(files[1].name, "open-paleo.yml");
    assert.equal(files[1].sizeBytes, undefined);
});

test("formatFileSize picks a readable unit", () =>
{
    assert.equal(formatFileSize(10_154_726), "10.2 MB");
    assert.equal(formatFileSize(3_039), "3.0 kB");
    assert.equal(formatFileSize(512), "512 bytes");
});

test("createLetterAnchor gives every letter group a valid id", () =>
{
    assert.equal(createLetterAnchor("T"), "letter-t");
    assert.equal(createLetterAnchor("#"), "letter-other");
});
