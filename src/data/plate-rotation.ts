import * as fs from "node:fs";
import * as path from "node:path";

// Rotates a present-day position back to a past age with a GPlates rotation file, as GPlates
// does: each plate's rotation is interpolated between the file's listed ages, then chained
// through its parent plates down to plate 0.
//
// plate-models/wright-2013.rot is the published rotation file of Wright et al. (2013), the
// model behind the dataset's paleocoordinates (CC BY 3.0 AU).

/**
 * A rotation as a unit quaternion: [w, x, y, z].
 */
export type Quaternion = [number, number, number, number];

/**
 * A plate's finite rotation relative to another plate at one age.
 */
type RotationPole = {
    /**
     * The age, in millions of years.
     */
    time: number;

    /**
     * The rotation from the plate's present position to its position at that age, relative to
     * the fixed plate.
     */
    rotation: Quaternion;

    /**
     * The plate the rotation is relative to.
     */
    fixedPlateId: number;
};

/**
 * A rotation model: each plate's poles, by plate, in age order.
 */
export type RotationModel = Map<number, Array<RotationPole>>;

/**
 * A position: longitude, then latitude, in degrees.
 */
export type PlatePosition = [number, number];

// Plate ids GPlates reserves for comments.
const commentPlateId = 999;

// The longest chain of parent plates to follow; a longer one means the file has a loop.
const maximumChainLength = 50;

// Relative to the project root: during the build, this module runs from Astro's bundle.
const rotationFilePath = path.join(process.cwd(), "src", "data", "plate-models", "wright-2013.rot");

let wright2013Model: RotationModel | undefined;

/**
 * Turn an Euler pole into a quaternion.
 *
 * @param latitude - The pole's latitude, in degrees.
 * @param longitude - The pole's longitude, in degrees.
 * @param angle - The rotation about it, in degrees, counterclockwise looking down on the pole.
 * @returns The rotation.
 */
function createPoleRotation(latitude: number, longitude: number, angle: number): Quaternion
{
    const latitudeRadians = latitude * Math.PI / 180;
    const longitudeRadians = longitude * Math.PI / 180;
    const half = angle * Math.PI / 360;
    const sine = Math.sin(half);

    return [
        Math.cos(half),
        Math.cos(latitudeRadians) * Math.cos(longitudeRadians) * sine,
        Math.cos(latitudeRadians) * Math.sin(longitudeRadians) * sine,
        Math.sin(latitudeRadians) * sine,
    ];
}

/**
 * Compose two rotations: the second, then the first.
 *
 * @param first - The rotation applied last.
 * @param second - The rotation applied first.
 * @returns The combined rotation.
 */
function multiplyRotations(first: Quaternion, second: Quaternion): Quaternion
{
    const [w1, x1, y1, z1] = first;
    const [w2, x2, y2, z2] = second;

    return [
        w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
        w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
        w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
        w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    ];
}

/**
 * Interpolate between two rotations along the shortest path (spherical linear interpolation).
 *
 * @param from - The rotation at the start.
 * @param to - The rotation at the end.
 * @param fraction - How far along, from 0 to 1.
 * @returns The interpolated rotation.
 */
function interpolateRotations(from: Quaternion, to: Quaternion, fraction: number): Quaternion
{
    let dot = from[0] * to[0] + from[1] * to[1] + from[2] * to[2] + from[3] * to[3];
    let target = to;

    // A quaternion and its negative are the same rotation; take the shorter way round.
    if (dot < 0)
    {
        dot = -dot;
        target = [-to[0], -to[1], -to[2], -to[3]];
    }

    if (dot > 0.9999999)
    {
        return from;
    }

    const angle = Math.acos(dot);
    const fromWeight = Math.sin((1 - fraction) * angle) / Math.sin(angle);
    const toWeight = Math.sin(fraction * angle) / Math.sin(angle);

    return [
        fromWeight * from[0] + toWeight * target[0],
        fromWeight * from[1] + toWeight * target[1],
        fromWeight * from[2] + toWeight * target[2],
        fromWeight * from[3] + toWeight * target[3],
    ];
}

/**
 * Read a GPlates rotation file: lines of moving plate, age, pole latitude, pole longitude, angle
 * and fixed plate, each optionally followed by "!" and a comment.
 *
 * @param text - The file's text.
 * @returns The model.
 */
export function parseRotationFile(text: string): RotationModel
{
    const model: RotationModel = new Map();

    for (const line of text.split(/\r?\n/))
    {
        const fields = line.split("!")[0].trim().split(/\s+/);

        if (fields.length < 6)
        {
            continue;
        }

        const movingPlateId = Number(fields[0]);
        const [time, latitude, longitude, angle] = [Number(fields[1]), Number(fields[2]), Number(fields[3]), Number(fields[4])];
        const fixedPlateId = Number(fields[5]);

        if (movingPlateId === commentPlateId || Number.isNaN(time + latitude + longitude + angle))
        {
            continue;
        }

        if (!model.has(movingPlateId))
        {
            model.set(movingPlateId, []);
        }

        model.get(movingPlateId)?.push({ time, rotation: createPoleRotation(latitude, longitude, angle), fixedPlateId });
    }

    return model;
}

/**
 * Get the rotation model of Wright et al. (2013), read once from the committed rotation file.
 *
 * @returns The model.
 */
export function getWright2013Model(): RotationModel
{
    wright2013Model ??= parseRotationFile(fs.readFileSync(rotationFilePath, "utf8"));

    return wright2013Model;
}

/**
 * Get a plate's rotation relative to its fixed plate at an age, interpolated between the two
 * poles around it, which must share a fixed plate (a plate can switch at a crossover age).
 *
 * @param poles - The plate's poles, in file order.
 * @param time - The age, in millions of years.
 * @returns The rotation and the fixed plate, or undefined if the plate has no pole pair spanning
 * the age.
 */
function findRelativeRotation(poles: Array<RotationPole>, time: number): [Quaternion, number] | undefined
{
    for (let index = 0; index < poles.length - 1; index++)
    {
        const earlier = poles[index];
        const later = poles[index + 1];

        if (earlier.fixedPlateId !== later.fixedPlateId || time < earlier.time || time > later.time)
        {
            continue;
        }

        const span = later.time - earlier.time;
        const fraction = span === 0 ? 0 : (time - earlier.time) / span;

        return [interpolateRotations(earlier.rotation, later.rotation, fraction), earlier.fixedPlateId];
    }

    return undefined;
}

/**
 * Get a plate's rotation relative to the globe (plate 0) at an age: its rotation relative to its
 * fixed plate, followed by that plate's own, down the chain.
 *
 * @param model - The rotation model.
 * @param plateId - The plate.
 * @param time - The age, in millions of years.
 * @returns The rotation, or undefined if a plate in the chain has no rotation at that age.
 */
export function getPlateRotation(model: RotationModel, plateId: number, time: number): Quaternion | undefined
{
    let rotation: Quaternion = [1, 0, 0, 0];
    let current = plateId;

    for (let step = 0; step < maximumChainLength; step++)
    {
        if (current === 0)
        {
            return rotation;
        }

        const relative = findRelativeRotation(model.get(current) ?? [], time);

        if (!relative)
        {
            return undefined;
        }

        rotation = multiplyRotations(relative[0], rotation);
        current = relative[1];
    }

    return undefined;
}

/**
 * Rotate a present-day position on a plate to where it was at an age.
 *
 * @param model - The rotation model.
 * @param position - The present-day position: longitude, then latitude.
 * @param plateId - The plate it is on.
 * @param time - The age, in millions of years.
 * @returns The position at that age, or undefined if the model cannot place the plate then.
 */
export function reconstructPosition(model: RotationModel, position: PlatePosition, plateId: number, time: number): PlatePosition | undefined
{
    const rotation = getPlateRotation(model, plateId, time);

    if (!rotation)
    {
        return undefined;
    }

    const longitude = position[0] * Math.PI / 180;
    const latitude = position[1] * Math.PI / 180;
    const point: Quaternion = [0, Math.cos(latitude) * Math.cos(longitude), Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude)];
    const conjugate: Quaternion = [rotation[0], -rotation[1], -rotation[2], -rotation[3]];
    const [, x, y, z] = multiplyRotations(multiplyRotations(rotation, point), conjugate);

    return [Math.atan2(y, x) * 180 / Math.PI, Math.asin(Math.max(-1, Math.min(1, z))) * 180 / Math.PI];
}
