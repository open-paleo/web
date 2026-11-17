import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createSiteData } from "../src/data/site-data.ts";
import { createTreeChart, getTreeChartLegend } from "../src/data/tree-chart.ts";
import { readFixture } from "./fixture.ts";

const siteData = createSiteData(readFixture());
const top = siteData.cladeByName.get("Dinosauria");

test("every genus below Dinosauria is in exactly one tip", () =>
{
    assert.ok(top);

    const chart = createTreeChart(top, siteData);
    const seen = new Map<string, number>();

    for (const tip of Object.values(chart.tips))
    {
        for (const genus of tip.genera)
        {
            seen.set(genus.name, (seen.get(genus.name) ?? 0) + 1);
        }
    }

    assert.equal(seen.size, siteData.genera.length);

    for (const [name, count] of seen)
    {
        assert.equal(count, 1, name);
    }
});

test("each tip has one label, and tips follow the summary rules", () =>
{
    assert.ok(top);

    const chart = createTreeChart(top, siteData);
    const tipLabels = chart.labels.features.filter((label) => label.properties.kind === "tip");

    assert.equal(tipLabels.length, Object.keys(chart.tips).length);

    for (const label of tipLabels)
    {
        const tip = chart.tips[label.properties.tipKey];
        const typeGenus = siteData.cladeByName.get(tip.cladeName)?.record?.type_genus;
        const names = tip.genera.map((genus) => genus.name);

        assert.ok(tip, label.properties.tipKey);
        assert.equal(label.properties.name === "", tip.isDirect, label.properties.tipKey);

        if (names.length === 1)
        {
            assert.equal(label.properties.summaryItalic, names[0]);
            assert.equal(label.properties.summaryRest, "");
        }
        else if (typeGenus && names.includes(typeGenus))
        {
            assert.equal(label.properties.summaryItalic, typeGenus);
            assert.match(label.properties.summaryRest, /^ and \d+ others?$/);
        }
        else
        {
            assert.equal(label.properties.summaryRest, names.length + " genera");
        }
    }
});

test("the chart stays well inside Web Mercator's latitudes", () =>
{
    assert.ok(top);

    const [southWest, northEast] = createTreeChart(top, siteData).bounds;

    assert.ok(southWest[1] > -60 && northEast[1] < 60);
    assert.ok(southWest[0] < northEast[0] && southWest[1] < northEast[1]);
});

test("the legend lists the major groups the tree has, each with its color token", () =>
{
    const legend = getTreeChartLegend(siteData);

    assert.ok(legend.length > 0);

    for (const entry of legend)
    {
        assert.equal(entry.colorToken, "--color-clade-" + entry.name.toLowerCase());
        assert.ok(siteData.cladeByName.get(entry.name));
    }
});
