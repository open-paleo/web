import * as fs from "node:fs";
import * as path from "node:path";

/**
 * File name of the built dataset inside the data repository's dist/ directory.
 */
export const datasetFileName = "open-paleo.json";

/**
 * Get the directories searched for the dataset, in order of preference.
 *
 * @param rootDirectory - The web repository's root directory.
 * @param overrideDirectory - The OPEN_PALEO_DATA environment variable, if set.
 * @returns Absolute directory paths, most preferred first.
 */
export function getDatasetDirectoryCandidates(rootDirectory: string, overrideDirectory: string | undefined): Array<string>
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
    const candidates = getDatasetDirectoryCandidates(rootDirectory, overrideDirectory);

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

/**
 * File name of the built glossary inside the glossary repository's dist/ directory.
 */
export const glossaryFileName = "glossary.json";

/**
 * Find the directory that holds the built glossary: the OPEN_PALEO_GLOSSARY environment variable
 * when it is set, otherwise CI's checkout at ./glossary/dist, then a sibling clone at
 * ../glossary/dist.
 *
 * @param rootDirectory - The web repository's root directory.
 * @param overrideDirectory - The OPEN_PALEO_GLOSSARY environment variable, if set.
 * @returns The absolute path of the first candidate that contains glossary.json.
 */
export function findGlossaryDirectory(rootDirectory: string, overrideDirectory: string | undefined): string
{
    const candidates = new Array<string>();

    if (overrideDirectory)
    {
        candidates.push(path.resolve(rootDirectory, overrideDirectory));
    }

    candidates.push(path.join(rootDirectory, "glossary", "dist"));
    candidates.push(path.join(rootDirectory, "..", "glossary", "dist"));

    for (const candidate of candidates)
    {
        if (fs.existsSync(path.join(candidate, glossaryFileName)))
        {
            return candidate;
        }
    }

    throw new Error(
        "Could not find " + glossaryFileName + ". Looked in:\n  " + candidates.join("\n  ") +
        "\nClone open-paleo/glossary next to this repository and run npm run build there, or set " +
        "OPEN_PALEO_GLOSSARY to the directory that holds " + glossaryFileName + ".",
    );
}

/**
 * File name of the built media index inside the media repository's dist/ directory.
 */
export const mediaFileName = "media.json";

/**
 * Find the directory that holds the built media: the OPEN_PALEO_MEDIA environment variable when
 * it is set, otherwise CI's checkout at ./media/dist, then a sibling clone at ../media/dist.
 *
 * @param rootDirectory - The web repository's root directory.
 * @param overrideDirectory - The OPEN_PALEO_MEDIA environment variable, if set.
 * @returns The absolute path of the first candidate that contains media.json.
 */
export function findMediaDirectory(rootDirectory: string, overrideDirectory: string | undefined): string
{
    const candidates = new Array<string>();

    if (overrideDirectory)
    {
        candidates.push(path.resolve(rootDirectory, overrideDirectory));
    }

    candidates.push(path.join(rootDirectory, "media", "dist"));
    candidates.push(path.join(rootDirectory, "..", "media", "dist"));

    for (const candidate of candidates)
    {
        if (fs.existsSync(path.join(candidate, mediaFileName)))
        {
            return candidate;
        }
    }

    throw new Error(
        "Could not find " + mediaFileName + ". Looked in:\n  " + candidates.join("\n  ") +
        "\nClone open-paleo/media next to this repository, or set OPEN_PALEO_MEDIA to the directory " +
        "that holds " + mediaFileName + ".",
    );
}
