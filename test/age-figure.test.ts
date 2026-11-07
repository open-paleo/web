import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import type { AgeRow, GeologicTimeline } from "../src/data/age-figure.ts";
import { createAgeFigureModel, createGeologicTimeline, getPeriodName } from "../src/data/age-figure.ts";
import { readDataset } from "../src/data/load-dataset.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.3.0");

/**
 * Get the fixture's timeline, which the fixture is known to carry.
 *
 * @returns The timeline.
 */
function getTimeline(): GeologicTimeline
{
    assert.ok(dataset.timescale, "the fixture should carry the timescale");

    return createGeologicTimeline(dataset.timescale);
}

/**
 * List the band names of a row.
 *
 * @param row - The row.
 * @returns The names, left to right.
 */
function listBandNames(row: AgeRow): Array<string>
{
    const names = new Array<string>();

    for (const band of row.bands)
    {
        names.push(band.name);
    }

    return names;
}

/**
 * Add up the band widths of a row.
 *
 * @param row - The row.
 * @returns The total width in percent.
 */
function sumBandWidths(row: AgeRow): number
{
    let total = 0;

    for (const band of row.bands)
    {
        total += band.widthPercent;
    }

    return total;
}

test("getPeriodName strips the epoch prefix", () =>
{
    assert.equal(getPeriodName("Late Cretaceous"), "Cretaceous");
    assert.equal(getPeriodName("Middle Jurassic"), "Jurassic");
    assert.equal(getPeriodName("Paleocene"), "Paleocene");
});

test("the timeline orders periods, epochs and stages oldest first", () =>
{
    const timeline = getTimeline();
    const lateCretaceous = timeline.epochs.find((epoch) => epoch.name === "Late Cretaceous");

    assert.ok(lateCretaceous);
    assert.equal(lateCretaceous.stages[0].name, "Cenomanian");
    assert.equal(lateCretaceous.stages[lateCretaceous.stages.length - 1].name, "Maastrichtian");
    assert.equal(lateCretaceous.toMa, 66);

    for (let index = 1; index < timeline.periods.length; index++)
    {
        assert.ok(timeline.periods[index - 1].fromMa > timeline.periods[index].fromMa);
    }
});

test("periods span their stages", () =>
{
    const timeline = getTimeline();
    const cretaceous = timeline.periods.find((period) => period.name === "Cretaceous");

    assert.ok(cretaceous);
    assert.equal(cretaceous.fromMa, dataset.timescale?.stages.Berriasian.from_ma);
    assert.equal(cretaceous.toMa, 66);
});

test("a Maastrichtian record gets the Mesozoic periods and the Late Cretaceous stages", () =>
{
    const model = createAgeFigureModel({ from_ma: 72.2, to_ma: 66 }, getTimeline());

    assert.ok(model);
    assert.deepEqual(listBandNames(model.periodRow), ["Triassic", "Jurassic", "Cretaceous"]);
    assert.equal(model.stageRow.label, "Late Cretaceous stages");
    assert.equal(model.stageRow.bands[model.stageRow.bands.length - 1].name, "Maastrichtian");
    assert.equal(model.stageRow.bands[model.stageRow.bands.length - 1].colorToken, "--stage-maastrichtian");
    assert.equal(model.periodRow.bands[0].colorToken, "--period-triassic");
    assert.equal(model.periodRow.bands[0].hasDarkColor, true);
});

test("band widths fill the row and the marker sits at the young end", () =>
{
    const model = createAgeFigureModel({ from_ma: 72.2, to_ma: 66 }, getTimeline());

    assert.ok(model);
    assert.ok(Math.abs(sumBandWidths(model.periodRow) - 100) < 1e-9);
    assert.ok(Math.abs(sumBandWidths(model.stageRow) - 100) < 1e-9);
    assert.ok(Math.abs(model.stageRow.marker.leftPercent + model.stageRow.marker.widthPercent - 100) < 1e-9);
    assert.ok(model.stageRow.marker.widthPercent > model.periodRow.marker.widthPercent);
});

test("a range across two epochs shows the stages of both", () =>
{
    const model = createAgeFigureModel({ from_ma: 152, to_ma: 140 }, getTimeline());

    assert.ok(model);
    assert.equal(model.stageRow.label, "Late Jurassic and Early Cretaceous stages");
    assert.ok(listBandNames(model.stageRow).includes("Tithonian"));
    assert.ok(listBandNames(model.stageRow).includes("Berriasian"));
});

test("a record without a numeric age gets no figure", () =>
{
    assert.equal(createAgeFigureModel({ name: ["Late Cretaceous"] }, getTimeline()), undefined);
});

test("the marker and the time either side of it fill the row", () =>
{
    const model = createAgeFigureModel({ from_ma: 154.8, to_ma: 143.1 }, getTimeline());

    assert.ok(model);

    for (const row of [model.periodRow, model.stageRow])
    {
        const total = row.marker.leftPercent + row.marker.widthPercent + row.marker.remainingPercent;

        assert.ok(Math.abs(total - 100) < 1e-9, row.label);
    }
});
