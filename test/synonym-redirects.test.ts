import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createSiteData } from "../src/data/site-data.ts";
import { createCladeSynonymRedirects, createGenusSynonymRedirects, createRedirectUrl, findRedirectSources } from "../src/data/synonym-redirects.ts";
import { findLowercasePath } from "../src/data/urls.ts";
import { readFixture } from "./fixture.ts";

const siteData = createSiteData(readFixture());

test("each genus synonym gets a page at its slug that leads to its genus", () =>
{
    const redirects = createGenusSynonymRedirects(siteData);
    const antrodemus = redirects.find((redirect) => redirect.name === "Antrodemus");
    const genusSlugs = new Set<string>();

    for (const genus of siteData.genera)
    {
        genusSlugs.add(genus.slug);
    }

    assert.deepEqual(antrodemus, { slug: "antrodemus", name: "Antrodemus", kind: "genus", targets: [{ name: "Allosaurus", path: "genus/allosaurus/" }] });

    for (const redirect of redirects)
    {
        assert.ok(!genusSlugs.has(redirect.slug), redirect.slug + " is a genus page's address");
    }
});

test("clade synonyms lead to clades with pages", () =>
{
    for (const redirect of createCladeSynonymRedirects(siteData))
    {
        assert.equal(redirect.kind, "clade");
        assert.ok(redirect.targets.length > 0);
        assert.ok(redirect.targets[0].path.startsWith("clade/"));
    }
});

test("a genus page finds the synonyms that redirect to it, and the redirect names the synonym", () =>
{
    const redirects = createGenusSynonymRedirects(siteData);
    const sources = findRedirectSources(redirects, "genus/allosaurus/");
    const names = new Array<string>();

    for (const source of sources)
    {
        names.push(source.name);
    }

    assert.deepEqual(names, ["Antrodemus", "Wyomingraptor", "Labrosaurus", "Creosaurus", "Madsenius"]);
    assert.deepEqual(findRedirectSources(redirects, "genus/tyrannosaurus/"), []);

    const antrodemus = redirects.find((redirect) => redirect.name === "Antrodemus");

    assert.ok(antrodemus);
    assert.equal(createRedirectUrl("/", antrodemus), "/genus/allosaurus/?from=antrodemus");
    assert.equal(createRedirectUrl("/web/", antrodemus), "/web/genus/allosaurus/?from=antrodemus");
});

test("an address in capitals is lowercased below the site's base only", () =>
{
    assert.equal(findLowercasePath("/genus/Aardonyx/", "/"), "/genus/aardonyx/");
    assert.equal(findLowercasePath("/genus/aardonyx/", "/"), "");
    assert.equal(findLowercasePath("/Web/genus/Aardonyx/", "/Web/"), "/Web/genus/aardonyx/");
    assert.equal(findLowercasePath("/other/Page/", "/web/"), "");
});
