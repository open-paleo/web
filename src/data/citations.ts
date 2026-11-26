import type { Metadata } from "./dataset.ts";

/**
 * A citation in the form the page shows and the reader copies: the text, with the part that is
 * set in italic (a genus name) split out, and the matching BibTeX entry.
 */
export type HowToCite = {
    /**
     * The text before the italic part: "Open Paleo contributors. (2026). ".
     */
    before: string;

    /**
     * The italic part, a genus name, or an empty string for none.
     */
    italic: string;

    /**
     * The text after it.
     */
    after: string;

    /**
     * The whole citation as plain text, for copying.
     */
    text: string;

    /**
     * The BibTeX entry.
     */
    bibtex: string;
};

/**
 * The kinds of record a reader can cite.
 */
export type CitableRecordKind = "Genus" | "Clade";

/**
 * Where the dataset lives.
 */
export const dataRepositoryUrl = "https://github.com/open-paleo/data";

/**
 * Create the address of a release in the data repository: its git tag, which holds the files of
 * that release. The dataset citation points here, so it leads back to the same data.
 *
 * @param version - The release: "2026.11.26".
 * @returns The address: "https://github.com/open-paleo/data/tree/2026.11.26".
 */
export function createReleaseUrl(version: string): string
{
    return dataRepositoryUrl + "/tree/" + version;
}

/**
 * Create the address of one of a release's files on GitHub, to view or download.
 *
 * @param version - The release.
 * @param fileName - The file in dist/: "open-paleo.json".
 * @returns The address: "https://github.com/open-paleo/data/blob/2026.11.26/dist/open-paleo.json".
 */
export function createReleaseFileUrl(version: string, fileName: string): string
{
    return dataRepositoryUrl + "/blob/" + version + "/dist/" + fileName;
}

/**
 * Create the address of one of a release's files as the file itself, for software to download.
 *
 * @param version - The release.
 * @param fileName - The file in dist/.
 * @returns The address: "https://github.com/open-paleo/data/raw/2026.11.26/dist/open-paleo.json".
 */
export function createReleaseDownloadUrl(version: string, fileName: string): string
{
    return dataRepositoryUrl + "/raw/" + version + "/dist/" + fileName;
}

/**
 * Create the address of the data commit a release was built from.
 *
 * @param commit - The commit's full SHA.
 * @returns The commit's page on GitHub.
 */
export function createCommitUrl(commit: string): string
{
    return dataRepositoryUrl + "/commit/" + commit;
}

/**
 * Shorten a commit's SHA to its first seven characters, as GitHub shows it.
 *
 * @param commit - The full SHA.
 * @returns The short SHA: "13f11e6".
 */
export function formatShortCommit(commit: string): string
{
    return commit.slice(0, 7);
}

/**
 * Get the year of a release from its version: "2026.11.26" gives "2026".
 *
 * @param metadata - The release metadata.
 * @returns The year.
 */
function getReleaseYear(metadata: Metadata): string
{
    return metadata.version.split(".")[0];
}

/**
 * Write a BibTeX entry, aligning its field names.
 *
 * @param key - The citation key.
 * @param fields - The fields, as [name, value] pairs, in order.
 * @returns The entry.
 */
function writeBibtexEntry(key: string, fields: Array<[string, string]>): string
{
    const lines = ["@misc{" + key + ","];

    for (const [name, value] of fields)
    {
        lines.push("  " + name.padEnd(13) + "= {" + value + "},");
    }

    lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
    lines.push("}");

    return lines.join("\n");
}

/**
 * Create the citation of a release of the dataset, in the form the data repository's README
 * recommends for a specific version.
 *
 * @param metadata - The release metadata.
 * @returns The citation.
 */
export function createDatasetCitation(metadata: Metadata): HowToCite
{
    const year = getReleaseYear(metadata);
    const releaseUrl = createReleaseUrl(metadata.version);
    const text = "Open Paleo contributors. (" + year + "). Open Paleo (Version " + metadata.version + ") [Dataset]. " + releaseUrl;

    return {
        before: text,
        italic: "",
        after: "",
        text,
        bibtex: writeBibtexEntry("openpaleo", [
            ["author", "{Open Paleo contributors}"],
            ["title", "Open Paleo: A community-maintained phylogenetic dataset for paleontology"],
            ["year", year],
            ["publisher", "GitHub"],
            ["url", releaseUrl],
            ["note", "Version " + metadata.version],
        ]),
    };
}

/**
 * Create the citation of one genus or clade record, in the same form as the dataset's: the
 * record, the release it is from, and its page. A genus name is set in italic.
 *
 * @param kind - The kind of record.
 * @param name - The record's name: "Tyrannosaurus".
 * @param slug - The record's URL path segment, for the citation key.
 * @param pageUrl - The record page's address.
 * @param metadata - The release metadata.
 * @returns The citation.
 */
export function createRecordCitation(kind: CitableRecordKind, name: string, slug: string, pageUrl: string, metadata: Metadata): HowToCite
{
    const year = getReleaseYear(metadata);
    const before = "Open Paleo contributors. (" + year + "). ";
    const after = " [" + kind + " record]. In Open Paleo (Version " + metadata.version + ") [Dataset]. " + pageUrl;
    const isGenus = kind === "Genus";

    return {
        before: isGenus ? before : before + name,
        italic: isGenus ? name : "",
        after,
        text: before + name + after,
        bibtex: writeBibtexEntry("openpaleo-" + slug, [
            ["author", "{Open Paleo contributors}"],
            ["title", isGenus ? "\\textit{" + name + "}" : name],
            ["howpublished", "In Open Paleo (Version " + metadata.version + ")"],
            ["year", year],
            ["url", pageUrl],
            ["note", kind + " record"],
        ]),
    };
}
