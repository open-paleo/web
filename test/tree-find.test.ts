import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createSiteData } from "../src/data/site-data.ts";
import { createTreeFindNames } from "../src/data/tree-find.ts";
import { readFixture } from "./fixture.ts";

const siteData = createSiteData(readFixture());
const top = siteData.cladeByName.get("Dinosauria");

test("the find list holds every clade from Dinosauria down and every genus placed in one", () =>
{
    assert.ok(top);

    const names = createTreeFindNames(top, siteData);
    const cladeCount = names.filter((name) => name.kind === "clade").length;
    const genusCount = names.filter((name) => name.kind === "genus").length;
    let recordCount = 0;

    for (const clade of siteData.clades)
    {
        if (clade.record)
        {
            recordCount++;
        }
    }

    assert.equal(names[0].name, "Dinosauria");
    assert.equal(cladeCount, recordCount);
    assert.equal(genusCount, siteData.genera.length);
});

test("a genus reveals the clade it is placed in, and a clade reveals itself", () =>
{
    assert.ok(top);

    const names = createTreeFindNames(top, siteData);
    const tyrannosaurus = names.find((name) => name.name === "Tyrannosaurus");
    const placement = siteData.clades.find((clade) => clade.genusNames.includes("Tyrannosaurus"));
    const dinosauria = names[0];

    assert.ok(tyrannosaurus && placement);
    assert.equal(tyrannosaurus.kind, "genus");
    assert.equal(tyrannosaurus.cladeSlug, placement.slug);
    assert.equal(tyrannosaurus.cladeName, placement.name);
    assert.equal(dinosauria.cladeSlug, siteData.cladeByName.get("Dinosauria")?.slug);
});
