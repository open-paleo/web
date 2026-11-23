import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { GeologicTimeline } from "../src/data/age-figure.ts";
import { createGeologicTimeline } from "../src/data/age-figure.ts";
import type { PreviewBand } from "../src/data/preview-image.ts";
import { createPreviewTimeScale, describePreviewImage, getGenusPreviewImage } from "../src/data/preview-image.ts";
import { getTypeSpecies } from "../src/data/records.ts";
import { readFixture } from "./fixture.ts";

const dataset = readFixture();

/**
 * Create the fixture's geologic timeline.
 *
 * @returns The timeline.
 */
function createFixtureTimeline(): GeologicTimeline
{
    assert.ok(dataset.timescale, "the fixture should carry the timescale");

    return createGeologicTimeline(dataset.timescale);
}

/**
 * Add up the widths of a row of bands.
 *
 * @param bands - The bands.
 * @returns The total, in percent.
 */
function sumWidths(bands: Array<PreviewBand>): number
{
    let total = 0;

    for (const band of bands)
    {
        total += band.widthPercent;
    }

    return total;
}

const timeline = createFixtureTimeline();

test("createPreviewTimeScale spans the Triassic to the Cretaceous in both rows", () =>
{
    const scale = createPreviewTimeScale(getTypeSpecies(dataset.genera.Tyrannosaurus).period, timeline);

    assert.deepEqual(scale.periods.map((band) => band.name), ["Triassic", "Jurassic", "Cretaceous"]);
    assert.equal(scale.periods[0].colorToken, "--period-triassic");
    assert.equal(scale.periods[0].hasDarkColor, true);
    assert.equal(scale.stages[0].colorToken.startsWith("--stage-"), true);
    assert.ok(Math.abs(sumWidths(scale.periods) - 100) < 1e-9);
    assert.ok(Math.abs(sumWidths(scale.stages) - 100) < 1e-9);
});

test("createPreviewTimeScale marks the genus's age from the scale's older end", () =>
{
    const period = getTypeSpecies(dataset.genera.Tyrannosaurus).period;
    const scale = createPreviewTimeScale(period, timeline);
    const triassic = timeline.periods.find((unit) => unit.name === "Triassic");
    const cretaceous = timeline.periods.find((unit) => unit.name === "Cretaceous");

    assert.ok(scale.marker && triassic && cretaceous && period.from_ma !== undefined && period.to_ma !== undefined);

    const span = triassic.fromMa - cretaceous.toMa;

    assert.ok(Math.abs(scale.marker.leftPercent - (triassic.fromMa - period.from_ma) / span * 100) < 1e-9);
    assert.ok(Math.abs(scale.marker.widthPercent - (period.from_ma - period.to_ma) / span * 100) < 1e-9);
});

test("createPreviewTimeScale leaves out the marker when no numeric age is recorded", () =>
{
    assert.equal(createPreviewTimeScale(getTypeSpecies(dataset.genera.Apatodon).period, timeline).marker, undefined);
});

test("describePreviewImage names the genus, its age and its outline", () =>
{
    assert.equal(
        describePreviewImage("Tyrannosaurus", "72.2–66.0 million years ago", "Outline of a tyrannosaur"),
        "Tyrannosaurus, 72.2–66.0 million years ago, marked on the geologic time scale. Outline of a tyrannosaur.",
    );
    assert.equal(describePreviewImage("Apatodon", "", ""), "Apatodon.");
});

test("getGenusPreviewImage puts the image under preview/genus/ and describes it", () =>
{
    const image = getGenusPreviewImage(dataset.genera.Tyrannosaurus, "tyrannosaurus", "Outline of a tyrannosaur", "/");

    assert.equal(image.path, "/preview/genus/tyrannosaurus.png");
    assert.equal(image.description, "Tyrannosaurus, 72.2–66.0 million years ago, marked on the geologic time scale. Outline of a tyrannosaur.");
});
