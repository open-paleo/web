import * as path from "node:path";
import * as url from "node:url";

import { bindingsSchemaVersion, glossarySchemaVersion } from "../src/data/bindings/schema-version.ts";
import type { OpenPaleoDataset } from "../src/data/dataset.ts";
import type { GlossaryIndex } from "../src/data/glossary.ts";
import { createGlossaryIndex, readGlossary } from "../src/data/glossary.ts";
import { readDataset } from "../src/data/load-dataset.ts";

// The test fixtures, read at the schema versions the bindings describe, so a schema update only
// needs `npm run update-bindings` and `npm run create-test-fixture`, not edits to every test.

/**
 * The directory holding test/fixtures/open-paleo.json.
 */
export const fixtureDirectory = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "fixtures");

/**
 * Read the test fixture.
 *
 * @returns The fixture dataset.
 */
export function readFixture(): OpenPaleoDataset
{
    return readDataset(fixtureDirectory, bindingsSchemaVersion);
}

/**
 * Read the glossary's test fixture, arranged for pages.
 *
 * @returns The glossary.
 */
export function readGlossaryFixture(): GlossaryIndex
{
    return createGlossaryIndex(readGlossary(fixtureDirectory, glossarySchemaVersion));
}
