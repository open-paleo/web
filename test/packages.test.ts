import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createPackageInstructions } from "../src/data/packages.ts";
import { readFixture } from "./fixture.ts";

const dataset = readFixture();

test("createPackageInstructions uses the dataset's schema version as the packages' version", () =>
{
    const schemaVersion = dataset._metadata.schema_version;
    const instructions = createPackageInstructions(schemaVersion);

    assert.equal(instructions.version, schemaVersion);
    assert.equal(instructions.npmRange, "^" + schemaVersion);
});

test("createPackageInstructions keeps to one minor line before 1.0.0", () =>
{
    const instructions = createPackageInstructions("0.4.7");

    assert.equal(instructions.isUnstable, true);
    assert.equal(instructions.compatibleLine, "0.4");
    assert.equal(instructions.nextLine, "0.5");
    assert.equal(instructions.npmInstall, "npm install --save-dev @open-paleo/types@next");
    assert.equal(instructions.npmRange, "^0.4.7");
    assert.equal(instructions.pipInstall, "pip install open-paleo");
    assert.equal(instructions.pipRequirement, "open-paleo~=0.4.7");
});

test("createPackageInstructions keeps to one major version from 1.0.0", () =>
{
    const instructions = createPackageInstructions("1.2.3");

    assert.equal(instructions.isUnstable, false);
    assert.equal(instructions.compatibleLine, "1");
    assert.equal(instructions.nextLine, "2");
    assert.equal(instructions.npmInstall, "npm install --save-dev @open-paleo/types");
    assert.equal(instructions.npmRange, "^1.2.3");
    assert.equal(instructions.pipRequirement, "open-paleo~=1.2");
});

test("createPackageInstructions reads the dataset's collections by name in both examples", () =>
{
    const instructions = createPackageInstructions("0.4.7");

    assert.ok(instructions.typescriptExample.includes("dataset.genera[\"Tyrannosaurus\"]"));
    assert.ok(instructions.typescriptExample.includes("Object.values(dataset.genera)"));
    assert.ok(instructions.pythonExample.includes("dataset.genera[\"Tyrannosaurus\"]"));
});
