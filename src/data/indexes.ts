import * as fs from "node:fs";
import * as path from "node:path";

import { getSurnames } from "./format.ts";
import { findDatasetDirectory } from "./locate-dataset.ts";
import type { GenusEntry, ReferenceEntry } from "./site-data.ts";
import { createSlug } from "./slugs.ts";

/**
 * Entries that share a first letter, for an A–Z index.
 */
export type LetterGroup<Entry> = {
    /**
     * The letter, A to Z, or "#" for entries that start with anything else.
     */
    letter: string;

    /**
     * The entries, in the order they were given.
     */
    entries: Array<Entry>;
};

/**
 * A file the Data page offers for download.
 */
export type DatasetFile = {
    /**
     * File name within the dataset's dist directory: "open-paleo.json", "bindings/open_paleo.py".
     */
    name: string;

    /**
     * What the file holds and what it is for.
     */
    description: string;

    /**
     * Size in bytes, or undefined when the file is not in the local dataset.
     */
    sizeBytes: number | undefined;
};

/**
 * The files of the dataset's dist directory, in the order the Data page lists them.
 */
const datasetFileDescriptions: Array<[string, string]> = [
    ["open-paleo.json", "The complete dataset as JSON: every genus, clade and reference, and the tree."],
    ["open-paleo.yml", "The same dataset as YAML."],
    ["open-paleo.schema.json", "JSON Schema (2020-12) describing the JSON and YAML output."],
    ["tree.newick", "The clade tree in Newick notation, for tree visualization software."],
    ["tree.nexus", "The clade tree in NEXUS format, for phylogenetic analysis tools."],
    ["references.bib", "Every cited work as BibTeX."],
    ["bindings/open-paleo.d.ts", "TypeScript type declarations for the JSON output."],
    ["bindings/open_paleo.py", "Python Pydantic v2 models for the JSON output."],
];

/**
 * Get the index letter for a name: its first letter without accents, uppercased, or "#" when
 * it does not start with a letter.
 *
 * @param name - A genus name or an author's surname.
 * @returns "A" to "Z", or "#".
 */
export function getIndexLetter(name: string): string
{
    const first = createSlug(name).charAt(0).toUpperCase();

    return /^[A-Z]$/.test(first) ? first : "#";
}

/**
 * Group entries by the index letter of a name taken from each. Entries keep their given order,
 * so pass them already sorted.
 *
 * @param entries - The entries, sorted.
 * @param getName - Returns the name an entry is indexed under.
 * @returns One group per letter that has entries, in order of first appearance.
 */
export function groupByLetter<Entry>(entries: Array<Entry>, getName: (entry: Entry) => string): Array<LetterGroup<Entry>>
{
    const groups = new Array<LetterGroup<Entry>>();
    const groupByLetterKey = new Map<string, LetterGroup<Entry>>();

    for (const entry of entries)
    {
        const letter = getIndexLetter(getName(entry));
        let group = groupByLetterKey.get(letter);

        if (!group)
        {
            group = { letter, entries: new Array<Entry>() };
            groupByLetterKey.set(letter, group);
            groups.push(group);
        }

        group.entries.push(entry);
    }

    return groups;
}

/**
 * Get the name a genus is indexed under: its own name.
 *
 * @param genus - The genus.
 * @returns The genus name.
 */
export function getGenusIndexName(genus: GenusEntry): string
{
    return genus.name;
}

/**
 * Get the name a reference is indexed under: its first author's surname, or its key when it
 * has no authors.
 *
 * @param reference - The cited work.
 * @returns The surname.
 */
export function getReferenceIndexName(reference: ReferenceEntry): string
{
    return getSurnames(reference.reference.authors ?? "")[0] ?? reference.id;
}

/**
 * List the dataset files the Data page offers, with their sizes in the local dataset.
 *
 * @param datasetDirectory - The dataset's dist directory.
 * @returns The files, in display order.
 */
export function listDatasetFiles(datasetDirectory: string): Array<DatasetFile>
{
    const files = new Array<DatasetFile>();

    for (const [name, description] of datasetFileDescriptions)
    {
        const filePath = path.join(datasetDirectory, name);

        files.push({
            name,
            description,
            sizeBytes: fs.existsSync(filePath) ? fs.statSync(filePath).size : undefined,
        });
    }

    return files;
}

/**
 * List the dataset files the Data page offers, from the dataset the build reads.
 *
 * @returns The files, in display order.
 */
export function getDatasetFiles(): Array<DatasetFile>
{
    return listDatasetFiles(findDatasetDirectory(process.cwd(), process.env.OPEN_PALEO_DATA));
}

/**
 * Format a file size for people: "10.2 MB", "3.0 kB", "512 bytes".
 *
 * @param bytes - The size in bytes.
 * @returns The size with a unit.
 */
export function formatFileSize(bytes: number): string
{
    if (bytes >= 1_000_000)
    {
        return (bytes / 1_000_000).toFixed(1) + " MB";
    }
    else if (bytes >= 1_000)
    {
        return (bytes / 1_000).toFixed(1) + " kB";
    }

    return bytes + " bytes";
}

/**
 * Create the element id of a letter's group in an A–Z index.
 *
 * @param letter - "A" to "Z", or "#".
 * @returns "letter-a" to "letter-z", or "letter-other".
 */
export function createLetterAnchor(letter: string): string
{
    return "letter-" + (letter === "#" ? "other" : letter.toLowerCase());
}
