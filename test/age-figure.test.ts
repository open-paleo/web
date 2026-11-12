import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import type { AgeRow, GeologicTimeline } from "../src/data/age-figure.ts";
import {
    createAgeFigureModel,
    createGeologicTimeline,
    findEpochAt,
    getPeriodName,
    hasDarkChartColor,
} from "../src/data/age-figure.ts";
import { createSlug } from "../src/data/slugs.ts";
import { readDataset } from "../src/data/load-dataset.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.4.0");

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
    assert.equal(getPeriodName("Paleocene"), "Paleogene");
    assert.equal(getPeriodName("Eocene"), "Paleogene");
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

    assert.ok(model?.stageRow);
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

    assert.ok(model?.stageRow);
    assert.ok(Math.abs(sumBandWidths(model.periodRow) - 100) < 1e-9);
    assert.ok(Math.abs(sumBandWidths(model.stageRow) - 100) < 1e-9);
    assert.ok(Math.abs(model.stageRow.marker.leftPercent + model.stageRow.marker.widthPercent - 100) < 1e-9);
    assert.ok(model.stageRow.marker.widthPercent > model.periodRow.marker.widthPercent);
});

test("a range across two epochs shows the stages of both", () =>
{
    const model = createAgeFigureModel({ from_ma: 152, to_ma: 140 }, getTimeline());

    assert.ok(model?.stageRow);
    assert.equal(model.stageRow.label, "Late Jurassic and Early Cretaceous stages");
    assert.ok(listBandNames(model.stageRow).includes("Tithonian"));
    assert.ok(listBandNames(model.stageRow).includes("Berriasian"));
});

test("a record without a numeric age gets no figure", () =>
{
    assert.equal(createAgeFigureModel({ name: ["Late Cretaceous"] }, getTimeline()), undefined);
});

test("a range across more than two epochs gets no stage row", () =>
{
    const model = createAgeFigureModel({ from_ma: 233, to_ma: 66 }, getTimeline());

    assert.ok(model);
    assert.equal(model.stageRow, undefined);
    assert.equal(model.periodRow.bands.length, 3);
});

test("findEpochAt puts a boundary on the side of the range it belongs to", () =>
{
    const timeline = getTimeline();

    assert.equal(findEpochAt(timeline, 70, "start")?.name, "Late Cretaceous");
    assert.equal(findEpochAt(timeline, 70, "end")?.name, "Late Cretaceous");
    assert.equal(findEpochAt(timeline, 66, "end")?.name, "Late Cretaceous");
    assert.equal(findEpochAt(timeline, 66, "start")?.name, "Paleocene");
    assert.equal(findEpochAt(timeline, 100.5, "start")?.name, "Late Cretaceous");
    assert.equal(findEpochAt(timeline, 100.5, "end")?.name, "Early Cretaceous");
    assert.equal(findEpochAt(timeline, 400, "start"), undefined);
});

/**
 * Read a color token's light value from the theme.
 *
 * @param tokens - The text of tokens.css.
 * @param name - Token name without the leading dashes.
 * @returns The hex color.
 */
function readToken(tokens: string, name: string): string
{
    const match = new RegExp("--" + name + ":\\s*(#[0-9a-f]{6})").exec(tokens);

    assert.ok(match, name + " should be defined in tokens.css");

    return match[1];
}

/**
 * Compute the relative luminance of a color, as WCAG defines it.
 *
 * @param hex - The color as #rrggbb.
 * @returns The luminance, 0 to 1.
 */
function computeLuminance(hex: string): number
{
    let luminance = 0;
    const weights = [0.2126, 0.7152, 0.0722];

    for (let index = 0; index < 3; index++)
    {
        const channel = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
        const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

        luminance += weights[index] * linear;
    }

    return luminance;
}

/**
 * Compute the WCAG contrast ratio of two colors.
 *
 * @param first - One color as #rrggbb.
 * @param second - The other color.
 * @returns The ratio, 1 to 21.
 */
function computeContrast(first: string, second: string): number
{
    const lighter = Math.max(computeLuminance(first), computeLuminance(second));
    const darker = Math.min(computeLuminance(first), computeLuminance(second));

    return (lighter + 0.05) / (darker + 0.05);
}

test("every age band label reaches 4.5:1 against its chart color", () =>
{
    const tokens = fs.readFileSync(path.join(testDirectory, "..", "src", "theme", "tokens.css"), "utf8");
    const darkText = readToken(tokens, "color-on-period");
    const lightText = readToken(tokens, "color-on-period-dark");
    const timeline = getTimeline();
    const bands = new Array<string>();

    for (const period of timeline.periods)
    {
        bands.push("period-" + createSlug(period.name) + "|" + period.name);
    }

    for (const epoch of timeline.epochs)
    {
        for (const stage of epoch.stages)
        {
            bands.push("stage-" + createSlug(stage.name) + "|" + stage.name);
        }
    }

    for (const band of bands)
    {
        const [token, name] = band.split("|");
        const background = readToken(tokens, token);
        const text = hasDarkChartColor(name) ? lightText : darkText;
        const contrast = computeContrast(text, background);

        assert.ok(contrast >= 4.5, name + " label contrast is " + contrast.toFixed(2) + ":1");
    }
});

test("bands the record's range overlaps are marked in range", () =>
{
    const model = createAgeFigureModel({ from_ma: 72.2, to_ma: 66 }, getTimeline());

    assert.ok(model?.stageRow);
    const inRange = new Array<string>();

    for (const band of [...model.periodRow.bands, ...model.stageRow.bands])
    {
        if (band.isInRange)
        {
            inRange.push(band.name);
        }
    }

    assert.deepEqual(inRange, ["Cretaceous", "Maastrichtian"]);
});

test("a marker starting on a band boundary is flagged, one starting inside a band or at the row start is not", () =>
{
    const timeline = getTimeline();
    const earlyJurassic = createAgeFigureModel({ from_ma: 201.4, to_ma: 192.9 }, timeline);
    const insideBands = createAgeFigureModel({ from_ma: 70, to_ma: 66 }, timeline);

    assert.ok(earlyJurassic?.stageRow);
    assert.equal(earlyJurassic.periodRow.marker.startsAtBandBoundary, true, "the Jurassic starts at 201.4 Ma");
    assert.equal(earlyJurassic.stageRow.marker.startsAtBandBoundary, false, "the stage row itself starts at 201.4 Ma");
    assert.ok(insideBands?.stageRow);
    assert.equal(insideBands.stageRow.marker.startsAtBandBoundary, false);
});
