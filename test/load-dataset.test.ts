import * as assert from "node:assert/strict";
import { test } from "node:test";

import { bindingsSchemaVersion } from "../src/data/bindings/schema-version.ts";
import { formatSpecimenName } from "../src/data/format.ts";
import { compareSchemaVersions, parseSemanticVersion, readDataset } from "../src/data/load-dataset.ts";
import { findDatasetDirectory, getDatasetDirectoryCandidates } from "../src/data/locate-dataset.ts";
import { fixtureDirectory, readFixture } from "./fixture.ts";

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
    assert.equal(compareSchemaVersions("3.3.0", "3.2.0"), "newer");
    assert.equal(compareSchemaVersions("3.1.0", "3.2.0"), "older");
    assert.equal(compareSchemaVersions("4.0.0", "3.2.0"), "incompatible");
    assert.equal(compareSchemaVersions("2.9.0", "3.2.0"), "incompatible");

    // Before 1.0.0 the minor version is the breaking one, and the patch version counts additions.
    assert.equal(compareSchemaVersions("0.4.7", "0.4.7"), "same");
    assert.equal(compareSchemaVersions("0.4.8", "0.4.7"), "newer");
    assert.equal(compareSchemaVersions("0.4.6", "0.4.7"), "older");
    assert.equal(compareSchemaVersions("0.5.0", "0.4.7"), "incompatible");
    assert.equal(compareSchemaVersions("0.3.9", "0.4.7"), "incompatible");
    assert.equal(compareSchemaVersions("1.0.0", "0.4.7"), "incompatible");
    assert.equal(compareSchemaVersions("4.7.0", "0.4.7"), "incompatible");
});

test("readDataset reads a dataset with a supported schema", () =>
{
    const dataset = readFixture();

    assert.equal(dataset._metadata.schema_version, bindingsSchemaVersion);
    assert.ok(dataset.genera.Tyrannosaurus);
});

test("a type specimen's nickname is read, unquoted, and shown in quotation marks", () =>
{
    const dataset = readFixture();
    const nickname = dataset.genera.Australotitan.species[0].type_specimen?.nickname;

    assert.equal(nickname, "Cooper");
    assert.equal(formatSpecimenName(nickname ?? ""), "“Cooper”");
});

test("readDataset refuses a different major schema version", () =>
{
    const nextMajor = (parseSemanticVersion(bindingsSchemaVersion).major + 1) + ".0.0";

    assert.throws(() => readDataset(fixtureDirectory, nextMajor), /breaking change/);
});

test("the override directory is searched first", () =>
{
    const candidates = getDatasetDirectoryCandidates("/repository/web", "/elsewhere/dist");

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
