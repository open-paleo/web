import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { GeologicTimeline } from "../src/data/age-figure.ts";
import { findStageForAge, getStageMidpoint } from "../src/data/paleo-positions.ts";
import type { PlatePosition } from "../src/data/plate-rotation.ts";
import { getWright2013Model, parseRotationFile, reconstructPosition } from "../src/data/plate-rotation.ts";

/**
 * A reconstruction the dataset's build made with pyGPlates and the same rotation file: a species'
 * present-day position, its plate, the age, and its position then.
 */
type ReferenceReconstruction = [string, PlatePosition, number, number, PlatePosition];

// From the dataset's paleocoordinates (schema 3.5.0), one species on each of five plates.
const references: Array<ReferenceReconstruction> = [
    ["Aardonyx celestae", [26.8665, -28.6057], 701, 197.15, [15.0006, -42.8962]],
    ["Tyrannosaurus rex", [-109.638, 47.0318], 101, 69.1, [-68.069, 58.7865]],
    ["Balaur bondoc", [23.4825, 46.1659], 308, 69.1, [29.689, 25.3504]],
    ["Velociraptor mongoliensis", [104.1129, 43.2749], 628, 77.9, [99.6805, 38.5346]],
    ["Giganotosaurus carolinii", [-70.1225, -38.6432], 291, 97.2, [-34.9709, -37.4076]],
];

/**
 * Measure the angle between two positions, in degrees.
 *
 * @param first - One position.
 * @param second - The other.
 * @returns The angle.
 */
function measureAngle(first: PlatePosition, second: PlatePosition): number
{
    const radians = Math.PI / 180;
    const cosine = Math.sin(first[1] * radians) * Math.sin(second[1] * radians) + Math.cos(first[1] * radians) * Math.cos(second[1] * radians) * Math.cos((first[0] - second[0]) * radians);

    return Math.acos(Math.min(1, Math.max(-1, cosine))) / radians;
}

test("rotations match the dataset's pyGPlates reconstructions to within 0.001°", () =>
{
    const model = getWright2013Model();

    for (const [name, present, plateId, ageMa, expected] of references)
    {
        const result = reconstructPosition(model, present, plateId, ageMa);

        assert.ok(result, name);
        assert.ok(measureAngle(result, expected) < 0.001, name + " is " + measureAngle(result, expected).toFixed(5) + "° off");
    }
});

test("a position at age 0 stays where it is", () =>
{
    const result = reconstructPosition(getWright2013Model(), [-109.638, 47.0318], 101, 0);

    assert.ok(result);
    assert.ok(measureAngle(result, [-109.638, 47.0318]) < 1e-9);
});

test("a plate the model has no rotation for at an age cannot be placed", () =>
{
    const model = parseRotationFile("201 0.0 0.0 0.0 0.0 000 ! a plate\n201 100.0 10.0 20.0 30.0 000 ! a plate\n");

    assert.equal(reconstructPosition(model, [0, 0], 201, 150), undefined);
    assert.equal(reconstructPosition(model, [0, 0], 202, 50), undefined);
    assert.ok(reconstructPosition(model, [0, 0], 201, 50));
});

test("an age falls in the stage whose base is at or before it, and stage midpoints round to 0.1", () =>
{
    const timeline = {
        periods: [],
        chart: "",
        epochs: [{
            name: "Late Jurassic",
            fromMa: 161.5,
            toMa: 143.1,
            periodName: "Jurassic",
            stages: [
                { name: "Oxfordian", fromMa: 161.5, toMa: 154.8, colorToken: "" },
                { name: "Kimmeridgian", fromMa: 154.8, toMa: 149.2, colorToken: "" },
                { name: "Tithonian", fromMa: 149.2, toMa: 143.1, colorToken: "" },
            ],
            colorToken: "",
        }],
    } as unknown as GeologicTimeline;

    assert.equal(findStageForAge(timeline, 152)?.[0].name, "Kimmeridgian");
    assert.equal(findStageForAge(timeline, 154.8)?.[0].name, "Kimmeridgian");
    assert.equal(findStageForAge(timeline, 149.2)?.[0].name, "Tithonian");
    assert.equal(findStageForAge(timeline, 120), undefined);
    assert.equal(getStageMidpoint(154.8, 149.2), 152);
    assert.equal(getStageMidpoint(72.2, 66), 69.1);
});
