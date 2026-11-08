import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { createGeologicTimeline } from "../src/data/age-figure.ts";
import { countGeneraByStage } from "../src/data/home.ts";
import { readDataset } from "../src/data/load-dataset.ts";
import { createSiteData } from "../src/data/site-data.ts";
import { createTimePages, listAgeCaptionParts } from "../src/data/time-pages.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.3.0");
const siteData = createSiteData(dataset);

assert.ok(dataset.timescale, "the fixture should carry the timescale");

const timeline = createGeologicTimeline(dataset.timescale);
const pages = createTimePages(siteData, timeline);

test("each stage page lists the genera the home chart counts for it", () =>
{
    for (const stage of countGeneraByStage(siteData, timeline))
    {
        const page = pages.stageByName.get(stage.name);

        assert.equal(page?.genera.length ?? 0, stage.count, stage.name);
    }
});

test("only stages and periods with genera get pages", () =>
{
    for (const stage of pages.stages)
    {
        assert.ok(stage.genera.length > 0, stage.name);
    }

    for (const period of pages.periods)
    {
        assert.ok(period.genera.length > 0, period.name);
    }
});

test("a stage page knows its epoch, period and slug", () =>
{
    const maastrichtian = pages.stageByName.get("Maastrichtian");

    assert.ok(maastrichtian);
    assert.equal(maastrichtian.slug, "maastrichtian");
    assert.equal(maastrichtian.epochName, "Late Cretaceous");
    assert.equal(maastrichtian.periodName, "Cretaceous");
    assert.ok(maastrichtian.genera.some((genus) => genus.name === "Tyrannosaurus"));
});

test("a period lists each of its genera once, sorted, and spans its stages", () =>
{
    const cretaceous = pages.periodByName.get("Cretaceous");

    assert.ok(cretaceous);
    const names = cretaceous.genera.map((genus) => genus.name);

    assert.deepEqual(names, [...new Set(names)], "no genus twice");
    assert.deepEqual(names, [...names].sort((first, second) => first.localeCompare(second, "en")));
    assert.equal(cretaceous.toMa, 66);
    assert.ok(cretaceous.fromMa > cretaceous.toMa);

    for (const epoch of cretaceous.epochs)
    {
        assert.ok(epoch.name.endsWith("Cretaceous"));
    }
});

test("an age caption links its stages and its epoch's period", () =>
{
    const parts = listAgeCaptionParts({ name: ["Late Cretaceous"], stage: ["Campanian", "Maastrichtian"] }, pages);
    const text = parts.map((part) => part.text).join("");

    assert.equal(text, "Campanian–Maastrichtian, Late Cretaceous");
    assert.deepEqual(
        parts.filter((part) => part.section).map((part) => part.section + ":" + part.slug),
        ["stage:campanian", "stage:maastrichtian", "period:cretaceous"],
    );
});

test("an age caption leaves names without a page unlinked", () =>
{
    const parts = listAgeCaptionParts({ name: ["Early Permian"], stage: ["Asselian"] }, pages);

    assert.equal(parts.map((part) => part.text).join(""), "Asselian, Early Permian");
    assert.ok(parts.every((part) => part.section === undefined));
});
