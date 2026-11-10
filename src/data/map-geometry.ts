import type { MapPolygon, MapPosition } from "./map-shapes.ts";

// Outline simplification, shared by scripts/create-map-shapes.ts, which simplifies Natural
// Earth's outlines for the genus maps, and the Map page, which simplifies them further for a view
// of the whole world.

/**
 * Measure how far a point lies from the line through two others.
 *
 * @param point - The point.
 * @param start - One end of the line.
 * @param end - The other end.
 * @returns The distance, in degrees.
 */
function measureDistanceFromLine(point: MapPosition, start: MapPosition, end: MapPosition): number
{
    const deltaX = end[0] - start[0];
    const deltaY = end[1] - start[1];
    const length = Math.hypot(deltaX, deltaY);

    if (length === 0)
    {
        return Math.hypot(point[0] - start[0], point[1] - start[1]);
    }

    return Math.abs(deltaY * point[0] - deltaX * point[1] + end[0] * start[1] - end[1] * start[0]) / length;
}

/**
 * Simplify a ring with the Douglas–Peucker algorithm: keep the points that lie farther than the
 * tolerance from the simplified line, and round what is kept.
 *
 * @param ring - The ring's points, first and last equal.
 * @param tolerance - The largest distance a dropped point may lie from the result, in degrees.
 * @param digits - The decimal places to round coordinates to.
 * @returns The simplified ring, or an empty array when too few points remain to enclose an area.
 */
export function simplifyRing(ring: Array<MapPosition>, tolerance: number, digits: number): Array<MapPosition>
{
    const isKept = new Array<boolean>(ring.length).fill(false);
    const spans: Array<Array<number>> = [[0, ring.length - 1]];

    isKept[0] = true;
    isKept[ring.length - 1] = true;

    while (spans.length > 0)
    {
        const [first, last] = spans.pop() as Array<number>;
        let farthest = -1;
        let farthestDistance = 0;

        for (let index = first + 1; index < last; index++)
        {
            const distance = measureDistanceFromLine(ring[index], ring[first], ring[last]);

            if (distance > farthestDistance)
            {
                farthest = index;
                farthestDistance = distance;
            }
        }

        if (farthest !== -1 && farthestDistance > tolerance)
        {
            isKept[farthest] = true;
            spans.push([first, farthest], [farthest, last]);
        }
    }

    const factor = 10 ** digits;
    const simplified = new Array<MapPosition>();

    for (let index = 0; index < ring.length; index++)
    {
        if (isKept[index])
        {
            simplified.push([Math.round(ring[index][0] * factor) / factor, Math.round(ring[index][1] * factor) / factor]);
        }
    }

    return simplified.length >= 4 ? simplified : [];
}

/**
 * Simplify polygons further, dropping rings too small to keep.
 *
 * @param polygons - The polygons.
 * @param tolerance - The largest distance a dropped point may lie from the result, in degrees.
 * @param digits - The decimal places to round coordinates to.
 * @returns The simplified polygons; a polygon whose outer ring vanishes is dropped.
 */
export function simplifyPolygons(polygons: Array<MapPolygon>, tolerance: number, digits: number): Array<MapPolygon>
{
    const simplified = new Array<MapPolygon>();

    for (const polygon of polygons)
    {
        const outer = simplifyRing(polygon[0], tolerance, digits);

        if (outer.length === 0)
        {
            continue;
        }

        const result: MapPolygon = [outer];

        for (const hole of polygon.slice(1))
        {
            const simplifiedHole = simplifyRing(hole, tolerance, digits);

            if (simplifiedHole.length > 0)
            {
                result.push(simplifiedHole);
            }
        }

        simplified.push(result);
    }

    return simplified;
}

/**
 * Measure a ring's area with the shoelace formula, in square degrees.
 *
 * @param ring - The ring.
 * @returns The area, positive whichever way the ring runs.
 */
export function measureRingArea(ring: Array<MapPosition>): number
{
    let doubledArea = 0;

    for (let index = 0; index < ring.length - 1; index++)
    {
        doubledArea += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
    }

    return Math.abs(doubledArea) / 2;
}

/**
 * Drop the polygons that are tiny next to the largest, such as the many small islands off a
 * country's coast, which only clutter an outline drawn as a coarse fallback.
 *
 * @param polygons - The polygons.
 * @param minimumShare - The smallest area to keep, as a share of the largest polygon's area.
 * @returns The polygons kept, in the same order.
 */
export function dropSmallPolygons(polygons: Array<MapPolygon>, minimumShare: number): Array<MapPolygon>
{
    let largestArea = 0;

    for (const polygon of polygons)
    {
        largestArea = Math.max(largestArea, measureRingArea(polygon[0]));
    }

    const kept = new Array<MapPolygon>();

    for (const polygon of polygons)
    {
        if (measureRingArea(polygon[0]) >= largestArea * minimumShare)
        {
            kept.push(polygon);
        }
    }

    return kept;
}

/**
 * Measure the diagonal of the box around some polygons, in degrees, as a gauge of their size.
 *
 * @param polygons - The polygons.
 * @returns The diagonal.
 */
export function measureExtent(polygons: Array<MapPolygon>): number
{
    let west = Number.POSITIVE_INFINITY;
    let east = Number.NEGATIVE_INFINITY;
    let south = Number.POSITIVE_INFINITY;
    let north = Number.NEGATIVE_INFINITY;

    for (const polygon of polygons)
    {
        for (const [longitude, latitude] of polygon[0])
        {
            west = Math.min(west, longitude);
            east = Math.max(east, longitude);
            south = Math.min(south, latitude);
            north = Math.max(north, latitude);
        }
    }

    return Math.hypot(east - west, north - south);
}
