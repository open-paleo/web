import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { createGeologicTimeline } from "../src/data/age-figure.ts";
import {
    countGeneraByStage,
    describeRecentYears,
    findAxisMaximum,
    findRecentNames,
    groupStagesForAxis,
    listMajorGroups,
} from "../src/data/home.ts";
import { readDataset } from "../src/data/load-dataset.ts";
import { getTypeSpecies } from "../src/data/records.ts";
import { createSiteData } from "../src/data/site-data.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.4.0");
const siteData = createSiteData(dataset);

assert.ok(dataset.timescale, "the fixture should carry the timescale");

const timeline = createGeologicTimeline(dataset.timescale);

test("countGeneraByStage counts each genus once per stage of its type species", () =>
{
    const counts = countGeneraByStage(siteData, timeline);
    let total = 0;
    let expected = 0;

    for (const stage of counts)
    {
        total += stage.count;
    }

    for (const genus of siteData.genera)
    {
        expected += (getTypeSpecies(genus.record).period.stage ?? []).length;
    }

    assert.equal(total, expected);

    for (let index = 1; index < counts.length; index++)
    {
        assert.ok(counts[index - 1].fromMa > counts[index].fromMa, "stages run oldest first");
    }
});

test("countGeneraByStage trims empty stages at both ends", () =>
{
    const counts = countGeneraByStage(siteData, timeline);

    assert.ok(counts[0].count > 0);
    assert.ok(counts[counts.length - 1].count > 0);
    assert.equal(counts[counts.length - 1].name, "Maastrichtian");
    assert.equal(counts[counts.length - 1].colorToken, "--stage-maastrichtian");
});

test("groupStagesForAxis makes one span per run of a period", () =>
{
    const spans = groupStagesForAxis(countGeneraByStage(siteData, timeline), "period");
    const names = new Array<string>();
    let stageTotal = 0;

    for (const span of spans)
    {
        names.push(span.name);
        stageTotal += span.stageCount;
    }

    assert.deepEqual(names, [...new Set(names)], "no period appears twice");
    assert.equal(stageTotal, countGeneraByStage(siteData, timeline).length);
});

test("findRecentNames covers the newest year, reaching back until it has enough names", () =>
{
    const newestYear = Math.max(...siteData.genera.map((genus) => genus.record.described ?? 0));
    const oneYear = findRecentNames(siteData, 1);
    const all = findRecentNames(siteData, siteData.genera.length);

    assert.ok(oneYear && all);
    assert.equal(oneYear.toYear, newestYear);
    assert.equal(oneYear.fromYear, newestYear, "one name is enough within the newest year");

    for (const genus of oneYear.genera)
    {
        assert.equal(genus.record.described, newestYear);
    }

    assert.ok(all.fromYear < all.toYear, "asking for every genus reaches back over several years");
    assert.ok(all.genera.length >= siteData.genera.length - 1);

    for (let index = 1; index < all.genera.length; index++)
    {
        assert.ok((all.genera[index - 1].record.described ?? 0) >= (all.genera[index].record.described ?? 0), "newest year first");
    }
});

test("describeRecentYears names one, two or a range of years", () =>
{
    assert.equal(describeRecentYears({ fromYear: 2026, toYear: 2026, genera: [] }), "2026");
    assert.equal(describeRecentYears({ fromYear: 2026, toYear: 2027, genera: [] }), "2026 and 2027");
    assert.equal(describeRecentYears({ fromYear: 2024, toYear: 2027, genera: [] }), "2024 to 2027");
});

test("listMajorGroups keeps the groups the tree has, with a one-sentence summary", () =>
{
    const groups = listMajorGroups(siteData);

    assert.equal(groups[0].clade.name, "Theropoda");
    assert.ok(groups[0].summary.endsWith("."));
});

test("findAxisMaximum rounds up to a whole step above the largest count", () =>
{
    const stages = countGeneraByStage(siteData, timeline);

    assert.equal(findAxisMaximum([{ ...stages[0], count: 312 }], 100), 400);
    assert.equal(findAxisMaximum([{ ...stages[0], count: 300 }], 100), 400);
    assert.equal(findAxisMaximum([{ ...stages[0], count: 0 }], 100), 100);
});

test("groupStagesForAxis can group by epoch instead", () =>
{
    const spans = groupStagesForAxis(countGeneraByStage(siteData, timeline), "epoch");

    assert.ok(spans.length > 3, "more epochs than periods");
    assert.equal(spans[spans.length - 1].name, "Late Cretaceous");
});
