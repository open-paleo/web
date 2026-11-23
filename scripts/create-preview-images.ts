/**
 * Draw each genus's link preview image. The build writes each image as a page at
 * dist/preview/genus/{slug}/ (src/pages/preview/genus/[slug].astro); this draws the page in
 * Chromium as dist/preview/genus/{slug}.png, the image genus pages name for link previews, and
 * then removes the page, which nothing links to.
 *
 * Run after `npm run build`, before `npm run check-site`, which checks that every preview image
 * a page names exists:
 *
 *     npm run create-preview-images
 *
 * Exits with status 1 when an image can't be drawn. Set SITE_BASE as for the build when the site
 * is served under a path. Needs Chromium: `npx playwright install --only-shell chromium`.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { availableParallelism } from "node:os";
import * as url from "node:url";

import type { Browser } from "playwright";
import { chromium } from "playwright";

import { previewImageHeight, previewImageWidth } from "../src/data/preview-image.ts";
import { startStaticServer } from "./site-checks/static-server.ts";

const rootDirectory = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const siteDirectory = path.join(rootDirectory, "dist");
const previewDirectory = path.join(siteDirectory, "preview", "genus");

// How many images are drawn at once: the CI runners have four cores.
const drawConcurrency = Math.min(4, availableParallelism());

/**
 * Read the base path the site was built for, as the build does.
 *
 * @returns The base path, starting and ending in "/".
 */
function getBasePath(): string
{
    const base = process.env.SITE_BASE ?? "/";
    const withLeadingSlash = base.startsWith("/") ? base : "/" + base;

    return withLeadingSlash.endsWith("/") ? withLeadingSlash : withLeadingSlash + "/";
}

/**
 * List the genus slugs that have an image page in the built site.
 *
 * @returns The slugs, in name order.
 */
function listPreviewSlugs(): Array<string>
{
    const slugs = new Array<string>();

    if (!fs.existsSync(previewDirectory))
    {
        return slugs;
    }

    for (const entry of fs.readdirSync(previewDirectory, { withFileTypes: true }))
    {
        if (entry.isDirectory() && fs.existsSync(path.join(previewDirectory, entry.name, "index.html")))
        {
            slugs.push(entry.name);
        }
    }

    return slugs.sort();
}

/**
 * Draw images from a shared queue of slugs until it is empty, then close the browser page.
 *
 * @param browser - The browser.
 * @param siteUrl - The local site's address, ending in the base path.
 * @param queue - The slugs still to draw; each worker takes from the end.
 * @param failures - The list to add slugs that failed to.
 */
async function drawQueuedImages(browser: Browser, siteUrl: string, queue: Array<string>, failures: Array<string>): Promise<void>
{
    const page = await browser.newPage({ viewport: { width: previewImageWidth, height: previewImageHeight } });

    for (let slug = queue.pop(); slug !== undefined; slug = queue.pop())
    {
        try
        {
            await page.goto(siteUrl + "preview/genus/" + slug + "/", { waitUntil: "load" });
            await page.evaluate(async () => await document.fonts.ready);
            await page.screenshot({ path: path.join(previewDirectory, slug + ".png") });
            fs.rmSync(path.join(previewDirectory, slug), { recursive: true });
        }
        catch (error)
        {
            failures.push(slug + ": " + (error instanceof Error ? error.message : String(error)));
        }
    }

    await page.close();
}

/**
 * Draw every genus's preview image and remove its page.
 */
async function createPreviewImages(): Promise<void>
{
    const slugs = listPreviewSlugs();

    if (slugs.length === 0)
    {
        console.error("No image pages in " + previewDirectory + "; run npm run build first.");
        process.exit(1);
    }

    const startTime = performance.now();
    const site = await startStaticServer(siteDirectory, getBasePath());
    const browser = await chromium.launch();
    const queue = [...slugs];
    const failures = new Array<string>();
    const workers = new Array<Promise<void>>();

    for (let index = 0; index < drawConcurrency; index++)
    {
        workers.push(drawQueuedImages(browser, site.url, queue, failures));
    }

    await Promise.all(workers);
    await browser.close();
    site.server.close();

    let totalBytes = 0;

    for (const slug of slugs)
    {
        const imagePath = path.join(previewDirectory, slug + ".png");

        if (fs.existsSync(imagePath))
        {
            totalBytes += fs.statSync(imagePath).size;
        }
    }

    const seconds = ((performance.now() - startTime) / 1000).toFixed(1);

    console.log("Preview images: " + (slugs.length - failures.length) + " of " + slugs.length + " drawn in " + seconds + " s, " + (totalBytes / 1024 / 1024).toFixed(1) + " MB");

    if (failures.length > 0)
    {
        for (const failure of failures)
        {
            console.error("  " + failure);
        }

        process.exit(1);
    }
}

await createPreviewImages();
