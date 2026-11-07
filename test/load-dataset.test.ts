import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { compareSchemaVersions, parseSemanticVersion, readDataset } from "../src/data/load-dataset.ts";
import { findDatasetDirectory, listDatasetDirectoryCandidates } from "../src/data/locate-dataset.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const fixtureDirectory = path.join(testDirectory, "fixtures");

test("parseSemanticVersion splits a version into numbers", () =>
{
    assert.deepEqual(parseSemanticVersion("3.2.0"), { major: 3, minor: 2, patch: 0 });
    assert.deepEqual(parseSemanticVersion("10.0.12"), { major: 10, minor: 0, patch: 12 });
});

test("parseSemanticVersion rejects anything else", () =>
{
    assert.throws(() => parseSemanticVersion("3.2"));
    assert.throws(() => parseSemanticVersion("2026.11"));
    assert.throws(() => parseSemanticVersion("v3.2.0"));
});

test("compareSchemaVersions classifies versions against the supported one", () =>
{
    assert.equal(compareSchemaVersions("3.2.0", "3.2.0"), "same");
    assert.equal(compareSchemaVersions("3.2.5", "3.2.0"), "same");
    assert.equal(compareSchemaVersions("3.3.0", "3.2.0"), "newer-minor");
    assert.equal(compareSchemaVersions("3.1.0", "3.2.0"), "older-minor");
    assert.equal(compareSchemaVersions("4.0.0", "3.2.0"), "incompatible");
    assert.equal(compareSchemaVersions("2.9.0", "3.2.0"), "incompatible");
});

test("readDataset reads a dataset with a supported schema", () =>
{
    const dataset = readDataset(fixtureDirectory, "3.3.0");

    assert.equal(dataset._metadata.schema_version, "3.3.0");
    assert.ok(dataset.genera.Tyrannosaurus);
});

test("readDataset refuses a different major schema version", () =>
{
    assert.throws(() => readDataset(fixtureDirectory, "4.0.0"), /breaking change/);
});

test("the override directory is searched first", () =>
{
    const candidates = listDatasetDirectoryCandidates("/repository/web", "/elsewhere/dist");

    assert.deepEqual(candidates, ["/elsewhere/dist", "/repository/web/data/dist", "/repository/data/dist"]);
});

test("findDatasetDirectory returns the first directory holding the dataset", () =>
{
    assert.equal(findDatasetDirectory("/nonexistent", fixtureDirectory), fixtureDirectory);
});

test("findDatasetDirectory lists where it looked when nothing is found", () =>
{
    assert.throws(() => findDatasetDirectory("/nonexistent/web", undefined), /\/nonexistent\/web\/data\/dist/);
});
