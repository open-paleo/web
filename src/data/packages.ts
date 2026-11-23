import { dataRepositoryUrl } from "./citations.ts";
import { parseSemanticVersion } from "./load-dataset.ts";

// The official packages of the dataset's types, which the Developers page describes. Their
// version is the dataset's schema version, so everything here that names a version is built from
// the schema version the site is built from.

/**
 * The id of the Developers page's section on the packages, which the Data page links to. Fixed
 * rather than taken from the heading, so links to it survive a change to the heading's wording.
 */
export const bindingsSectionId = "bindings";

/**
 * The TypeScript package's name on npm.
 */
export const npmPackageName = "@open-paleo/types";

/**
 * The TypeScript package's page on npm.
 */
export const npmPackageUrl = "https://www.npmjs.com/package/@open-paleo/types";

/**
 * The Python package's name on PyPI, as installed.
 */
export const pythonPackageName = "open-paleo";

/**
 * The Python package's name as imported.
 */
export const pythonModuleName = "open_paleo";

/**
 * The Python package's page on PyPI.
 */
export const pythonPackageUrl = "https://pypi.org/project/open-paleo/";

/**
 * The data repository's versioning policy, at its section on the packages.
 */
export const packageVersioningUrl = dataRepositoryUrl + "/blob/main/docs/VERSIONING.md#packages";

/**
 * The data repository's changelog, which notes each change to the format.
 */
export const dataChangelogUrl = dataRepositoryUrl + "/blob/main/CHANGELOG.md";

/**
 * The folder of the data repository that holds the generated bindings, for projects without a
 * package manager.
 */
export const bindingsFolderUrl = dataRepositoryUrl + "/tree/main/dist/bindings";

/**
 * What the Developers page shows about the packages for one schema version.
 */
export type PackageInstructions = {
    /**
     * The schema version, which is also the packages' version: "0.4.7".
     */
    version: string;

    /**
     * Whether the version is below 1.0.0, when a new minor version is a breaking change.
     */
    isUnstable: boolean;

    /**
     * The version line a breaking change leaves: "0.4" before 1.0.0, "1" after.
     */
    compatibleLine: string;

    /**
     * The next version line, which a breaking change starts: "0.5" before 1.0.0, "2" after.
     */
    nextLine: string;

    /**
     * The command that installs the TypeScript package.
     */
    npmInstall: string;

    /**
     * An npm version range that stays on compatible versions: "^0.4.7".
     */
    npmRange: string;

    /**
     * The command that installs the Python package.
     */
    pipInstall: string;

    /**
     * A pip version specifier that stays on compatible versions: "open-paleo~=0.4.7".
     */
    pipRequirement: string;

    /**
     * An example of reading the dataset in TypeScript.
     */
    typescriptExample: string;

    /**
     * An example of reading the dataset in Python.
     */
    pythonExample: string;
};

/**
 * Create what the Developers page shows about the packages for a schema version.
 *
 * Before 1.0.0, versions are published under npm's `next` tag, and a new minor version is a
 * breaking change, so the compatible ranges stay within one minor line: npm's ^0.4.7 and pip's
 * ~=0.4.7 both mean 0.4.7 or later below 0.5.0. From 1.0.0 they stay within one major version.
 *
 * @param schemaVersion - The dataset's `_metadata.schema_version`.
 * @returns The versions, commands and examples.
 */
export function createPackageInstructions(schemaVersion: string): PackageInstructions
{
    const version = parseSemanticVersion(schemaVersion);
    const isUnstable = version.major === 0;
    const pipSpecifier = isUnstable ? schemaVersion : version.major + "." + version.minor;

    return {
        version: schemaVersion,
        isUnstable,
        compatibleLine: isUnstable ? "0." + version.minor : String(version.major),
        nextLine: isUnstable ? "0." + (version.minor + 1) : String(version.major + 1),
        npmInstall: "npm install --save-dev " + npmPackageName + (isUnstable ? "@next" : ""),
        npmRange: "^" + schemaVersion,
        pipInstall: "pip install " + pythonPackageName,
        pipRequirement: pythonPackageName + "~=" + pipSpecifier,
        typescriptExample: [
            "import * as fs from \"node:fs\";",
            "",
            "import type { Genus, OpenPaleoDataset } from \"" + npmPackageName + "\";",
            "import schema from \"" + npmPackageName + "/schema.json\" with { type: \"json\" };",
            "",
            "const dataset: OpenPaleoDataset = JSON.parse(fs.readFileSync(\"open-paleo.json\", \"utf8\"));",
            "const tyrannosaurus: Genus = dataset.genera[\"Tyrannosaurus\"];",
            "const genera: Array<Genus> = Object.values(dataset.genera);",
        ].join("\n"),
        pythonExample: [
            "import json",
            "from importlib.resources import files",
            "from pathlib import Path",
            "",
            "from " + pythonModuleName + " import OpenPaleoDataset",
            "",
            "dataset = OpenPaleoDataset.model_validate_json(Path(\"open-paleo.json\").read_bytes())",
            "tyrannosaurus = dataset.genera[\"Tyrannosaurus\"]",
            "schema = json.loads(files(\"" + pythonModuleName + "\").joinpath(\"schema.json\").read_text(encoding=\"utf-8\"))",
        ].join("\n"),
    };
}
