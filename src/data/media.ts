import * as fs from "node:fs";
import * as path from "node:path";

import type { OpenPaleoMedia, Outline } from "./bindings/media";
import { mediaSchemaVersion } from "./bindings/schema-version.ts";
import { compareSchemaVersions } from "./load-dataset.ts";
import { findMediaDirectory, mediaFileName } from "./locate-dataset.ts";
import type { CladeEntry, GenusEntry, SiteData } from "./site-data.ts";

// Reads open-paleo/media's output and finds each genus's outline.

/**
 * An outline, ready for a page.
 */
export type OutlineEntry = {
    /**
     * The genus or clade it stands for.
     */
    taxon: string;

    /**
     * Its record: caption, the taxon it was drawn from, creator, source, license and changes.
     */
    record: Outline;

    /**
     * The cleaned SVG, to inline in the page.
     */
    svg: string;
};

/**
 * The media, arranged for pages.
 */
export type MediaIndex = {
    /**
     * Each outline, by the genus or clade it stands for.
     */
    outlineByTaxon: Map<string, OutlineEntry>;
};

/**
 * How a license is named and where its terms are, for credit lines.
 */
type LicenseInfo = {
    /**
     * The license's short name: "CC BY 3.0".
     */
    name: string;

    /**
     * The address of its terms.
     */
    url: string;
};

const licenses: Record<string, LicenseInfo> = {
    "CC0-1.0": { name: "CC0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
    "PDM-1.0": { name: "public domain", url: "https://creativecommons.org/publicdomain/mark/1.0/" },
    "CC-BY-2.0": { name: "CC BY 2.0", url: "https://creativecommons.org/licenses/by/2.0/" },
    "CC-BY-3.0": { name: "CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/" },
    "CC-BY-4.0": { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    "CC-BY-SA-3.0": { name: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" },
    "CC-BY-SA-4.0": { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
};

/**
 * A license an image may carry, for a form's choices.
 */
export type LicenseOption = {
    /**
     * The license's SPDX id: "CC-BY-4.0".
     */
    id: string;

    /**
     * Its short name: "CC BY 4.0".
     */
    name: string;
};

let cachedMedia: MediaIndex | undefined;

/**
 * Read the media index, refusing one whose major schema version differs from the bindings'.
 *
 * @param mediaDirectory - The directory holding media.json and the outlines.
 * @param supportedVersion - The schema version the bindings describe.
 * @returns The media.
 */
export function readMedia(mediaDirectory: string, supportedVersion: string): OpenPaleoMedia
{
    const filePath = path.join(mediaDirectory, mediaFileName);
    const media = JSON.parse(fs.readFileSync(filePath, "utf8")) as OpenPaleoMedia;
    const version = media._metadata.schema_version;
    const compatibility = compareSchemaVersions(version, supportedVersion);

    if (compatibility === "incompatible")
    {
        throw new Error(
            filePath + " uses media schema " + version + ", but the site supports " + supportedVersion +
            ". A breaking change (a different major version, or before 1.0.0 a different minor version): update " +
            "the site for the new schema, then run npm run update-bindings.",
        );
    }
    else if (compatibility !== "same")
    {
        console.warn("The media use schema " + version + "; the bindings describe " + supportedVersion + ". Run npm run update-bindings.");
    }

    return media;
}

/**
 * Arrange the media for pages, reading each outline's SVG.
 *
 * @param media - The media index.
 * @param mediaDirectory - The directory the outline files are in.
 * @param siteData - The lookup tables, to warn about outlines for taxa the dataset doesn't have.
 * @returns The outlines by taxon.
 */
export function createMediaIndex(media: OpenPaleoMedia, mediaDirectory: string, siteData: SiteData): MediaIndex
{
    const outlineByTaxon = new Map<string, OutlineEntry>();

    for (const [taxon, record] of Object.entries(media.outlines))
    {
        if (!siteData.cladeByName.has(taxon) && !siteData.genusByName.has(taxon))
        {
            console.warn("The media have an outline for " + taxon + ", which the dataset has no genus or clade by.");
            continue;
        }

        outlineByTaxon.set(taxon, { taxon, record, svg: fs.readFileSync(path.join(mediaDirectory, record.file), "utf8") });
    }

    return { outlineByTaxon };
}

/**
 * Find a genus's own outline. A genus without one shows none: a relative's outline, often a
 * whole order's, would be misleading beside its name.
 *
 * @param media - The media.
 * @param genus - The genus.
 * @returns The outline, or undefined when the genus has none of its own.
 */
export function findGenusOutline(media: MediaIndex, genus: GenusEntry): OutlineEntry | undefined
{
    return media.outlineByTaxon.get(genus.name);
}

/**
 * Find the outline a clade shows: its own, or else its type genus's own outline, since the type
 * genus is a member the clade is named for. The caller can tell which from the outline's taxon.
 *
 * @param media - The media.
 * @param clade - The clade.
 * @returns The outline, or undefined when neither the clade nor its type genus has one.
 */
export function findCladeOutline(media: MediaIndex, clade: CladeEntry): OutlineEntry | undefined
{
    const own = media.outlineByTaxon.get(clade.name);
    const typeGenus = clade.record?.type_genus;

    if (own)
    {
        return own;
    }

    return typeGenus ? media.outlineByTaxon.get(typeGenus) : undefined;
}

/**
 * Get a license's short name and the address of its terms.
 *
 * @param license - The license, as an SPDX id.
 * @returns The name and address; the id itself and no address for a license this doesn't know.
 */
export function getLicenseInfo(license: string): LicenseInfo
{
    return licenses[license] ?? { name: license, url: "" };
}

/**
 * Format the changes made to an outline for its credit line, as a list: "Recolored; flipped
 * horizontally" becomes "recolored and flipped horizontally", and "Traced; filled; recolored"
 * becomes "traced, filled and recolored".
 *
 * @param changes - The outline record's changes, separated by semicolons.
 * @returns The changes as they read in the credit line.
 */
export function formatOutlineChanges(changes: string): string
{
    const parts = new Array<string>();

    for (const part of changes.toLowerCase().split(";"))
    {
        if (part.trim() !== "")
        {
            parts.push(part.trim());
        }
    }

    if (parts.length <= 1)
    {
        return parts[0] ?? "";
    }

    return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

/**
 * Get the licenses an image may carry, in the order the media repository gives them.
 *
 * @returns The licenses.
 */
export function getLicenseOptions(): Array<LicenseOption>
{
    const options = new Array<LicenseOption>();

    for (const [id, license] of Object.entries(licenses))
    {
        options.push({ id, name: license.name });
    }

    return options;
}

/**
 * Load the media and arrange them for pages, once per build.
 *
 * @param siteData - The lookup tables.
 * @returns The media.
 */
export function getMedia(siteData: SiteData): MediaIndex
{
    if (!cachedMedia)
    {
        const mediaDirectory = findMediaDirectory(process.cwd(), process.env.OPEN_PALEO_MEDIA);

        cachedMedia = createMediaIndex(readMedia(mediaDirectory, mediaSchemaVersion), mediaDirectory, siteData);
    }

    return cachedMedia;
}
