/**
 * Check the built site in dist/: every internal link resolves, a sample of pages passes WCAG 2.2
 * AA in axe (light and dark), has no grid or flex container that splits loose text, and does not
 * scroll sideways at 320px, and the tree extractor reads a figure using only the site's files.
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
import * as url from "node:url";

import type { Browser, BrowserContextOptions, Page, Route } from "playwright";
import { chromium } from "playwright";

import { listDeclaredHosts } from "../src/data/privacy.ts";
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
 * The part of the tree extractor element the check reads.
 */
type TreeExtractorNewick = {
    /**
     * The tree it found, as Newick, or null.
     */
    getNewick(): string | null;
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
    { path: "tools/", reason: "the list of tools" },
    { path: "tools/tree-extractor/", reason: "the tree extractor, before a figure is loaded" },
    { path: "search/?q=Tyrannosaurus", reason: "search results and filters" },
    { path: "404.html", reason: "page not found" },
    { path: "genus/tyrannosaurus/", reason: "genus with notable specimens and synonyms" },
    { path: "genus/velociraptor/", reason: "genus with a dispute note" },
    { path: "genus/psittacosaurus/", reason: "genus with many species" },
    { path: "genus/aardonyx/", reason: "genus with a numbered diagnosis" },
    { path: "genus/archaeopteryx/", reason: "genus with an ICZN case" },
    { path: "genus/micropachycephalosaurus/", reason: "genus with the longest name, which must fit 320px" },
    { path: "clade/dinosauria/", reason: "large clade" },
    { path: "clade/nodosauridae/", reason: "clade with genera of uncertain placement" },
    { path: "clade/carcharodontosauridae/", reason: "clade with one of the longest names" },
    { path: "privacy/", reason: "privacy page" },
    { path: "reference/osborn1905a/", reason: "reference cited by many records" },
    { path: "stage/bathonian/", reason: "stage page" },
    { path: "period/jurassic/", reason: "period page" },
];

const colorSchemes: Array<ColorScheme> = ["light", "dark"];

const treeFigurePath = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "site-checks", "tree-figure.png");

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

// Every off-site host a checked page asked for. Each must be declared in src/data/privacy.ts,
// which the privacy page lists, so a new outside service can't go unmentioned there.
const offSiteHosts = new Set<string>();

/**
 * Note an off-site request's host, then block the request.
 *
 * @param route - The intercepted request.
 */
async function blockOffSiteRequest(route: Route): Promise<void>
{
    offSiteHosts.add(new URL(route.request().url()).hostname);
    await route.abort();
}

/**
 * Open a page in the browser with requests outside the local site blocked and their hosts noted.
 * The maps fetch tiles and fonts from OpenFreeMap, and published builds load Plausible's counting
 * script; the checks need neither, and blocking them keeps the checks independent of those
 * services, off their servers, and out of the visit counts.
 *
 * @param browser - The browser.
 * @param options - The page's viewport and color scheme.
 * @returns The page.
 */
async function openLocalPage(browser: Browser, options: BrowserContextOptions): Promise<Page>
{
    const page = await browser.newPage(options);

    await page.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => blockOffSiteRequest(route));

    return page;
}

/**
 * Report each off-site host the pages contacted that the privacy data doesn't declare.
 *
 * @param problems - The list to add problems to.
 */
function checkOffSiteHosts(problems: Array<SiteProblem>): void
{
    const declaredHosts = listDeclaredHosts();

    for (const host of offSiteHosts)
    {
        if (!declaredHosts.includes(host))
        {
            problems.push({
                location: host,
                check: "privacy",
                message: "a page contacts this host, which src/data/privacy.ts doesn't declare; add the service there so the privacy page lists it",
            });
        }
    }
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
 * Run the tree extractor on a small synthetic figure (made by the tree extractor's own
 * benchmark, with invented names): it must trace a tree and read its labels with nothing but the
 * site's own files, since every request off the site is blocked.
 *
 * @param browser - The browser.
 * @param siteUrl - The site's local address.
 * @param problems - The list to add a failure to.
 */
async function checkTreeExtractor(browser: Browser, siteUrl: string, problems: Array<SiteProblem>): Promise<void>
{
    const page = await openLocalPage(browser, { viewport: { width: 1280, height: 900 } });
    const errors = new Array<string>();
    const location = "/tools/tree-extractor/ (running a figure)";

    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(siteUrl + "tools/tree-extractor/");
    await page.locator("#te-file").setInputFiles(treeFigurePath);
    await page.click("#te-run");

    try
    {
        await page.waitForFunction(isTreeExtracted, null, { timeout: 120000 });
        const newick = await page.evaluate(readExtractedNewick);

        if (!newick || !newick.includes(","))
        {
            problems.push({ location, check: "tool", message: "no tree came out" });
        }
    }
    catch
    {
        problems.push({ location, check: "tool", message: "did not finish: " + (await page.locator("#te-status").textContent()) });
    }

    for (const error of errors)
    {
        problems.push({ location, check: "tool", message: error });
    }

    await page.close();
}

/**
 * Type part of a genus name into the header's search field: the suggestion list must open with
 * that genus in it and pass axe while open, and choosing it from the keyboard must open its page.
 *
 * @param browser - The browser.
 * @param siteUrl - The site's local address.
 * @param problems - The list to add failures to.
 */
async function checkSearchSuggestions(browser: Browser, siteUrl: string, problems: Array<SiteProblem>): Promise<void>
{
    const page = await openLocalPage(browser, { viewport: { width: 1280, height: 900 } });
    const location = "/genus/tyrannosaurus/ (search suggestions)";
    const option = page.locator("#site-search-field-suggestions li", { hasText: "Velociraptor" }).first();

    await page.goto(siteUrl + "genus/tyrannosaurus/", { waitUntil: "networkidle" });
    await page.locator("#site-search-field").click();
    await page.keyboard.type("veloci");

    try
    {
        await option.waitFor({ timeout: 10000 });
    }
    catch
    {
        problems.push({ location, check: "suggestions", message: "typing \"veloci\" did not suggest Velociraptor" });
        await page.close();

        return;
    }

    for (const finding of (await checkAccessibility(page)).violations)
    {
        problems.push({ location, check: "axe", message: finding.rule + " at " + finding.target + ": " + finding.summary });
    }

    const options = await page.locator("#site-search-field-suggestions li").allTextContents();
    const index = options.findIndex((text) => text.startsWith("Velociraptor") && text.includes("Genus"));

    for (let press = 0; press <= index; press++)
    {
        await page.keyboard.press("ArrowDown");
    }

    await page.keyboard.press("Enter");

    try
    {
        await page.waitForURL(/genus\/velociraptor\/$/, { timeout: 10000 });
    }
    catch
    {
        problems.push({ location, check: "suggestions", message: "choosing Velociraptor opened " + page.url() });
    }

    await page.close();
}

/**
 * Report whether the tree extractor has finished a run. Runs in the browser.
 *
 * @returns True once the status reports the tips found.
 */
function isTreeExtracted(): boolean
{
    return /\d+ tips/.test(document.querySelector("#te-status")?.textContent ?? "");
}

/**
 * Read the tree the tree extractor found. Runs in the browser.
 *
 * @returns The tree as Newick, or null.
 */
function readExtractedNewick(): string | null
{
    const element = document.querySelector("tree-extractor") as (HTMLElement & TreeExtractorNewick) | null;

    return element ? element.getNewick() : null;
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

        await checkTreeExtractor(browser, server.url, problems);
        await checkSearchSuggestions(browser, server.url, problems);
        checkOffSiteHosts(problems);
    }
    finally
    {
        await browser.close();
        server.server.close();
    }

    console.log("Pages: " + samplePages.length + " checked with axe (light and dark), for loose text, and at 320px wide; the tree extractor run on a figure; search suggestions tried");
    console.log("Off-site hosts contacted: " + ([...offSiteHosts].sort().join(", ") || "none") + " (each must be declared in src/data/privacy.ts)");

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
