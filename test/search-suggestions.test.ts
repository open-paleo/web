import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { readDataset } from "../src/data/load-dataset.ts";
import { createSearchSuggestions } from "../src/data/search-suggestions.ts";
import { createSiteData } from "../src/data/site-data.ts";
import { findSuggestions, foldText, prepareSuggestions, scoreName } from "../src/data/suggestion-matching.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const siteData = createSiteData(readDataset(path.join(testDirectory, "fixtures"), "3.4.0"));
const suggestions = createSearchSuggestions(siteData);
const prepared = prepareSuggestions(suggestions);

/**
 * List the names of the suggestions for a query.
 *
 * @param query - What the reader typed.
 * @returns The suggested names, best first.
 */
function suggestNames(query: string): Array<string>
{
    const names = new Array<string>();

    for (const suggestion of findSuggestions(query, prepared, 8))
    {
        names.push(suggestion.name);
    }

    return names;
}

test("suggestions cover genera, species, clades and synonyms, each with its page", () =>
{
    const tyrannosaurus = suggestions.find((suggestion) => suggestion.name === "Tyrannosaurus");
    const rex = suggestions.find((suggestion) => suggestion.name === "Tyrannosaurus rex");
    const clade = suggestions.find((suggestion) => suggestion.name === "Tyrannosauridae");

    assert.equal(tyrannosaurus?.path, "genus/tyrannosaurus/");
    assert.equal(tyrannosaurus?.authority, "Osborn, 1905");
    assert.equal(rex?.path, "genus/tyrannosaurus/#tyrannosaurus-rex");
    assert.equal(clade?.kind, "clade");

    for (const suggestion of suggestions)
    {
        if (suggestion.kind.endsWith("synonym"))
        {
            assert.notEqual(suggestion.synonymOf, "", suggestion.name);
        }
    }
});

test("matching ignores case and accents", () =>
{
    assert.equal(foldText("Pérez"), "perez");
    assert.equal(scoreName(foldText("Tyrannosaurus"), foldText("TYRANNO")), 3);
});

test("a whole name beats its start, which beats a later word, which beats the middle", () =>
{
    assert.ok(scoreName("allosaurus", "allosaurus") > scoreName("allosaurus fragilis", "allosaurus"));
    assert.ok(scoreName("allosaurus fragilis", "allo") > scoreName("allosaurus fragilis", "fragi"));
    assert.ok(scoreName("allosaurus fragilis", "fragi") > scoreName("allosaurus fragilis", "losau"));
    assert.equal(scoreName("allosaurus", "raptor"), 0);
});

test("the genus comes before its species and its synonyms", () =>
{
    const names = suggestNames("tyrannosaurus");

    assert.equal(names[0], "Tyrannosaurus");
    assert.ok(names.indexOf("Tyrannosaurus rex") > 0);
});

test("an epithet finds its species", () =>
{
    assert.ok(suggestNames("rex").includes("Tyrannosaurus rex"));
});

test("nothing is suggested for fewer than two characters", () =>
{
    assert.deepEqual(suggestNames("t"), []);
    assert.deepEqual(suggestNames(" "), []);
});
