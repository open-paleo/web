import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { readDataset } from "../src/data/load-dataset.ts";
import type { ProseSegment } from "../src/data/taxon-names.ts";
import { createTaxonNameIndex } from "../src/data/taxon-names.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.3.0");
const index = createTaxonNameIndex(dataset);

/**
 * List the italic runs in a split, for compact assertions.
 *
 * @param segments - The split prose.
 * @returns The text of each taxon run.
 */
function listTaxa(segments: Array<ProseSegment>): Array<string>
{
    const taxa = new Array<string>();

    for (const segment of segments)
    {
        if (segment.isTaxon)
        {
            taxa.push(segment.text);
        }
    }

    return taxa;
}

/**
 * Join the text of every run.
 *
 * @param segments - The split prose.
 * @returns The original prose.
 */
function joinSegments(segments: Array<ProseSegment>): string
{
    let text = "";

    for (const segment of segments)
    {
        text += segment.text;
    }

    return text;
}

test("a genus name followed by its species epithet is one name", () =>
{
    assert.deepEqual(listTaxa(index.splitProse("The type species Tyrannosaurus rex is well known.")), ["Tyrannosaurus rex"]);
});

test("a genus name followed by an ordinary word is just the genus", () =>
{
    assert.deepEqual(listTaxa(index.splitProse("Tyrannosaurus is a genus of theropod.")), ["Tyrannosaurus"]);
});

test("abbreviated binomials match known species", () =>
{
    assert.deepEqual(listTaxa(index.splitProse("often shortened to T. rex, it")), ["T. rex"]);
    assert.deepEqual(listTaxa(index.splitProse("not to be confused with Q. rex")), []);
});

test("synonyms are matched as names", () =>
{
    assert.deepEqual(
        listTaxa(index.splitProse("Osborn named Dynamosaurus imperiosus in the same paper.")),
        ["Dynamosaurus imperiosus"],
    );
});

test("clade names and other capitalized words stay roman", () =>
{
    assert.deepEqual(listTaxa(index.splitProse("Tyrannosauridae lived in Laramidia and Asia.")), []);
});

test("names are matched as whole words only", () =>
{
    assert.deepEqual(listTaxa(index.splitProse("Tyrannosaurusia and Martínez are not names.")), []);
});

test("a name next to punctuation still matches", () =>
{
    assert.deepEqual(listTaxa(index.splitProse("(Tarbosaurus), and Tyrannosaurus's teeth")), ["Tarbosaurus", "Tyrannosaurus"]);
});

test("splitting loses no text", () =>
{
    const text = dataset.genera.Tyrannosaurus.description;

    assert.equal(joinSegments(index.splitProse(text)), text);
});

test("plain prose is one plain run", () =>
{
    assert.deepEqual(index.splitProse("no names here"), [{ text: "no names here", isTaxon: false }]);
    assert.deepEqual(index.splitProse(""), []);
});

test("a short genus name after a capitalized word is read as part of a personal name", () =>
{
    // Jian and Mei are real genera, but "Liu Jian" in the Tonganosaurus record is a person.
    const shortNames = createTaxonNameIndex(dataset);

    shortNames.addName("Jian");
    shortNames.addName("Mei");
    assert.deepEqual(listTaxa(shortNames.splitProse("first named by Li Kui, Yang Chun-Yan, Liu Jian, and Wang")), []);
    assert.deepEqual(listTaxa(shortNames.splitProse("with Sinovenator and Mei (Turner and colleagues)")), ["Mei"]);
    assert.deepEqual(listTaxa(shortNames.splitProse("Jian is a genus.")), ["Jian"]);
});
