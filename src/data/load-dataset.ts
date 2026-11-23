import * as fs from "node:fs";
import * as path from "node:path";

import { bindingsSchemaVersion } from "./bindings/schema-version.ts";
import type { OpenPaleoDataset } from "./dataset.ts";
import { datasetFileName, findDatasetDirectory } from "./locate-dataset.ts";

/**
 * A semantic version split into its numeric parts.
 */
export type SemanticVersion = {
    /**
     * Incremented for breaking changes to the output.
     */
    major: number;

    /**
     * Incremented when fields or vocabulary values are added.
     */
    minor: number;

    /**
     * Incremented for documentation or derivation fixes.
     */
    patch: number;
};

/**
 * How a dataset's schema version relates to the version the bindings describe.
 */
export type SchemaCompatibility = "same" | "newer" | "older" | "incompatible";

/**
 * Parse a semantic version string such as "3.2.0".
 *
 * @param version - The version string.
 * @returns The numeric parts.
 */
export function parseSemanticVersion(version: string): SemanticVersion
{
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

    if (!match)
    {
        throw new Error("Not a semantic version: \"" + version + "\"");
    }

    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
    };
}

/**
 * Compare an output's schema version with the version the bindings describe, as semver and npm's
 * ^ ranges do: from 1.0.0 a different major version is a breaking change, and before 1.0.0 a
 * different minor version is (0.4.x to 0.5.0), as the data repository's VERSIONING.md describes.
 * A newer compatible version only adds fields, which the site ignores until the bindings are
 * updated; an older one may lack fields the bindings declare.
 *
 * @param datasetVersion - The dataset's `_metadata.schema_version`.
 * @param supportedVersion - The version the bindings were copied from.
 * @returns How the two relate.
 */
export function compareSchemaVersions(datasetVersion: string, supportedVersion: string): SchemaCompatibility
{
    const dataset = parseSemanticVersion(datasetVersion);
    const supported = parseSemanticVersion(supportedVersion);

    if (dataset.major !== supported.major || (supported.major === 0 && dataset.minor !== supported.minor))
    {
        return "incompatible";
    }

    // Within a compatible line, the part that counts additions: the minor version from 1.0.0, the
    // patch version before it.
    const datasetStep = supported.major === 0 ? dataset.patch : dataset.minor;
    const supportedStep = supported.major === 0 ? supported.patch : supported.minor;

    if (datasetStep > supportedStep)
    {
        return "newer";
    }
    else if (datasetStep < supportedStep)
    {
        return "older";
    }

    return "same";
}

/**
 * Read and parse the dataset, and check that its schema version is one the site supports.
 *
 * @param datasetDirectory - Directory that holds open-paleo.json.
 * @param supportedVersion - Schema version the bindings describe.
 * @returns The parsed dataset.
 */
export function readDataset(datasetDirectory: string, supportedVersion: string): OpenPaleoDataset
{
    const filePath = path.join(datasetDirectory, datasetFileName);
    const dataset = JSON.parse(fs.readFileSync(filePath, "utf8")) as OpenPaleoDataset;
    const datasetVersion = dataset._metadata.schema_version;
    const compatibility = compareSchemaVersions(datasetVersion, supportedVersion);

    if (compatibility === "incompatible")
    {
        throw new Error(
            filePath + " uses output schema " + datasetVersion + ", but the site supports " + supportedVersion +
            ". A breaking change (a different major version, or before 1.0.0 a different minor version): update " +
            "the site for the new schema, then run npm run update-bindings.",
        );
    }
    else if (compatibility === "newer")
    {
        console.warn(
            "The dataset uses output schema " + datasetVersion + ", newer than the bindings (" + supportedVersion +
            "). New fields are ignored until you run npm run update-bindings.",
        );
    }
    else if (compatibility === "older")
    {
        console.warn(
            "The dataset uses output schema " + datasetVersion + ", older than the bindings (" + supportedVersion +
            "). Fields added since may be missing.",
        );
    }

    return dataset;
}

let cachedDataset: OpenPaleoDataset | undefined;

/**
 * Load the dataset once per build. Later calls return the same object.
 *
 * @returns The parsed dataset.
 */
export function loadDataset(): OpenPaleoDataset
{
    if (!cachedDataset)
    {
        const datasetDirectory = findDatasetDirectory(process.cwd(), process.env.OPEN_PALEO_DATA);

        cachedDataset = readDataset(datasetDirectory, bindingsSchemaVersion);
    }

    return cachedDataset;
}
