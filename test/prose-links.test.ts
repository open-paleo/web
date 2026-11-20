import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createGeologicTimeline } from "../src/data/age-figure.ts";
import type { NameSegment } from "../src/data/prose-links.ts";
import { createProseLinkIndex, findTaxonPath, splitNamedLinks } from "../src/data/prose-links.ts";
import { createSiteData } from "../src/data/site-data.ts";
import { createTimePages } from "../src/data/time-pages.ts";
import { createUnitIndex } from "../src/data/units.ts";
import { readFixture } from "./fixture.ts";

const dataset = readFixture();
const siteData = createSiteData(dataset);

assert.ok(dataset.timescale, "the fixture should carry the timescale");

const links = createProseLinkIndex(dataset, siteData, createUnitIndex(dataset, siteData), createTimePages(siteData, createGeologicTimeline(dataset.timescale)));

/**
 * Get the paths a split links to, in order.
 *
 * @param segments - The split text.
 * @returns The paths.
 */
function getPaths(segments: Array<NameSegment>): Array<string>
{
    const paths = new Array<string>();

    for (const segment of segments)
    {
        if (segment.path)
        {
            paths.push(segment.path);
        }
    }

    return paths;
}

test("genera, species, synonyms and abbreviated names lead to the genus page or the species' section", () =>
{
    assert.equal(findTaxonPath(links, "Tyrannosaurus"), "genus/tyrannosaurus/");
    assert.equal(findTaxonPath(links, "Tyrannosaurus rex"), "genus/tyrannosaurus/#tyrannosaurus-rex");
    assert.equal(findTaxonPath(links, "T. rex"), "genus/tyrannosaurus/#tyrannosaurus-rex");
    assert.equal(findTaxonPath(links, "Dynamosaurus imperiosus"), "genus/tyrannosaurus/#tyrannosaurus-rex");
    assert.equal(findTaxonPath(links, "Clevelanotyrannus"), "genus/nanotyrannus/");
    assert.equal(findTaxonPath(links, "Velociraptor"), undefined);
});

test("clades, rock units, stages, epochs and periods link to their pages, each once per block", () =>
{
    const text = "A tyrannosaurid of Tyrannosauridae from the Hell Creek formation (late Maastrichtian, Late Cretaceous); like other Tyrannosauridae, Cretaceous.";
    const paths = getPaths(splitNamedLinks(links, text, new Set(), "genus/tyrannosaurus/"));

    assert.deepEqual(paths, ["clade/tyrannosauridae/", "unit/hell-creek/", "stage/maastrichtian/", "time/#late-cretaceous", "period/cretaceous/"]);
});

test("a name on its own page, or inside a longer word, stays plain, and the text is kept whole", () =>
{
    const text = "Tyrannosauridae-like, and Tyrannosauridae.";
    const segments = splitNamedLinks(links, text, new Set(), "clade/tyrannosauridae/");
    let joined = "";

    for (const segment of segments)
    {
        joined += segment.text;
    }

    assert.deepEqual(getPaths(segments), []);
    assert.equal(joined, text);
});

test("a name that stays plain is still a run of its own, so no glossary term is looked for in it", () =>
{
    const text = "The Hell Creek Formation lies below the Hell Creek Formation's top.";
    const segments = splitNamedLinks(links, text, new Set(), "unit/hell-creek/");
    const names = new Array<string>();

    for (const segment of segments)
    {
        if (segment.isName)
        {
            names.push(segment.text);
        }
    }

    assert.deepEqual(getPaths(segments), []);
    assert.deepEqual(names, ["Hell Creek Formation", "Hell Creek Formation"]);
});
