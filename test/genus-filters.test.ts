import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { GenusFilterCriteria, GenusFilterValues } from "../src/data/genus-filters.ts";
import {
    createEmptyCriteria,
    createFilterAttributes,
    createFilterQuery,
    hasActiveFilter,
    matchesGenusFilters,
    parseYear,
    readFilterAttributes,
    readFilterCriteria,
} from "../src/data/genus-filters.ts";

/**
 * Turn data attribute names into the keys of an element's dataset: "data-time" becomes "time".
 *
 * @param attributes - The attributes.
 * @returns The dataset.
 */
function createDataset(attributes: Record<string, string>): Record<string, string>
{
    const dataset: Record<string, string> = {};

    for (const [name, value] of Object.entries(attributes))
    {
        dataset[name.replace(/^data-/, "")] = value;
    }

    return dataset;
}

/**
 * Create criteria with only an earliest year.
 *
 * @param fromYear - The earliest year.
 * @returns The criteria.
 */
function createFilterCriteriaFrom(fromYear: number): GenusFilterCriteria
{
    const criteria = createEmptyCriteria();

    criteria.fromYear = fromYear;

    return criteria;
}

const allosaurus: GenusFilterValues = {
    time: ["jurassic", "late-jurassic"],
    group: "theropoda",
    diet: "carnivore",
    locomotion: "bipedal",
    integument: "scaled",
    status: "valid",
    year: 1877,
};

test("filter values survive the round trip through data attributes", () =>
{
    assert.deepEqual(readFilterAttributes(createDataset(createFilterAttributes(allosaurus))), allosaurus);
});

test("a missing value reads back as empty, and a missing year as undefined", () =>
{
    const values = readFilterAttributes(createDataset(createFilterAttributes({ ...allosaurus, time: [], diet: "", year: undefined })));

    assert.deepEqual(values.time, []);
    assert.equal(values.diet, "");
    assert.equal(values.year, undefined);
});

test("no filters match every genus", () =>
{
    const criteria = createEmptyCriteria();

    assert.equal(hasActiveFilter(criteria), false);
    assert.ok(matchesGenusFilters(allosaurus, criteria, undefined));
});

test("the time filter matches a period or any of its epochs", () =>
{
    const criteria = createEmptyCriteria();

    criteria.time = "jurassic";
    assert.ok(matchesGenusFilters(allosaurus, criteria, undefined));
    criteria.time = "late-jurassic";
    assert.ok(matchesGenusFilters(allosaurus, criteria, undefined));
    criteria.time = "middle-jurassic";
    assert.equal(matchesGenusFilters(allosaurus, criteria, undefined), false);
});

test("every filter must match, unless it is the one left out", () =>
{
    const criteria = createEmptyCriteria();

    criteria.group = "theropoda";
    criteria.diet = "herbivore";
    assert.equal(matchesGenusFilters(allosaurus, criteria, undefined), false);
    assert.ok(matchesGenusFilters(allosaurus, criteria, "diet"));
});

test("the year range is inclusive and excludes genera without a year", () =>
{
    const criteria = createEmptyCriteria();

    criteria.fromYear = 1877;
    criteria.toYear = 1877;
    assert.ok(matchesGenusFilters(allosaurus, criteria, undefined));
    criteria.fromYear = 1878;
    assert.equal(matchesGenusFilters(allosaurus, criteria, undefined), false);
    assert.equal(matchesGenusFilters({ ...allosaurus, year: undefined }, createFilterCriteriaFrom(1800), undefined), false);
});

test("the page address carries only the filters that are on, and reads back the same", () =>
{
    const criteria = createEmptyCriteria();

    criteria.time = "late-cretaceous";
    criteria.diet = "carnivore";
    criteria.fromYear = 2000;

    const query = createFilterQuery(criteria);

    assert.equal(query.toString(), "time=late-cretaceous&diet=carnivore&from=2000");
    assert.deepEqual(readFilterCriteria(query), criteria);
});

test("parseYear accepts whole numbers only", () =>
{
    assert.equal(parseYear("1905"), 1905);
    assert.equal(parseYear(" 2020 "), 2020);
    assert.equal(parseYear(""), undefined);
    assert.equal(parseYear("19o5"), undefined);
    assert.equal(parseYear("-5"), undefined);
    assert.equal(parseYear(null), undefined);
});
