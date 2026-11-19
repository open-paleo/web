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
    "CC-BY-3.0": { name: "CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/" },
    "CC-BY-4.0": { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    "CC-BY-SA-3.0": { name: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" },
    "CC-BY-SA-4.0": { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
};

// The longest chain of parent clades to follow; a longer one means the tree has a loop.
const maximumDepth = 60;

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
            ". A different major version is a breaking change: update the site for the new schema, then run " +
            "npm run update-bindings.",
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
 * Find the outline a genus shows: its own, or that of the nearest clade above it that has one.
 *
 * @param media - The media.
 * @param genus - The genus.
 * @param siteData - The lookup tables.
 * @returns The outline, or undefined when neither the genus nor any clade above it has one.
 */
export function findGenusOutline(media: MediaIndex, genus: GenusEntry, siteData: SiteData): OutlineEntry | undefined
{
    const own = media.outlineByTaxon.get(genus.name);

    if (own)
    {
        return own;
    }

    let cladeName: string | undefined = genus.record.parent;

    for (let depth = 0; cladeName !== undefined && depth < maximumDepth; depth++)
    {
        const outline = media.outlineByTaxon.get(cladeName);

        if (outline)
        {
            return outline;
        }

        cladeName = siteData.cladeByName.get(cladeName)?.parentName;
    }

    return undefined;
}

/**
 * Find the outline a clade shows: its own, or else its type genus's; none if it has neither.
 *
 * @param media - The media.
 * @param clade - The clade.
 * @param siteData - The lookup tables.
 * @returns The outline, or undefined.
 */
export function findCladeOutline(media: MediaIndex, clade: CladeEntry, siteData: SiteData): OutlineEntry | undefined
{
    const own = media.outlineByTaxon.get(clade.name);
    const typeGenus = clade.record?.type_genus ? siteData.genusByName.get(clade.record.type_genus) : undefined;

    if (own)
    {
        return own;
    }

    return typeGenus ? findGenusOutline(media, typeGenus, siteData) : undefined;
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
