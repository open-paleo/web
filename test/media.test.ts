import * as assert from "node:assert/strict";
import { test } from "node:test";

import { mediaSchemaVersion } from "../src/data/bindings/schema-version.ts";
import { parseSemanticVersion } from "../src/data/load-dataset.ts";
import { findGenusOutline, getLicenseInfo, readMedia } from "../src/data/media.ts";
import { createSiteData } from "../src/data/site-data.ts";
import { fixtureDirectory, readFixture, readMediaFixture } from "./fixture.ts";

const siteData = createSiteData(readFixture());
const media = readMediaFixture(siteData);

test("a genus shows the outline of the nearest clade above it that has one", () =>
{
    const tyrannosaurus = siteData.genusByName.get("Tyrannosaurus");
    const allosaurus = siteData.genusByName.get("Allosaurus");

    assert.ok(tyrannosaurus && allosaurus);
    assert.equal(findGenusOutline(media, tyrannosaurus, siteData)?.clade, "Tyrannosauroidea");
    assert.equal(findGenusOutline(media, allosaurus, siteData)?.clade, "Theropoda");
});

test("every genus in the fixture has an outline, and outlines are inline SVG in the page's color", () =>
{
    for (const genus of siteData.genera)
    {
        const outline = findGenusOutline(media, genus, siteData);

        assert.ok(outline, genus.name);
        assert.match(outline.svg, /^<svg\b[^>]*fill="currentColor"/);
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
