/**
 * Check the built site in dist/: every internal link resolves, and a sample of pages passes
 * WCAG 2.2 AA in axe (light and dark), has no grid or flex container that splits loose text,
 * and does not scroll sideways at 320px.
 *
 * Run after `npm run build`:
 *
 *     npm run check-site
 *
 * Exits with status 1 when any check fails. Set SITE_BASE as for the build when the site is
 * served under a path.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import type { Browser, BrowserContextOptions, Page } from "playwright";
import { chromium } from "playwright";

import { checkLinks, readSitePages } from "./site-checks/links.ts";
import { checkAccessibility, findLooseText, measureOverflow } from "./site-checks/page-checks.ts";
import { startStaticServer } from "./site-checks/static-server.ts";

/**
 * A page the browser checks run on, and why it is in the sample.
 */
type SamplePage = {
    /**
     * The page's path below the base path: "genus/velociraptor/".
     */
    path: string;

    /**
     * What the page has that others in the sample do not.
     */
    reason: string;
};

/**
 * One failed check.
 */
type SiteProblem = {
    /**
     * Where it failed: a page path, with the color scheme for axe.
     */
    location: string;

    /**
     * Which check failed: "links", "axe", "loose text" or "reflow".
     */
    check: string;

    /**
     * What is wrong.
     */
    message: string;
};

/**
 * The color schemes axe runs in, since each has its own colors to check.
 */
type ColorScheme = "light" | "dark";

/**
 * One page of each kind, plus the records with the most unusual content. If a record leaves the
 * dataset, its page is reported missing; replace it with another that shows the same thing.
 */
const samplePages: Array<SamplePage> = [
    { path: "", reason: "home: chart, major groups, recent names" },
    { path: "genera/", reason: "A-Z index" },
    { path: "tree/", reason: "tree outline with toggle buttons" },
    { path: "references/", reason: "reference index" },
    { path: "data/", reason: "download and citation" },
    { path: "map/", reason: "world map, its panel, and the index of genera by place" },
    { path: "search/?q=Tyrannosaurus", reason: "search results and filters" },
    { path: "404.html", reason: "page not found" },
    { path: "genus/tyrannosaurus/", reason: "genus with notable specimens and synonyms" },
    { path: "genus/velociraptor/", reason: "genus with a dispute note" },
    { path: "genus/psittacosaurus/", reason: "genus with many species" },
    { path: "genus/aardonyx/", reason: "genus with a numbered diagnosis" },
    { path: "genus/archaeopteryx/", reason: "genus with an ICZN case" },
    { path: "clade/dinosauria/", reason: "large clade" },
    { path: "clade/nodosauridae/", reason: "clade with genera of uncertain placement" },
    { path: "reference/osborn1905a/", reason: "reference cited by many records" },
    { path: "stage/bathonian/", reason: "stage page" },
    { path: "period/jurassic/", reason: "period page" },
];

const colorSchemes: Array<ColorScheme> = ["light", "dark"];

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
 * Check every internal link in the built site.
 *
 * @param siteDirectory - The built site.
 * @param basePath - The base path.
 * @param problems - The list to add broken links to.
 */
function checkSiteLinks(siteDirectory: string, basePath: string, problems: Array<SiteProblem>): void
{
    const pages = readSitePages(siteDirectory);
    const report = checkLinks(pages, (file) => fs.existsSync(path.join(siteDirectory, file)), basePath);

    console.log("Links: " + report.linkCount + " internal links on " + report.pageCount + " pages, " + report.brokenLinks.length + " broken");

    for (const link of report.brokenLinks)
    {
        problems.push({ location: link.page, check: "links", message: link.href + ": " + link.reason });
    }
}

/**
 * Open a page in the browser with requests outside the local site blocked. The maps fetch tiles
 * and fonts from OpenFreeMap; the checks do not need them, and blocking them keeps the checks
 * independent of that service and off its servers.
 *
 * @param browser - The browser.
 * @param options - The page's viewport and color scheme.
 * @returns The page.
 */
async function openLocalPage(browser: Browser, options: BrowserContextOptions): Promise<Page>
{
    const page = await browser.newPage(options);

    await page.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => route.abort());

    return page;
}

/**
 * Run the browser checks on one sample page: axe in each color scheme, the loose-text scan,
 * and reflow at 320px.
 *
 * @param browser - The browser.
 * @param siteUrl - The site's local address, ending in the base path.
 * @param sample - The page.
 * @param problems - The list to add problems to.
 */
async function checkSamplePage(browser: Browser, siteUrl: string, sample: SamplePage, problems: Array<SiteProblem>): Promise<void>
{
    for (const colorScheme of colorSchemes)
    {
        const page = await openLocalPage(browser, { viewport: { width: 1280, height: 900 }, colorScheme });
        const response = await page.goto(siteUrl + sample.path, { waitUntil: "networkidle" });
        const location = "/" + sample.path + " (" + colorScheme + ")";

        if (!response || response.status() !== 200)
        {
            problems.push({ location, check: "page", message: "returned " + (response?.status() ?? "nothing") + "; is the record still in the dataset?" });
            await page.close();

            return;
        }

        const report = await checkAccessibility(page);

        for (const finding of report.violations)
        {
            problems.push({ location, check: "axe", message: finding.rule + " at " + finding.target + ": " + finding.summary });
        }

        for (const finding of report.needsReview)
        {
            console.log("  Needs review, " + location + ": " + finding.rule + " at " + finding.target);
        }

        if (colorScheme === "light")
        {
            for (const container of await findLooseText(page))
            {
                problems.push({ location, check: "loose text", message: container });
            }
        }

        await page.close();
    }

    const narrowPage = await openLocalPage(browser, { viewport: { width: 320, height: 800 } });

    await narrowPage.goto(siteUrl + sample.path, { waitUntil: "networkidle" });
    const overflow = await measureOverflow(narrowPage);

    if (overflow > 0)
    {
        problems.push({ location: "/" + sample.path + " (320px)", check: "reflow", message: "scrolls sideways by " + overflow + "px" });
    }

    await narrowPage.close();
}

/**
 * Print the problems, as GitHub annotations when running in GitHub Actions.
 *
 * @param problems - Every failed check.
 */
function printProblems(problems: Array<SiteProblem>): void
{
    const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

    for (const problem of problems)
    {
        const line = problem.check + ", " + problem.location + ": " + problem.message;

        console.log(isGitHubActions ? "::error title=Site check (" + problem.check + ")::" + line : "  " + line);
    }
}

/**
 * Run every check on the built site and set the exit status.
 */
async function checkSite(): Promise<void>
{
    const siteDirectory = path.resolve("dist");
    const basePath = getBasePath();
    const problems = new Array<SiteProblem>();

    if (!fs.existsSync(path.join(siteDirectory, "index.html")))
    {
        console.error("No built site in " + siteDirectory + "; run `npm run build` first.");
        process.exitCode = 1;

        return;
    }

    checkSiteLinks(siteDirectory, basePath, problems);

    const server = await startStaticServer(siteDirectory, basePath);
    const browser = await chromium.launch();

    try
    {
        for (const sample of samplePages)
        {
            await checkSamplePage(browser, server.url, sample, problems);
        }
    }
    finally
    {
        await browser.close();
        server.server.close();
    }

    console.log("Pages: " + samplePages.length + " checked with axe (light and dark), for loose text, and at 320px wide");

    if (problems.length > 0)
    {
        console.log(problems.length + " problems:");
        printProblems(problems);
        process.exitCode = 1;
    }
    else
    {
        console.log("No problems found.");
    }
}

await checkSite();
