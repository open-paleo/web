// Loads the Tree page's chart data and renderer. Without JavaScript, the outline below lists
// the same clades.

import type { TreeChart } from "../data/tree-chart.ts";

const baseUrl = document.documentElement.dataset.baseUrl ?? "/";

/**
 * Reveal the chart, load its data and the renderer, and draw it.
 */
async function initializeTreeChart(): Promise<void>
{
    const section = document.querySelector<HTMLElement>(".tree-chart-section");
    const container = document.querySelector<HTMLElement>("#tree-chart");
    const panel = document.querySelector<HTMLElement>(".tree-chart-panel");

    if (!section || !container || !panel)
    {
        return;
    }

    section.hidden = false;

    const response = await fetch(baseUrl + "tree/chart.json");
    const chart = await response.json() as TreeChart;
    const renderer = await import("./tree-chart-renderer.ts");

    renderer.renderTreeChart(container, panel, chart);
}

void initializeTreeChart();
