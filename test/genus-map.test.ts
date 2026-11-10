import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import type { Genus } from "../src/data/dataset.ts";
import {
    abbreviateSpeciesName,
    createGenusMap,
    createGenusMapFeatures,
    createOutlineLines,
    findLabelPosition,
    findLongitudeBand,
    findMissingOutline,
    getMapShapes,
} from "../src/data/genus-map.ts";
import { readDataset } from "../src/data/load-dataset.ts";
import type { MapPolygon, MapPosition, MapShapes } from "../src/data/map-shapes.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.3.0");
const shapes = getMapShapes();

/**
 * Get a genus record the fixture is known to contain.
 *
 * @param name - The genus name.
 * @returns The record.
 */
function getGenus(name: string): Genus
{
    const genus = dataset.genera[name];

    assert.ok(genus, name + " should be in the fixture");

    return genus;
}

test("a species with published coordinates is a point, in longitude and latitude order", () =>
{
    const map = createGenusMap(getGenus("Abditosaurus"), shapes);

    assert.ok(map);
    assert.equal(map.places[0].precision, "point");
    assert.deepEqual(map.places[0].position, [0.972953, 42.159484]);
    assert.equal(map.places[0].precisionNote, "published coordinates");
    assert.deepEqual(map.bounds, [[0.972953, 42.159484], [0.972953, 42.159484]]);
});

test("a species known to its region shades the region's outline", () =>
{
    const map = createGenusMap(getGenus("Tyrannosaurus"), shapes);

    assert.ok(map);
    assert.equal(map.places[0].precision, "region");
    assert.equal(map.places[0].polygons, shapes.regions["US-MT"]);
    assert.equal(map.places[0].description, "Hell Creek Formation, Montana, United States");
    assert.ok(map.bounds[0][0] < -110 && map.bounds[1][0] > -105, "the bounds span Montana");
});

test("a species known only to its country shades the country, within the latitudes a map shows", () =>
{
    const map = createGenusMap(getGenus("Antarctopelta"), shapes);

    assert.ok(map);
    assert.equal(map.places[0].precision, "country");
    assert.equal(map.places[0].precisionNote, "country shaded; no region recorded");
    assert.ok(map.bounds[0][1] >= -78, "the bounds stop short of the pole");
});

test("a region without an outline falls back to its country, and only unexpected ones warn", () =>
{
    const genus = getGenus("Tyrannosaurus");
    const location = genus.species[0].location;
    const withoutMontana: MapShapes = { ...shapes, regions: {}, countries: { US: shapes.regions["US-MT"] }, regionsWithoutOutline: [] };

    assert.ok(location);

    const map = createGenusMap(genus, withoutMontana);

    assert.ok(map);
    assert.equal(map.places[0].precision, "country");
    assert.equal(map.places[0].precisionNote, "country shaded; no outline for its region");
    assert.match(findMissingOutline(location, withoutMontana), /US-MT/);
    assert.equal(findMissingOutline(location, { ...withoutMontana, regionsWithoutOutline: ["US-MT"] }), "");
    assert.equal(findMissingOutline(location, shapes), "");
});

test("species found at the same place share one mark, labeled with both names", () =>
{
    const map = createGenusMap(getGenus("Daspletosaurus"), shapes);

    assert.ok(map);
    assert.equal(map.places[0].isTypeSpecies, true);
    assert.equal(map.places.length, getGenus("Daspletosaurus").species.length);

    const labels = new Array<string>();
    let areaCount = 0;

    for (const feature of createGenusMapFeatures(map).features)
    {
        if (feature.properties.kind === "label")
        {
            labels.push(feature.properties.label);
        }
        else if (feature.properties.kind === "area")
        {
            areaCount++;
        }
    }

    assert.equal(areaCount, 2, "Alberta, and Montana once for two species");
    assert.deepEqual(labels, ["D. torosus", "D. horneri, D. wilsoni"]);
});

test("areas come before points and labels in the map's features, so those draw on top", () =>
{
    const map = createGenusMap(getGenus("Daspletosaurus"), shapes);

    assert.ok(map);

    let hasSeenMark = false;

    for (const feature of createGenusMapFeatures(map).features)
    {
        hasSeenMark ||= feature.properties.kind !== "area";
        assert.ok(!(hasSeenMark && feature.properties.kind === "area"), "no area after a point or label");
    }
});

test("abbreviateSpeciesName shortens the genus to its initial", () =>
{
    assert.equal(abbreviateSpeciesName("Psittacosaurus mongoliensis"), "P. mongoliensis");
    assert.equal(abbreviateSpeciesName("Tyrannosaurus"), "Tyrannosaurus");
});

/**
 * Report whether a point lies inside a ring, by counting how often a line from it crosses the
 * ring's edges.
 *
 * @param point - The point.
 * @param ring - The ring.
 * @returns True when the point is inside.
 */
function isInsideRing(point: MapPosition, ring: Array<MapPosition>): boolean
{
    let isInside = false;

    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++)
    {
        const [longitude, latitude] = ring[index];
        const [previousLongitude, previousLatitude] = ring[previous];

        if ((latitude > point[1]) !== (previousLatitude > point[1])
            && point[0] < (previousLongitude - longitude) * (point[1] - latitude) / (previousLatitude - latitude) + longitude)
        {
            isInside = !isInside;
        }
    }

    return isInside;
}

test("a region's label sits inside its outline, even where the centroid would not", () =>
{
    const crescent: Array<MapPolygon> = [[[[0, 0], [10, 0], [10, 10], [0, 10], [0, 8], [8, 8], [8, 2], [0, 2], [0, 0]]]];

    assert.ok(isInsideRing(findLabelPosition(crescent), crescent[0][0]), "inside the C shape");

    for (const code of Object.keys(shapes.regions))
    {
        const polygons = shapes.regions[code];
        const position = findLabelPosition(polygons);
        let isInside = false;

        for (const polygon of polygons)
        {
            isInside ||= isInsideRing(position, polygon[0]);
        }

        assert.ok(isInside, code);
    }
});

test("every region the fixture uses has an outline or is listed as lacking one", () =>
{
    for (const genus of Object.values(dataset.genera))
    {
        for (const species of genus.species)
        {
            assert.equal(species.location ? findMissingOutline(species.location, shapes) : "", "", species.name);
        }
    }
});

test("a longitude band can cross the 180° meridian instead of spanning the world", () =>
{
    assert.deepEqual(findLongitudeBand([-10, 5, 20]), [-10, 20]);
    assert.deepEqual(findLongitudeBand([172, 179, -179, -140]), [172, 220], "Alaska's Aleutians to its east");
    assert.deepEqual(findLongitudeBand([42]), [42, 42]);
});

test("a map reaching toward a pole is drawn on a globe; others stay flat", () =>
{
    const antarctopelta = createGenusMap(getGenus("Antarctopelta"), shapes);
    const tyrannosaurus = createGenusMap(getGenus("Tyrannosaurus"), shapes);

    assert.equal(antarctopelta?.projection, "globe");
    assert.equal(antarctopelta?.isWide, true, "Antarctica spans every longitude");
    assert.equal(antarctopelta?.center[1], -85, "it opens over the South Pole");
    assert.equal(tyrannosaurus?.projection, "mercator");
    assert.equal(tyrannosaurus?.isWide, false);
});

test("outline lines leave out edges along the 180° meridian and the 85° cut", () =>
{
    const lines = createOutlineLines([[[[170, -80], [180, -84], [180, -85], [-180, -85], [-180, -84], [-170, -80], [170, -80]]]]);

    assert.deepEqual(lines, [[[170, -80], [180, -84]], [[-180, -84], [-170, -80], [170, -80]]]);
});

test("no outline point lies beyond the 85° the map can show", () =>
{
    for (const table of [shapes.regions, shapes.countries])
    {
        for (const [code, polygons] of Object.entries(table))
        {
            for (const polygon of polygons)
            {
                for (const ring of polygon)
                {
                    for (const point of ring)
                    {
                        assert.ok(Math.abs(point[1]) <= 85, code);
                    }
                }
            }
        }
    }
});
