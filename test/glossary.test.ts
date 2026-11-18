import * as assert from "node:assert/strict";
import { test } from "node:test";

import { glossarySchemaVersion } from "../src/data/bindings/schema-version.ts";
import type { TermSegment } from "../src/data/glossary.ts";
import { findGlossaryEntry, readGlossary, splitGlossaryTerms } from "../src/data/glossary.ts";
import { parseSemanticVersion } from "../src/data/load-dataset.ts";
import { fixtureDirectory, readGlossaryFixture } from "./fixture.ts";

const glossary = readGlossaryFixture();

/**
 * Get the ids of the terms a split links, in order.
 *
 * @param segments - The split text.
 * @returns The ids.
 */
function getLinkedIds(segments: Array<TermSegment>): Array<string>
{
    const ids = new Array<string>();

    for (const segment of segments)
    {
        if (segment.entry)
        {
            ids.push(segment.entry.id);
        }
    }

    return ids;
}

/**
 * Join a split back into text.
 *
 * @param segments - The split text.
 * @returns The text.
 */
function joinSegments(segments: Array<TermSegment>): string
{
    let text = "";

    for (const segment of segments)
    {
        text += segment.text;
    }

    return text;
}

test("a term is linked once per block, as written, and the text is kept whole", () =>
{
    const text = "Anterior caudals opisthocoelous, anterior dorsals amphicoelous.";
    const segments = splitGlossaryTerms(glossary, text, new Set());

    assert.deepEqual(getLinkedIds(segments), ["anterior", "opisthocoelous", "amphicoelous"]);
    assert.equal(segments[0].text, "Anterior");
    assert.equal(joinSegments(segments), text);
});

test("blocks that share a set of linked terms link each term once between them", () =>
{
    const linked = new Set<string>();

    assert.deepEqual(getLinkedIds(splitGlossaryTerms(glossary, "anterior caudals", linked)), ["anterior"]);
    assert.deepEqual(getLinkedIds(splitGlossaryTerms(glossary, "anterior dorsals", linked)), []);
});

test("a form inside a longer or hyphenated word is not linked", () =>
{
    const segments = splitGlossaryTerms(glossary, "opisthocoelousness, non-anterior, anterior-most", new Set());

    assert.deepEqual(getLinkedIds(segments), []);
});

test("a form of several words matches across any white space, and other forms link to the term", () =>
{
    assert.deepEqual(getLinkedIds(splitGlossaryTerms(glossary, "a nomen\n  dubium", new Set())), ["nomen-dubium"]);
    assert.deepEqual(getLinkedIds(splitGlossaryTerms(glossary, "both nomina dubia", new Set())), ["nomen-dubium"]);
    assert.deepEqual(getLinkedIds(splitGlossaryTerms(glossary, "placed more anteriorly", new Set())), ["anterior"]);
});

test("a whole value such as a status finds its term regardless of case", () =>
{
    assert.equal(findGlossaryEntry(glossary, "Nomen dubium")?.id, "nomen-dubium");
    assert.equal(findGlossaryEntry(glossary, "incertae sedis")?.id, "incertae-sedis");
    assert.equal(findGlossaryEntry(glossary, "valid"), undefined);
});

test("the glossary page's look-ups name each term's category and resolve related terms", () =>
{
    const entry = glossary.entryById.get("opisthocoelous");

    assert.ok(entry);
    assert.equal(entry.categoryName, "Backbone");

    for (const related of entry.record.see_also ?? [])
    {
        assert.ok(glossary.entryById.has(related), related);
    }
});

test("readGlossary refuses a different major schema version", () =>
{
    const nextMajor = (parseSemanticVersion(glossarySchemaVersion).major + 1) + ".0.0";

    assert.throws(() => readGlossary(fixtureDirectory, nextMajor), /breaking change/);
});
