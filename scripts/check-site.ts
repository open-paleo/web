/**
 * Check the built site in dist/: every internal link resolves, every page's structured data is
 * valid JSON-LD, a sample of pages passes WCAG 2.2 AA in axe (light and dark), has no grid or flex
 * container that splits loose text, and does not scroll sideways at 320px, and the tree extractor
 * reads a figure using only the site's files.
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
import { availableParallelism } from "node:os";
import { setTimeout as wait } from "node:timers/promises";
import * as url from "node:url";

import type { Browser, BrowserContextOptions, Page, Response, Route } from "playwright";
import { chromium } from "playwright";

import { getDeclaredHosts } from "../src/data/privacy.ts";
import type { SitePage } from "./site-checks/links.ts";
import { checkLinks, readSitePages } from "./site-checks/links.ts";
import { checkAccessibility, findLooseText, measureOverflow } from "./site-checks/page-checks.ts";
import { startStaticServer } from "./site-checks/static-server.ts";
import { findStructuredDataProblem } from "./site-checks/structured-data.ts";

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
     * Which check failed: "links", "structured data", "axe", "loose text" or "reflow".
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
 * A page's requests, to tell when its network has gone quiet.
 */
type RequestTraffic = {
    /**
     * Requests started and not yet finished or failed.
     */
    inFlight: number;

    /**
     * When a request last started, finished or failed, from performance.now().
     */
    lastChange: number;
};

/**
 * A page opened on the local site, and the response to its address.
 */
type OpenedPage = {
    /**
     * The page.
     */
    page: Page;

    /**
     * The response to its address, or null when there was none.
     */
    response: Response | null;
};

/**
 * What one check found: its problems, and the axe findings for someone to review.
 */
type CheckResult = {
    /**
     * Its failed checks.
     */
    problems: Array<SiteProblem>;

    /**
     * Lines to print: axe findings that need a person to review them.
     */
    notes: Array<string>;
};

/**
 * One of the checks run in a browser: a sample page, or a tool or find field to try.
 */
type BrowserCheck = {
    /**
     * The sample page to check, or undefined for a feature check.
     */
    sample: SamplePage | undefined;

    /**
     * The feature check to run, when this isn't a sample page.
     */
    feature: FeatureCheck | undefined;
};

/**
 * A check that tries one of the site's features, such as a tool or a find field.
 */
type FeatureCheck = (browser: Browser, siteUrl: string, problems: Array<SiteProblem>) => Promise<void>;

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
    { path: "tools/outline-tracer/", reason: "the outline tracer, before a figure is opened" },
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
    { path: "licenses/", reason: "licenses page: the works by others and their licenses" },
    { path: "stratigraphy/", reason: "rock unit index" },
    { path: "clades/", reason: "clade index and its filters" },
    { path: "time/", reason: "geologic time scale with the stage tables" },
    { path: "unit/wessex/", reason: "formation with members and beds" },
    { path: "unit/neuquen/", reason: "group with formations and many genera" },
    { path: "unit/abajo-shale/", reason: "member's page that sends readers to its section" },
    { path: "reference/osborn1905a/", reason: "reference cited by many records" },
    { path: "stage/bathonian/", reason: "stage page" },
    { path: "period/jurassic/", reason: "period page" },
];

const colorSchemes: Array<ColorScheme> = ["light", "dark"];

// A page counts as loaded once its load event has fired and no request has started or ended for
// this long, which is shorter than Playwright's network idle (500 ms) yet still waits for the maps,
// search and tree chart, which fetch after loading.
const quietTime = 200;
const quietTimeout = 15000;

// How many checks run at once: the CI runners have four cores.
const checkConcurrency = Math.min(4, availableParallelism());

const treeFigurePath = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "site-checks", "tree-figure.png");

// A synthetic figure drawn for this check: a body with a white bone inside, two legs on a ground
// line, and a label away from the animal.
const outlineFigurePath = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "site-checks", "outline-figure.png");

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
 * @param pages - The built pages.
 * @param siteDirectory - The built site.
 * @param basePath - The base path.
 * @param problems - The list to add broken links to.
 */
function checkSiteLinks(pages: Map<string, SitePage>, siteDirectory: string, basePath: string, problems: Array<SiteProblem>): void
{
    const report = checkLinks(pages, (file) => fs.existsSync(path.join(siteDirectory, file)), basePath);

    console.log("Links: " + report.linkCount + " internal links on " + report.pageCount + " pages, " + report.brokenLinks.length + " broken");

    for (const link of report.brokenLinks)
    {
        problems.push({ location: link.page, check: "links", message: link.href + ": " + link.reason });
    }
}

/**
 * Check every page's structured data: each JSON-LD script parses and is a typed schema.org item.
 * Builds without SITE_URL write none, since its addresses must be absolute.
 *
 * @param pages - The built pages.
 * @param problems - The list to add problems to.
 */
function checkStructuredData(pages: Map<string, SitePage>, problems: Array<SiteProblem>): void
{
    let scriptCount = 0;
    let pageCount = 0;

    for (const [pagePath, page] of pages)
    {
        if (page.structuredData.length > 0)
        {
            pageCount++;
        }

        for (const text of page.structuredData)
        {
            const problem = findStructuredDataProblem(text);

            scriptCount++;

            if (problem)
            {
                problems.push({ location: pagePath, check: "structured data", message: "a JSON-LD script " + problem });
            }
        }
    }

    console.log("Structured data: " + scriptCount + " JSON-LD scripts on " + pageCount + " pages" + (scriptCount === 0 ? " (builds without SITE_URL write none)" : ""));
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
 * Count a page's requests in flight, from before it navigates.
 *
 * @param page - The page.
 * @returns The running count.
 */
function trackRequests(page: Page): RequestTraffic
{
    const traffic: RequestTraffic = { inFlight: 0, lastChange: performance.now() };

    page.on("request", () => changeTraffic(traffic, 1));
    page.on("requestfinished", () => changeTraffic(traffic, -1));
    page.on("requestfailed", () => changeTraffic(traffic, -1));

    return traffic;
}

/**
 * Note a request starting or ending.
 *
 * @param traffic - The page's count.
 * @param change - 1 when one starts, -1 when one ends.
 */
function changeTraffic(traffic: RequestTraffic, change: number): void
{
    traffic.inFlight += change;
    traffic.lastChange = performance.now();
}

/**
 * Wait until no request is in flight and none has started or ended for quietTime, or until
 * quietTimeout has passed.
 *
 * @param traffic - The page's count.
 */
async function waitForQuietNetwork(traffic: RequestTraffic): Promise<void>
{
    const deadline = performance.now() + quietTimeout;

    while (performance.now() < deadline && (traffic.inFlight > 0 || performance.now() - traffic.lastChange < quietTime))
    {
        await wait(25);
    }
}

/**
 * Open a page of the local site and wait until it has loaded and its network has gone quiet.
 *
 * @param browser - The browser.
 * @param options - The page's viewport and color scheme.
 * @param address - The page's address.
 * @returns The page and the response to its address.
 */
async function openSitePage(browser: Browser, options: BrowserContextOptions, address: string): Promise<OpenedPage>
{
    const page = await openLocalPage(browser, options);
    const traffic = trackRequests(page);
    const response = await page.goto(address, { waitUntil: "load" });

    await waitForQuietNetwork(traffic);

    return { page, response };
}

/**
 * Report each off-site host the pages contacted that the privacy data doesn't declare.
 *
 * @param problems - The list to add problems to.
 */
function checkOffSiteHosts(problems: Array<SiteProblem>): void
{
    const declaredHosts = getDeclaredHosts();

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
 * @param result - Where to add problems and findings to review.
 */
async function checkSamplePage(browser: Browser, siteUrl: string, sample: SamplePage, result: CheckResult): Promise<void>
{
    const problems = result.problems;

    for (const colorScheme of colorSchemes)
    {
        const { page, response } = await openSitePage(browser, { viewport: { width: 1280, height: 900 }, colorScheme }, siteUrl + sample.path);
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
            result.notes.push("  Needs review, " + location + ": " + finding.rule + " at " + finding.target);
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

    const narrowPage = (await openSitePage(browser, { viewport: { width: 320, height: 800 } }, siteUrl + sample.path)).page;
    const overflow = await measureOverflow(narrowPage);

    if (overflow > 0)
    {
        problems.push({ location: "/" + sample.path + " (320px)", check: "reflow", message: "scrolls sideways by " + overflow + "px" });
    }

    await narrowPage.close();
}

/**
 * Run the tree extractor on a small synthetic figure (made by the tree extractor's own
 * benchmark, with invented names), reading unmatched labels a second time: it must trace a tree
 * and read its labels with nothing but the site's own files, since every request off the site is
 * blocked.
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

    // Read unmatched labels a second time too, so the run loads ONNX Runtime and the model.
    if (await page.locator("#te-second-ocr-row").isHidden())
    {
        problems.push({ location, check: "tool", message: "the second-reading checkbox is hidden" });
    }
    else
    {
        await page.locator("#te-second-ocr").check();
    }

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
 * Run the outline tracer on a synthetic figure: it must trace it with nothing but the site's own
 * files, erasing the ground line and dropping the label, write the record with the figure's
 * SHA-1, and pass axe with a figure open.
 *
 * @param browser - The browser.
 * @param siteUrl - The site's local address.
 * @param problems - The list to add failures to.
 */
async function checkOutlineTracer(browser: Browser, siteUrl: string, problems: Array<SiteProblem>): Promise<void>
{
    const page = await openLocalPage(browser, { viewport: { width: 1280, height: 900 } });
    const errors = new Array<string>();
    const location = "/tools/outline-tracer/ (tracing a figure)";

    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(siteUrl + "tools/outline-tracer/");
    await page.locator("#tracer-file").setInputFiles(outlineFigurePath);
    await page.locator("#tracer-trace").click();

    try
    {
        await page.waitForFunction(isOutlineTraced, null, { timeout: 60000 });
        const status = await page.locator("#tracer-status").textContent() ?? "";
        const record = await page.locator("#tracer-record-text").textContent() ?? "";

        if (!status.includes("1 ground line erased") || !status.includes("and 1 dropped") || await page.locator("#tracer-outline svg path").count() === 0)
        {
            problems.push({ location, check: "tool", message: "unexpected trace: " + status });
        }

        if (!/sha1: [0-9a-f]{40}\n/.test(record))
        {
            problems.push({ location, check: "tool", message: "the record has no SHA-1" });
        }

        for (const finding of (await checkAccessibility(page)).violations)
        {
            problems.push({ location, check: "axe", message: finding.rule + " at " + finding.target + ": " + finding.summary });
        }
    }
    catch
    {
        problems.push({ location, check: "tool", message: "did not finish: " + (await page.locator("#tracer-status").textContent()) });
    }

    for (const error of errors)
    {
        problems.push({ location, check: "tool", message: error });
    }

    await page.close();
}

/**
 * Report whether the outline tracer has finished a trace. Runs in the browser.
 *
 * @returns True once the status reports the trace.
 */
function isOutlineTraced(): boolean
{
    return /^(Traced|Couldn't)/.test(document.querySelector("#tracer-status")?.textContent ?? "");
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
    const page = (await openSitePage(browser, { viewport: { width: 1280, height: 900 } }, siteUrl + "genus/tyrannosaurus/")).page;
    const location = "/genus/tyrannosaurus/ (search suggestions)";
    const option = page.locator("#site-search-field-suggestions li", { hasText: "Velociraptor" }).first();

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
 * Use the Tree page's find field: typing part of a genus must list it, pass axe while the list
 * is open, and choosing it from the keyboard must reveal and highlight the clade it is placed in.
 *
 * @param browser - The browser.
 * @param siteUrl - The site's local address.
 * @param problems - The list to add failures to.
 */
async function checkTreeFind(browser: Browser, siteUrl: string, problems: Array<SiteProblem>): Promise<void>
{
    const page = (await openSitePage(browser, { viewport: { width: 1280, height: 900 } }, siteUrl + "tree/")).page;
    const location = "/tree/ (find)";
    const option = page.locator("#tree-find-field-suggestions li", { hasText: "Velociraptor" }).first();

    await page.locator("#tree-find-field").click();
    await page.keyboard.type("velocirap");

    try
    {
        await option.waitFor({ timeout: 10000 });
    }
    catch
    {
        problems.push({ location, check: "find", message: "typing \"velocirap\" did not list Velociraptor" });
        await page.close();

        return;
    }

    for (const finding of (await checkAccessibility(page)).violations)
    {
        problems.push({ location, check: "axe", message: finding.rule + " at " + finding.target + ": " + finding.summary });
    }

    // Wait for the chart to be drawn, or to give up (no WebGL), so the find goes where a reader's would.
    await page.waitForFunction(() => document.querySelector<HTMLElement>("#tree-chart")?.dataset.ready === "true" || document.querySelector(".tree-chart-unavailable") !== null, undefined, { timeout: 15000 }).catch(() => undefined);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    // With the chart drawn, the find opens the tip's panel; without it, it reveals the outline row.
    const isChartShown = await page.evaluate(() => document.querySelector<HTMLElement>("#tree-chart")?.dataset.ready === "true");
    const found = isChartShown ? page.locator(".tree-chart-panel-heading", { hasText: "Velociraptorinae" }) : page.locator(".tree-row.is-found");

    try
    {
        await found.waitFor({ state: "visible", timeout: 10000 });
    }
    catch
    {
        problems.push({ location, check: "find", message: "choosing Velociraptor did not show its clade " + (isChartShown ? "in the chart's panel" : "in the outline") });
    }

    await page.close();
}

/**
 * Use the References page's find field: typing an author and year must list the reference, pass
 * axe while the list is open, and choosing it must highlight it in the list.
 *
 * @param browser - The browser.
 * @param siteUrl - The site's local address.
 * @param problems - The list to add failures to.
 */
async function checkReferenceFind(browser: Browser, siteUrl: string, problems: Array<SiteProblem>): Promise<void>
{
    const page = (await openSitePage(browser, { viewport: { width: 1280, height: 900 } }, siteUrl + "references/")).page;
    const location = "/references/ (find)";
    const option = page.locator("#reference-find-field-suggestions li", { hasText: "Osborn (1905)" }).first();

    await page.locator("#reference-find-field").click();
    await page.keyboard.type("osborn 1905");

    try
    {
        await option.waitFor({ timeout: 10000 });
    }
    catch
    {
        problems.push({ location, check: "find", message: "typing \"osborn 1905\" did not list Osborn (1905)" });
        await page.close();

        return;
    }

    for (const finding of (await checkAccessibility(page)).violations)
    {
        problems.push({ location, check: "axe", message: finding.rule + " at " + finding.target + ": " + finding.summary });
    }

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    try
    {
        await page.locator(".reference-index li.is-found").waitFor({ state: "visible", timeout: 10000 });
    }
    catch
    {
        problems.push({ location, check: "find", message: "choosing Osborn (1905) did not highlight it in the list" });
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
 * Run one browser check, collecting what it finds.
 *
 * @param browser - The browser.
 * @param siteUrl - The site's local address.
 * @param check - The check.
 * @returns What it found.
 */
async function runBrowserCheck(browser: Browser, siteUrl: string, check: BrowserCheck): Promise<CheckResult>
{
    const result: CheckResult = { problems: [], notes: [] };

    if (check.sample)
    {
        await checkSamplePage(browser, siteUrl, check.sample, result);
    }
    else if (check.feature)
    {
        await check.feature(browser, siteUrl, result.problems);
    }

    return result;
}

/**
 * Run the browser checks, checkConcurrency at a time, each in its own pages.
 *
 * @param browser - The browser.
 * @param siteUrl - The site's local address.
 * @param checks - The checks.
 * @returns What each found, in the checks' order, so the report reads the same however they ran.
 */
async function runBrowserChecks(browser: Browser, siteUrl: string, checks: Array<BrowserCheck>): Promise<Array<CheckResult>>
{
    const results = new Array<CheckResult>(checks.length);
    const workers = new Array<Promise<void>>();
    let next = 0;

    /**
     * Take the next check not yet started, until none are left.
     */
    async function runRemainingChecks(): Promise<void>
    {
        while (next < checks.length)
        {
            const index = next;

            next++;
            results[index] = await runBrowserCheck(browser, siteUrl, checks[index]);
        }
    }

    for (let worker = 0; worker < checkConcurrency; worker++)
    {
        workers.push(runRemainingChecks());
    }

    await Promise.all(workers);

    return results;
}

/**
 * List the browser checks: every sample page, then the tools and find fields to try.
 *
 * @returns The checks.
 */
function createBrowserChecks(): Array<BrowserCheck>
{
    const checks = new Array<BrowserCheck>();
    const features: Array<FeatureCheck> = [checkTreeExtractor, checkOutlineTracer, checkSearchSuggestions, checkTreeFind, checkReferenceFind];

    for (const sample of samplePages)
    {
        checks.push({ sample, feature: undefined });
    }

    for (const feature of features)
    {
        checks.push({ sample: undefined, feature });
    }

    return checks;
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

    const pages = readSitePages(siteDirectory);

    checkSiteLinks(pages, siteDirectory, basePath, problems);
    checkStructuredData(pages, problems);

    const server = await startStaticServer(siteDirectory, basePath);
    const browser = await chromium.launch();

    try
    {
        // Several at once, each in its own pages; the results come back in the list's order.
        for (const result of await runBrowserChecks(browser, server.url, createBrowserChecks()))
        {
            problems.push(...result.problems);

            for (const note of result.notes)
            {
                console.log(note);
            }
        }

        checkOffSiteHosts(problems);
    }
    finally
    {
        await browser.close();
        server.server.close();
    }

    console.log("Pages: " + samplePages.length + " checked with axe (light and dark), for loose text, and at 320px wide; the tree extractor run on a figure; search suggestions and the Tree and References pages' find fields tried");
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
