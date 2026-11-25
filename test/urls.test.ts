import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createCorrectionUrl, createGenusEmbedPath, createHeadingAnchors, createPagePath } from "../src/data/urls.ts";

test("createPagePath puts a record's page under the base path", () =>
{
    assert.equal(createPagePath("/", "genus", "tyrannosaurus"), "/genus/tyrannosaurus/");
    assert.equal(createPagePath("/web", "stage", "bathonian"), "/web/stage/bathonian/");
});

test("createGenusEmbedPath puts a genus's infobox under embed/genus/", () =>
{
    assert.equal(createGenusEmbedPath("/", "tyrannosaurus"), "/embed/genus/tyrannosaurus/");
    assert.equal(createGenusEmbedPath("/web", "tyrannosaurus"), "/web/embed/genus/tyrannosaurus/");
});

test("createCorrectionUrl fills in the issue form's title, record and page", () =>
{
    const address = new URL(createCorrectionUrl("Genus", "Tyrannosaurus", "https://open-paleo.org/genus/tyrannosaurus/"));

    assert.equal(address.origin + address.pathname, "https://github.com/open-paleo/data/issues/new");
    assert.equal(address.searchParams.get("template"), "correction.yml");
    assert.equal(address.searchParams.get("title"), "Correction: Tyrannosaurus");
    assert.equal(address.searchParams.get("record"), "Genus: Tyrannosaurus");
    assert.equal(address.searchParams.get("page"), "https://open-paleo.org/genus/tyrannosaurus/");
});

test("createCorrectionUrl leaves out the page when it is not known", () =>
{
    assert.equal(new URL(createCorrectionUrl("Clade", "Nodosauridae", "")).searchParams.has("page"), false);
});

test("createHeadingAnchors numbers headings that read the same", () =>
{
    assert.deepEqual(
        createHeadingAnchors("specimen-", ["“Sue”", "Uncataloged specimen", "Uncataloged specimen", "MPC-D 100/54"]),
        ["specimen-sue", "specimen-uncataloged-specimen", "specimen-uncataloged-specimen-2", "specimen-mpc-d-100-54"],
    );
});
