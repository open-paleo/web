import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

import { chromium } from "playwright";

import type { TimeUnit } from "../src/data/age-figure.ts";
import { createGeologicTimeline } from "../src/data/age-figure.ts";
import { loadDataset } from "../src/data/load-dataset.ts";
import { createSlug } from "../src/data/slugs.ts";

// Draws public/social-preview.png, the 1200 by 630 image link previews show for every page (Open
// Graph and Twitter cards): the site header's dark band with the wordmark and the site's
// one-line description, over the Triassic, Jurassic and Cretaceous in the geologic time scale's
// colors, each stage as wide as it lasted. It uses the site's own fonts and tokens, so it
// matches the theme. Rerun it after a change to the theme or the dataset's timescale.
//
//     npm run create-social-image

/**
 * One band of the time scale in the image.
 */
type TimeBand = {
    /**
     * The color token: "--stage-bathonian".
     */
    colorToken: string;

    /**
     * Width as a percentage of the whole scale.
     */
    widthPercent: number;
};

const periodNames = ["Triassic", "Jurassic", "Cretaceous"];
const scriptDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const rootDirectory = path.join(scriptDirectory, "..");
const themeDirectory = path.join(rootDirectory, "src", "theme");
const outputPath = path.join(rootDirectory, "public", "social-preview.png");
const pagePath = path.join(rootDirectory, "scratch", "social-preview.html");

/**
 * Lay out a row of time units as bands, each as wide as it lasted.
 *
 * @param units - The units, oldest first.
 * @param prefix - The color token prefix: "--stage-" or "--period-".
 * @returns The bands.
 */
function createBands(units: Array<TimeUnit>, prefix: string): Array<TimeBand>
{
    const span = units[0].fromMa - units[units.length - 1].toMa;
    const bands = new Array<TimeBand>();

    for (const unit of units)
    {
        bands.push({ colorToken: prefix + createSlug(unit.name), widthPercent: (unit.fromMa - unit.toMa) / span * 100 });
    }

    return bands;
}

/**
 * Write a row of bands as HTML.
 *
 * @param bands - The bands.
 * @param labels - Each band's label, or empty strings for none.
 * @returns The row's HTML.
 */
function writeBandRow(bands: Array<TimeBand>, labels: Array<string>): string
{
    let html = "";

    for (let index = 0; index < bands.length; index++)
    {
        html += "<span style=\"flex-basis: " + bands[index].widthPercent + "%; background: var(" + bands[index].colorToken + ")\">" + labels[index] + "</span>";
    }

    return html;
}

/**
 * Write the image's page: the band, the wordmark, the description and the time scale.
 *
 * @returns The HTML.
 */
function writeImagePage(): string
{
    const dataset = loadDataset();

    if (!dataset.timescale)
    {
        throw new Error("The dataset has no timescale.");
    }

    const timeline = createGeologicTimeline(dataset.timescale);
    const periods = new Array<TimeUnit>();
    const stages = new Array<TimeUnit>();

    for (const period of timeline.periods)
    {
        if (periodNames.includes(period.name))
        {
            periods.push(period);
        }
    }

    for (const epoch of timeline.epochs)
    {
        if (periodNames.includes(epoch.periodName))
        {
            stages.push(...epoch.stages);
        }
    }

    const stageLabels = new Array<string>(stages.length).fill("");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="${url.pathToFileURL(path.join(themeDirectory, "tokens.css")).href}">
<link rel="stylesheet" href="${url.pathToFileURL(path.join(themeDirectory, "fonts.css")).href}">
<style>
    *
    {
        box-sizing: border-box;
        margin: 0;
    }

    body
    {
        display: grid;
        grid-template-rows: 1fr auto;
        width: 1200px;
        height: 630px;
        padding: 72px 80px 64px;
        color: var(--color-header-ink);
        background: var(--color-header-background);
        font-family: var(--font-sans);
    }

    h1
    {
        font-family: var(--font-serif);
        font-size: 128px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.015em;
    }

    p
    {
        max-width: 820px;
        margin-top: 28px;
        color: var(--color-header-muted);
        font-size: 36px;
        line-height: 1.3;
    }

    .scale
    {
        display: grid;
        gap: 6px;
    }

    .row
    {
        display: flex;
        overflow: hidden;
        border-radius: 3px;
    }

    .row span
    {
        flex-grow: 0;
        flex-shrink: 0;
        box-shadow: inset 2px 0 0 var(--color-header-background);
    }

    .periods span
    {
        padding: 10px 14px;
        color: var(--color-on-period);
        font-size: 26px;
        font-weight: 500;
    }

    .periods span:first-child
    {
        color: var(--color-on-period-dark);
    }

    .stages
    {
        height: 22px;
    }

    .site
    {
        margin-top: 18px;
        color: var(--color-header-accent);
        font-size: 26px;
    }
</style>
</head>
<body>
    <div>
        <h1>Open Paleo</h1>
        <p>A community-maintained phylogenetic dataset for paleontology, backed by published literature.</p>
    </div>
    <div class="scale">
        <div class="row periods">${writeBandRow(createBands(periods, "--period-"), periodNames)}</div>
        <div class="row stages">${writeBandRow(createBands(stages, "--stage-"), stageLabels)}</div>
        <div class="site">open-paleo.org</div>
    </div>
</body>
</html>
`;
}

/**
 * Render the image page and save it as a PNG.
 */
async function createSocialImage(): Promise<void>
{
    fs.mkdirSync(path.dirname(pagePath), { recursive: true });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(pagePath, writeImagePage());

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

    await page.goto(url.pathToFileURL(pagePath).href);
    await page.evaluate(async () => await document.fonts.ready);
    await page.screenshot({ path: outputPath });
    await browser.close();
    console.log("Wrote " + outputPath + " (" + Math.round(fs.statSync(outputPath).size / 1024) + " KB)");
}

await createSocialImage();
