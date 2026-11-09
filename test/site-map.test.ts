import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { createGeologicTimeline } from "../src/data/age-figure.ts";
import { createGenusIndexRows } from "../src/data/genus-index.ts";
import { getMapShapes } from "../src/data/genus-map.ts";
import { readDataset } from "../src/data/load-dataset.ts";
import type { MapShapes } from "../src/data/map-shapes.ts";
import { createSiteData } from "../src/data/site-data.ts";
import { createSiteMapData, groupGeneraByPlace, listPlaceIndexRows } from "../src/data/site-map.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.3.0");
const siteData = createSiteData(dataset);

assert.ok(dataset.timescale, "the fixture should carry the timescale");

const timeline = createGeologicTimeline(dataset.timescale);
const shapes = getMapShapes();
const data = createSiteMapData(siteData, timeline, shapes);

test("every located genus is counted in its type species' region, or its country", () =>
{
    const placeKeys = new Map<string, string>();

    for (const genus of data.genera)
    {
        placeKeys.set(genus.name, genus.placeKey);
    }

    assert.equal(data.genera.length, siteData.genera.length, "every fixture genus has a place");
    assert.equal(placeKeys.get("Tyrannosaurus"), "US-MT");
    assert.equal(placeKeys.get("Antarctopelta"), "AQ", "a genus known only to its country");
});

test("each place appears once, with a name and an outline", () =>
{
    const keys = new Set<string>();

    for (const place of data.places)
    {
        assert.ok(!keys.has(place.key), place.key);
        assert.ok(place.polygons.length > 0, place.key);
        keys.add(place.key);
    }

    const montana = data.places.find((place) => place.key === "US-MT");

    assert.equal(montana?.name, "Montana, United States");
    assert.equal(montana?.kind, "region");
});

test("a genus with coordinates keeps them, in longitude and latitude order", () =>
{
    const abditosaurus = data.genera.find((genus) => genus.name === "Abditosaurus");

    assert.deepEqual(abditosaurus?.position, [0.972953, 42.159484]);
    assert.equal(data.genera.find((genus) => genus.name === "Tyrannosaurus")?.position, null);
});

test("a region without an outline is counted in its country", () =>
{
    const withoutMontana: MapShapes = { ...shapes, regions: { ...shapes.regions, "US-MT": [] }, countries: { ...shapes.countries } };

    delete withoutMontana.regions["US-MT"];

    const tyrannosaurus = createSiteMapData(siteData, timeline, withoutMontana).genera.find((genus) => genus.name === "Tyrannosaurus");

    assert.equal(tyrannosaurus?.placeKey, "US");
});

test("the place index groups genera by country and region, sorted, with every genus once", () =>
{
    const countries = groupGeneraByPlace(createGenusIndexRows(siteData.genera, siteData, timeline, "place"));
    const names = new Array<string>();

    for (const country of countries)
    {
        names.push(country.name);
    }

    assert.deepEqual(names, [...names].sort((first, second) => first.localeCompare(second, "en")));

    const unitedStates = countries.find((country) => country.name === "United States");
    const montana = unitedStates?.regions.find((region) => region.name === "Montana");

    assert.ok(montana && montana.rows.some((row) => row.entry.name === "Tyrannosaurus"));
    assert.equal(listPlaceIndexRows(countries).length, siteData.genera.length);
    assert.equal(countries.find((country) => country.name === "Antarctica")?.regions[0].name, "Region not recorded");
});
