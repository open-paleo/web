import * as path from "node:path";
import * as url from "node:url";

import { bindingsSchemaVersion } from "../src/data/bindings/schema-version.ts";
import type { OpenPaleoDataset } from "../src/data/dataset.ts";
import { readDataset } from "../src/data/load-dataset.ts";

// The test fixture, read at the schema version the bindings describe, so a schema update only
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
