import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { createGenusFeed, escapeXml, listNewestGenera, writeAtomFeed } from "../src/data/feed.ts";
import { readDataset } from "../src/data/load-dataset.ts";
import { createSiteData } from "../src/data/site-data.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const siteData = createSiteData(readDataset(path.join(testDirectory, "fixtures"), "3.4.0"));

test("the newest genera come first, by year named and then by name", () =>
{
    const genera = listNewestGenera(siteData, siteData.genera.length);

    for (let index = 1; index < genera.length; index++)
    {
        const previous = genera[index - 1].record.described ?? 0;
        const current = genera[index].record.described ?? 0;

        assert.ok(previous > current || (previous === current && genera[index - 1].name.localeCompare(genera[index].name, "en") < 0));
    }

    assert.equal(listNewestGenera(siteData, 3).length, 3);
});

test("feed entries link to genus pages under the site's address", () =>
{
    const feed = createGenusFeed(siteData, "https://open-paleo.org/", 50);
    const tyrannosaurus = feed.entries.find((entry) => entry.title === "Tyrannosaurus");

    assert.equal(feed.feedUrl, "https://open-paleo.org/feed.xml");
    assert.equal(tyrannosaurus?.url, "https://open-paleo.org/genus/tyrannosaurus/");
    assert.ok(tyrannosaurus?.summary.startsWith("Osborn, 1905. "));
    assert.equal(feed.updated, siteData.metadata.built_at);
});

test("the Atom document escapes text and holds one entry per genus", () =>
{
    const feed = createGenusFeed(siteData, "https://open-paleo.org/", 2);
    const xml = writeAtomFeed(feed);

    assert.equal(escapeXml("A & B <\"c\">"), "A &amp; B &lt;&quot;c&quot;&gt;");
    assert.ok(xml.startsWith("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<feed xmlns=\"http://www.w3.org/2005/Atom\">"));
    assert.equal(xml.split("<entry>").length - 1, 2);
});
