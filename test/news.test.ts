import * as assert from "node:assert/strict";
import { test } from "node:test";

import { writeAtomFeed } from "../src/data/feed.ts";
import type { NewsPost } from "../src/data/news.ts";
import {
    createNewsFeed,
    createNewsIndex,
    findFirstParagraph,
    findNewsSlugProblem,
    formatNewsDate,
    formatNewsDateValue,
    getNewsSummary,
    getPlainText,
    resolveSitePaths,
    sortNewsPosts,
} from "../src/data/news.ts";

// News posts are the site's own writing, not dataset records, so these tests write their own.

/**
 * Create a post for the tests.
 *
 * @param slug - Its file name.
 * @param date - Its date, as front matter writes it.
 * @param summary - Its front matter summary, or an empty string.
 * @returns The post.
 */
function createPost(slug: string, date: string, summary: string): NewsPost
{
    return {
        slug,
        title: "Post " + slug,
        date: new Date(date),
        author: "Open Paleo contributors",
        summary,
        html: "<h2>Heading</h2>\n<p>First of <a href=\"/genus/tyrannosaurus/\">" + slug + "</a> &amp; more.</p>\n<p>Second.</p>",
    };
}

test("posts sort newest first, and by title on the same day", () =>
{
    const sorted = sortNewsPosts([createPost("b", "2026-11-20", ""), createPost("c", "2026-11-24", ""), createPost("a", "2026-11-20", "")]);
    const slugs = new Array<string>();

    for (const post of sorted)
    {
        slugs.push(post.slug);
    }

    assert.deepEqual(slugs, ["c", "a", "b"]);
});

test("a post's summary is its front matter's, or else its first paragraph as text", () =>
{
    const post = createPost("first", "2026-11-24", "");

    assert.equal(findFirstParagraph(post.html), "<p>First of <a href=\"/genus/tyrannosaurus/\">first</a> &amp; more.</p>");
    assert.equal(findFirstParagraph("<h2>Only a heading</h2>"), "");
    assert.equal(getPlainText("<p>A &lt;b&gt;\n  &quot;c&quot; &#39;d&#39; &amp; e</p>"), "A <b> \"c\" 'd' & e");
    assert.equal(getNewsSummary(post), "First of first & more.");
    assert.equal(getNewsSummary(createPost("second", "2026-11-24", "Written out.")), "Written out.");
});

test("dates read as the day the front matter writes, in any time zone", () =>
{
    const date = new Date("2026-11-24");

    assert.equal(formatNewsDate(date), "November 24, 2026");
    assert.equal(formatNewsDateValue(date), "2026-11-24");
});

test("root paths go below the site's base, and other addresses stay as written", () =>
{
    const html = "<a href=\"/genus/tyrannosaurus/\">a</a><iframe src=\"/embed/genus/tyrannosaurus/\"></iframe><a href=\"//example.org/\">b</a><a href=\"https://example.org/\">c</a><a href=\"#notes\">d</a>";

    assert.equal(resolveSitePaths(html, "/"), html);
    assert.equal(
        resolveSitePaths(html, "/web/"),
        "<a href=\"/web/genus/tyrannosaurus/\">a</a><iframe src=\"/web/embed/genus/tyrannosaurus/\"></iframe><a href=\"//example.org/\">b</a><a href=\"https://example.org/\">c</a><a href=\"#notes\">d</a>",
    );
});

test("a post named with a number would take a list page's address", () =>
{
    assert.notEqual(findNewsSlugProblem("2"), "");
    assert.equal(findNewsSlugProblem("release-1-0"), "");
});

test("the find field's list and the feed cover posts newest first", () =>
{
    const posts = sortNewsPosts([createPost("older", "2026-11-20", ""), createPost("newer", "2026-11-24", "")]);
    const index = createNewsIndex(posts);
    const feed = createNewsFeed(posts, "https://open-paleo.org/", 1, "Open Paleo contributors", "2026-11-01T00:00:00Z");
    const xml = writeAtomFeed(feed);

    assert.deepEqual(index[0], { title: "Post newer", path: "news/newer/", date: "November 24, 2026", summary: "First of newer & more." });
    assert.equal(index.length, 2);
    assert.equal(feed.feedUrl, "https://open-paleo.org/news.xml");
    assert.equal(feed.siteUrl, "https://open-paleo.org/news/");
    assert.equal(feed.updated, "2026-11-24T00:00:00.000Z");
    assert.equal(feed.entries.length, 1);
    assert.equal(feed.entries[0].url, "https://open-paleo.org/news/newer/");
    assert.equal(xml.split("<entry>").length - 1, 1);
    assert.ok(xml.includes("    <author><name>Open Paleo contributors</name></author>\n    <summary>"));
    assert.equal(createNewsFeed([], "https://open-paleo.org/", 1, "Open Paleo contributors", "2026-11-01T00:00:00Z").updated, "2026-11-01T00:00:00Z");
});
