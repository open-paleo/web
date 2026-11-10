import * as url from "node:url";

import type * as axe from "axe-core";
import type { Page } from "playwright";

/**
 * The axe-core global the injected script defines.
 */
type AxeGlobal = {
    /**
     * The axe-core API.
     */
    axe: typeof axe;
};

/**
 * The browser window once axe-core is injected.
 */
type AxeWindow = Window & AxeGlobal;

/**
 * One element that fails, or may fail, an accessibility rule.
 */
export type AccessibilityFinding = {
    /**
     * The axe rule: "color-contrast".
     */
    rule: string;

    /**
     * What the rule requires: "Elements must meet minimum color contrast ratio thresholds".
     */
    help: string;

    /**
     * A CSS selector for the element.
     */
    target: string;

    /**
     * Why the element fails, from axe.
     */
    summary: string;
};

/**
 * What axe found on one page.
 */
export type AccessibilityReport = {
    /**
     * Elements that fail a rule.
     */
    violations: Array<AccessibilityFinding>;

    /**
     * Elements axe could not decide on, which a person should look at.
     */
    needsReview: Array<AccessibilityFinding>;
};

/**
 * The WCAG 2.2 level A and AA rules, which is the level the site aims for.
 */
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const axeScriptPath = url.fileURLToPath(import.meta.resolve("axe-core/axe.min.js"));

/**
 * Run axe on the current document. Runs in the browser, so it uses nothing from this module.
 *
 * @param tags - The rule tags to run.
 * @returns axe's results.
 */
async function runAxeInPage(tags: Array<string>): Promise<axe.AxeResults>
{
    const axeWindow = window as unknown as AxeWindow;

    return await axeWindow.axe.run(document, { runOnly: { type: "tag", values: tags } });
}

/**
 * Turn axe's results for one rule into one finding per element.
 *
 * @param results - axe's results for each rule.
 * @param findings - The list to add the findings to.
 */
function addFindings(results: Array<axe.Result>, findings: Array<AccessibilityFinding>): void
{
    for (const result of results)
    {
        for (const node of result.nodes)
        {
            findings.push({
                rule: result.id,
                help: result.help,
                target: node.target.join(" "),
                summary: (node.failureSummary ?? "").replace(/\s+/g, " ").trim(),
            });
        }
    }
}

/**
 * Check the open page against WCAG 2.2 A and AA with axe.
 *
 * @param page - The page, loaded.
 * @returns The elements that fail, and those axe could not decide on.
 */
export async function checkAccessibility(page: Page): Promise<AccessibilityReport>
{
    await page.addScriptTag({ path: axeScriptPath });
    const results = await page.evaluate(runAxeInPage, wcagTags);
    const report: AccessibilityReport = { violations: [], needsReview: [] };

    addFindings(results.violations, report.violations);
    addFindings(results.incomplete, report.needsReview);

    return report;
}

/**
 * Find grid and flex containers that split prose: loose text beside a text-level element (a link,
 * an italic name, a span) or more than one loose text run. Each becomes its own grid or flex
 * item, so a sentence with a link in it would break into columns. A form control or image beside
 * one run of text, such as a checkbox and its label, cannot split a sentence and is not reported.
 * Runs in the browser, so it uses nothing from this module.
 *
 * @returns A description of each such container: its tag, class and opening text.
 */
function findLooseTextInPage(): Array<string>
{
    const containers = new Array<string>();
    const controls = ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "IMG", "SVG", "CANVAS", "VIDEO", "PICTURE"];

    for (const element of document.querySelectorAll("body *"))
    {
        const display = getComputedStyle(element).display;

        if (!display.includes("grid") && !display.includes("flex"))
        {
            continue;
        }

        let looseTextRuns = 0;
        let hasTextElement = false;

        for (const node of element.childNodes)
        {
            if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "")
            {
                looseTextRuns++;
            }
            else if (node.nodeType === Node.ELEMENT_NODE && !controls.includes((node as Element).tagName.toUpperCase()))
            {
                hasTextElement = true;
            }
        }

        if (looseTextRuns >= 2 || (looseTextRuns === 1 && hasTextElement))
        {
            const className = element.getAttribute("class") ?? "";
            const text = (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);

            containers.push(element.tagName.toLowerCase() + (className ? "." + className.split(" ").join(".") : "") + ": " + text);
        }
    }

    return containers;
}

/**
 * Find grid and flex containers on the open page that mix loose text with elements.
 *
 * @param page - The page, loaded.
 * @returns A description of each such container.
 */
export async function findLooseText(page: Page): Promise<Array<string>>
{
    return await page.evaluate(findLooseTextInPage);
}

/**
 * Measure how far the document is wider than the window. Runs in the browser.
 *
 * @returns The overflow in CSS pixels; 0 when the page fits.
 */
function measureOverflowInPage(): number
{
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
}

/**
 * Measure how far the open page scrolls sideways. At 320px wide, WCAG 1.4.10 (Reflow) allows
 * none: wide content such as tables and charts must scroll inside its own box.
 *
 * @param page - The page, loaded.
 * @returns The overflow in CSS pixels; 0 when the page fits.
 */
export async function measureOverflow(page: Page): Promise<number>
{
    return await page.evaluate(measureOverflowInPage);
}
