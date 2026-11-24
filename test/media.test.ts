import * as assert from "node:assert/strict";
import { test } from "node:test";

import { mediaSchemaVersion } from "../src/data/bindings/schema-version.ts";
import { parseSemanticVersion } from "../src/data/load-dataset.ts";
import { findCladeOutline, findGenusOutline, formatOutlineChanges, getLicenseInfo, readMedia } from "../src/data/media.ts";
import { createSiteData } from "../src/data/site-data.ts";
import { fixtureDirectory, readFixture, readMediaFixture } from "./fixture.ts";

const siteData = createSiteData(readFixture());
const media = readMediaFixture(siteData);

test("a genus shows its own outline", () =>
{
    const allosaurus = siteData.genusByName.get("Allosaurus");

    assert.ok(allosaurus);
    assert.equal(findGenusOutline(media, allosaurus)?.taxon, "Allosaurus");
});

test("a genus without an outline of its own shows none, not a clade's", () =>
{
    const tyrannosaurus = siteData.genusByName.get("Tyrannosaurus");

    assert.ok(tyrannosaurus);
    assert.ok(media.outlineByTaxon.has("Tyrannosauroidea"), "a clade above it has an outline");
    assert.equal(findGenusOutline(media, tyrannosaurus), undefined);
});

test("outlines are inline SVG in the page's color", () =>
{
    for (const genus of siteData.genera)
    {
        const outline = findGenusOutline(media, genus);

        if (outline)
        {
            assert.match(outline.svg, /^<svg\b[^>]*fill="currentColor"/);
        }
    }
});

test("licenses have a short name and the address of their terms", () =>
{
    assert.deepEqual(getLicenseInfo("CC-BY-3.0"), { name: "CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/" });
    assert.equal(getLicenseInfo("CC0-1.0").name, "CC0");
});

test("readMedia refuses a different major schema version", () =>
{
    const nextMajor = (parseSemanticVersion(mediaSchemaVersion).major + 1) + ".0.0";

    assert.throws(() => readMedia(fixtureDirectory, nextMajor), /breaking change/);
});

test("a clade shows its own outline, else its type genus's own, else none", () =>
{
    const sauropoda = siteData.cladeByName.get("Sauropoda");
    const allosauridae = siteData.cladeByName.get("Allosauridae");
    const avetheropoda = siteData.cladeByName.get("Avetheropoda");
    const tyrannosauridae = siteData.cladeByName.get("Tyrannosauridae");

    assert.ok(sauropoda && allosauridae && avetheropoda && tyrannosauridae);
    assert.equal(findCladeOutline(media, sauropoda)?.taxon, "Sauropoda");
    assert.equal(findCladeOutline(media, allosauridae)?.taxon, "Allosaurus", "its type genus's own outline");
    assert.equal(findCladeOutline(media, avetheropoda), undefined, "no outline and no type genus");
    assert.equal(findCladeOutline(media, tyrannosauridae), undefined, "its type genus has no outline of its own");
});

test("formatOutlineChanges lists the changes in a sentence", () =>
{
    assert.equal(formatOutlineChanges("Recolored"), "recolored");
    assert.equal(formatOutlineChanges("Recolored; flipped horizontally"), "recolored and flipped horizontally");
    assert.equal(formatOutlineChanges("Traced and rest of the figure removed; filled; recolored"), "traced and rest of the figure removed, filled and recolored");
    assert.equal(formatOutlineChanges(""), "");
});
