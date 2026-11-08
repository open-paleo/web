import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { SitePage } from "../scripts/site-checks/links.ts";
import { checkLinks, getServedFile, parseSitePage } from "../scripts/site-checks/links.ts";

/**
 * Report that no file other than a page exists.
 *
 * @returns Always false.
 */
function findNoFile(): boolean
{
    return false;
}

test("parseSitePage keeps internal links and ids, and decodes &amp;", () =>
{
    const page = parseSitePage(
        "<a href=\"/genus/allosaurus/\">A</a> <a href=\"https://example.org/\">B</a> "
        + "<a href=\"#species\">C</a> <a href=\"/search/?q=a&amp;kind=genus\">D</a> <h2 id=\"species\">S</h2>",
    );

    assert.deepEqual(page.links, ["/genus/allosaurus/", "#species", "/search/?q=a&kind=genus"]);
    assert.deepEqual([...page.ids], ["species"]);
});

test("getServedFile maps directory paths to index.html under the base path", () =>
{
    assert.equal(getServedFile("/", "/"), "index.html");
    assert.equal(getServedFile("/genus/allosaurus/", "/"), "genus/allosaurus/index.html");
    assert.equal(getServedFile("/web/genus/allosaurus/", "/web/"), "genus/allosaurus/index.html");
    assert.equal(getServedFile("/robots.txt", "/"), "robots.txt");
    assert.equal(getServedFile("/genus/allosaurus/", "/web/"), undefined);
});

test("checkLinks reports missing pages and missing fragments, and passes the rest", () =>
{
    const pages = new Map<string, SitePage>([
        ["index.html", parseSitePage("<a href=\"/genus/allosaurus/#species\">ok</a> <a href=\"/genus/missing/\">bad</a>")],
        ["genus/allosaurus/index.html", parseSitePage("<h2 id=\"species\">S</h2> <a href=\"#nowhere\">bad</a> <a href=\"/?q=x\">ok</a>")],
    ]);
    const report = checkLinks(pages, findNoFile, "/");
    const broken = new Array<string>();

    for (const link of report.brokenLinks)
    {
        broken.push(link.page + " " + link.href);
    }

    assert.equal(report.linkCount, 4);
    assert.deepEqual(broken, ["index.html /genus/missing/", "genus/allosaurus/index.html #nowhere"]);
});
