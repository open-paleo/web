import * as fs from "node:fs";
import * as path from "node:path";

/**
 * File name of the built dataset inside the data repository's dist/ directory.
 */
export const datasetFileName = "open-paleo.json";

/**
 * List the directories searched for the dataset, in order of preference.
 *
 * @param rootDirectory - The web repository's root directory.
 * @param overrideDirectory - The OPEN_PALEO_DATA environment variable, if set.
 * @returns Absolute directory paths, most preferred first.
 */
export function listDatasetDirectoryCandidates(rootDirectory: string, overrideDirectory: string | undefined): Array<string>
{
    const candidates = new Array<string>();

    if (overrideDirectory)
    {
        candidates.push(path.resolve(rootDirectory, overrideDirectory));
    }

    candidates.push(path.join(rootDirectory, "data", "dist"));
    candidates.push(path.join(rootDirectory, "..", "data", "dist"));

    return candidates;
}

/**
 * Find the directory that holds the built dataset.
 *
 * The OPEN_PALEO_DATA environment variable wins when it is set; otherwise CI's checkout at
 * ./data/dist, then a sibling clone at ../data/dist.
 *
 * @param rootDirectory - The web repository's root directory.
 * @param overrideDirectory - The OPEN_PALEO_DATA environment variable, if set.
 * @returns The absolute path of the first candidate that contains open-paleo.json.
 */
export function findDatasetDirectory(rootDirectory: string, overrideDirectory: string | undefined): string
{
    const candidates = listDatasetDirectoryCandidates(rootDirectory, overrideDirectory);

    for (const candidate of candidates)
    {
        if (fs.existsSync(path.join(candidate, datasetFileName)))
        {
            return candidate;
        }
    }

    throw new Error(
        "Could not find " + datasetFileName + ". Looked in:\n  " + candidates.join("\n  ") +
        "\nClone open-paleo/data next to this repository, or set OPEN_PALEO_DATA to the directory that holds " +
        datasetFileName + ".",
    );
}
