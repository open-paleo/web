// Shows the Tree page's chart. Loads the chart's data (tree/chart.json), then
// tree-chart-renderer.ts, which brings in MapLibre and draws it, so only the Tree page loads
// MapLibre for the chart. Without JavaScript the chart stays hidden and the outline below it lists
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
