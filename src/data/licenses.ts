import * as fs from "node:fs";
import * as path from "node:path";

import { modelRepository, modelRevision } from "../integrations/paddle-model.ts";

// Everything the site serves, or the repository holds, that others made: what it is, its
// license and who holds the copyright. The Licenses page lists it, the full license texts are
// served beside that page, and the build writes a LICENSE.txt naming the works in each folder of
// bundled files. A browser dependency added to package.json must be added here
// (test/licenses.test.ts checks).

/**
 * The part of the Licenses page a work is listed in.
 */
export type LicenseGroup = "code" | "fonts" | "data";

/**
 * A work by others that the site serves or the repository holds.
 */
export type LicensedWork = {
    /**
     * The work's name: "MapLibre GL JS".
     */
    name: string;

    /**
     * The name of its license text on the site, licenses/{slug}.txt.
     */
    slug: string;

    /**
     * The part of the Licenses page it is listed in.
     */
    group: LicenseGroup;

    /**
     * The npm package it comes from, whose installed version is shown; undefined for a work
     * that isn't one.
     */
    packageName: string | undefined;

    /**
     * Its version, for a work that isn't an npm package; undefined when it has none to give.
     */
    version: string | undefined;

    /**
     * The license's name: "BSD 3-Clause License".
     */
    license: string;

    /**
     * The license's own page.
     */
    licenseUrl: string;

    /**
     * Who holds the copyright, as the work states it.
     */
    holder: string;

    /**
     * Where the work's source or home page is.
     */
    sourceUrl: string;

    /**
     * What the site uses it for.
     */
    use: string;

    /**
     * Files in the repository holding its license text and notices, relative to the
     * repository's root. Served together as licenses/{slug}.txt; none for a work whose license
     * page is enough, such as the public domain.
     */
    licenseFiles: Array<string>;

    /**
     * Folders of the built site, relative to its root, that hold the work's files and so get a
     * LICENSE.txt naming it. None for a work that arrives with its own license file, or that the
     * site doesn't serve.
     */
    siteDirectories: Array<string>;
};

/**
 * A work as the Licenses page lists it.
 */
export type LicenseEntry = {
    /**
     * The work.
     */
    work: LicensedWork;

    /**
     * The version served, or an empty string when there is none to give.
     */
    version: string;

    /**
     * The path of its license text on the site, relative to the site's base, or undefined when
     * the license's own page is linked instead.
     */
    textPath: string | undefined;
};

const apacheLicense = "Apache License 2.0";
const apacheLicenseUrl = "https://www.apache.org/licenses/LICENSE-2.0";
const mitLicense = "MIT License";
const mitLicenseUrl = "https://opensource.org/license/mit";
const gplLicenseUrl = "https://www.gnu.org/licenses/old-licenses/gpl-2.0.html";
const oflLicense = "SIL Open Font License 1.1";
const oflLicenseUrl = "https://openfontlicense.org";

const licensedWorks: Array<LicensedWork> = [
    {
        name: "Astro",
        slug: "astro",
        group: "code",
        packageName: "astro",
        version: undefined,
        license: mitLicense,
        licenseUrl: mitLicenseUrl,
        holder: "Fred K. Schott; parts by the SvelteKit and Vite contributors",
        sourceUrl: "https://github.com/withastro/astro",
        use: "Builds the site. The small part of it that runs page scripts ships with them.",
        licenseFiles: ["node_modules/astro/LICENSE"],
        siteDirectories: ["_astro"],
    },
    {
        name: "MapLibre GL JS",
        slug: "maplibre-gl-js",
        group: "code",
        packageName: "maplibre-gl",
        version: undefined,
        license: "BSD 3-Clause License",
        licenseUrl: "https://opensource.org/license/bsd-3-clause",
        holder: "MapLibre contributors; Mapbox",
        sourceUrl: "https://github.com/maplibre/maplibre-gl-js",
        use: "Draws the maps on genus pages and the Map page, and the Tree page’s chart.",
        licenseFiles: ["node_modules/maplibre-gl/LICENSE.txt"],
        siteDirectories: ["_astro"],
    },
    {
        name: "Pagefind",
        slug: "pagefind",
        group: "code",
        packageName: "pagefind",
        version: undefined,
        license: mitLicense,
        licenseUrl: mitLicenseUrl,
        holder: "Pagefind",
        sourceUrl: "https://github.com/Pagefind/pagefind",
        use: "Indexes the site for search, and runs the search page in the browser.",
        licenseFiles: ["node_modules/pagefind/LICENSE/LICENSE"],
        siteDirectories: ["pagefind"],
    },
    {
        name: "Open Paleo tree extractor",
        slug: "tree-extractor",
        group: "code",
        packageName: "@open-paleo/tree-extractor",
        version: undefined,
        license: mitLicense,
        licenseUrl: mitLicenseUrl,
        holder: "Open Paleo contributors",
        sourceUrl: "https://github.com/open-paleo/tools/tree/main/tree-extractor",
        use: "The tree extractor tool.",
        licenseFiles: ["node_modules/@open-paleo/tree-extractor/LICENSE"],
        siteDirectories: ["_astro"],
    },
    {
        name: "Tesseract.js",
        slug: "tesseract-js",
        group: "code",
        packageName: "tesseract.js",
        version: undefined,
        license: apacheLicense,
        licenseUrl: apacheLicenseUrl,
        holder: "Tesseract.js contributors",
        sourceUrl: "https://github.com/naptha/tesseract.js",
        use: "Reads the labels of a figure in the tree extractor. Its notices list the libraries bundled in its worker.",
        licenseFiles: ["node_modules/tesseract.js/LICENSE.md", "node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt"],
        siteDirectories: ["_astro", "tools/tree-extractor/tesseract"],
    },
    {
        name: "Tesseract.js core",
        slug: "tesseract-js-core",
        group: "code",
        packageName: "tesseract.js-core",
        version: undefined,
        license: apacheLicense,
        licenseUrl: apacheLicenseUrl,
        holder: "Tesseract OCR and Tesseract.js contributors",
        sourceUrl: "https://github.com/naptha/tesseract.js-core",
        use: "The Tesseract OCR engine compiled to WebAssembly, which Tesseract.js runs.",
        licenseFiles: ["node_modules/tesseract.js-core/LICENSE"],
        siteDirectories: [],
    },
    {
        name: "Tesseract English language data (tessdata_best)",
        slug: "tessdata",
        group: "code",
        packageName: "@tesseract.js-data/eng",
        version: undefined,
        license: apacheLicense,
        licenseUrl: apacheLicenseUrl,
        holder: "Tesseract OCR contributors",
        sourceUrl: "https://github.com/tesseract-ocr/tessdata_best",
        use: "The trained English model Tesseract reads labels with, from the @tesseract.js-data/eng package.",
        licenseFiles: ["src/integrations/apache-2.0.txt"],
        siteDirectories: ["tools/tree-extractor/tessdata"],
    },
    {
        name: "ONNX Runtime Web",
        slug: "onnxruntime-web",
        group: "code",
        packageName: "onnxruntime-web",
        version: undefined,
        license: mitLicense,
        licenseUrl: mitLicenseUrl,
        holder: "Microsoft Corporation",
        sourceUrl: "https://onnxruntime.ai",
        use: "Runs the tree extractor’s optional second OCR engine.",
        licenseFiles: ["src/licenses/onnxruntime.txt"],
        siteDirectories: ["tools/tree-extractor/onnxruntime"],
    },
    {
        name: "PaddleOCR PP-OCRv5 English recognition model",
        slug: "paddleocr",
        group: "code",
        packageName: undefined,
        version: "revision " + modelRevision.slice(0, 7),
        license: apacheLicense,
        licenseUrl: apacheLicenseUrl,
        holder: "PaddlePaddle Authors",
        sourceUrl: "https://huggingface.co/" + modelRepository,
        use: "The model the tree extractor’s second OCR engine reads labels with.",
        licenseFiles: ["src/integrations/apache-2.0.txt"],
        siteDirectories: [],
    },
    {
        name: "Open Paleo outline tracer",
        slug: "outline-tracer",
        group: "code",
        packageName: "@open-paleo/outline-tracer",
        version: undefined,
        license: "GNU General Public License, version 2 or later",
        licenseUrl: gplLicenseUrl,
        holder: "Open Paleo contributors",
        sourceUrl: "https://github.com/open-paleo/tools/tree/main/outline-tracer",
        use: "The outline tracer tool, in a Web Worker of its own. It includes potrace, so it is under the GPL; the rest of the site is not.",
        licenseFiles: ["node_modules/@open-paleo/outline-tracer/LICENSE"],
        siteDirectories: ["_astro"],
    },
    {
        name: "esm-potrace-wasm, with potrace",
        slug: "esm-potrace-wasm",
        group: "code",
        packageName: "esm-potrace-wasm",
        version: undefined,
        license: "GNU General Public License, version 2",
        licenseUrl: gplLicenseUrl,
        holder: "Thomas Steiner (esm-potrace-wasm); Peter Selinger (potrace)",
        sourceUrl: "https://github.com/tomayac/esm-potrace-wasm",
        use: "Peter Selinger’s potrace compiled to WebAssembly, which the outline tracer traces with. potrace’s own source is at https://potrace.sourceforge.net.",
        licenseFiles: ["node_modules/esm-potrace-wasm/LICENSE"],
        siteDirectories: ["_astro"],
    },
    {
        name: "GitHub mark, from Primer Octicons",
        slug: "octicons",
        group: "code",
        packageName: undefined,
        version: "19.42.0",
        license: mitLicense,
        licenseUrl: mitLicenseUrl,
        holder: "GitHub Inc.",
        sourceUrl: "https://github.com/primer/octicons",
        use: "The GitHub link in the header.",
        licenseFiles: ["src/licenses/octicons.txt"],
        siteDirectories: [],
    },
    {
        name: "Bluesky butterfly logo",
        slug: "bluesky-logo",
        group: "code",
        packageName: undefined,
        version: undefined,
        license: "Bluesky Trademark Policy, social media icon use (section 4.1)",
        licenseUrl: "https://bsky.social/about/support/trademarks",
        holder: "Bluesky Social, PBC",
        sourceUrl: "https://bsky.social/about/support/icons",
        use: "The Bluesky link in the footer. Bluesky Social, PBC doesn’t endorse Open Paleo.",
        licenseFiles: [],
        siteDirectories: [],
    },
    {
        name: "Threads logo",
        slug: "threads-logo",
        group: "code",
        packageName: undefined,
        version: undefined,
        license: "Meta’s Threads brand guidelines",
        licenseUrl: "https://www.meta.com/brand/resources/threads/",
        holder: "Meta Platforms, Inc.",
        sourceUrl: "https://www.meta.com/brand/resources/threads/",
        use: "The Threads link in the footer. Meta doesn’t endorse Open Paleo.",
        licenseFiles: [],
        siteDirectories: [],
    },
    {
        name: "Alegreya",
        slug: "alegreya",
        group: "fonts",
        packageName: undefined,
        version: "Fontsource 5.3.0",
        license: oflLicense,
        licenseUrl: oflLicenseUrl,
        holder: "The Alegreya Project Authors",
        sourceUrl: "https://github.com/huertatipografica/Alegreya",
        use: "Headings, taxon names and prose.",
        licenseFiles: ["src/theme/fonts/OFL-Alegreya.txt"],
        siteDirectories: ["_astro"],
    },
    {
        name: "Alegreya Sans",
        slug: "alegreya-sans",
        group: "fonts",
        packageName: undefined,
        version: "Fontsource 5.3.0",
        license: oflLicense,
        licenseUrl: oflLicenseUrl,
        holder: "The Alegreya Sans Project Authors",
        sourceUrl: "https://github.com/huertatipografica/Alegreya-Sans",
        use: "Navigation, labels, tables and forms.",
        licenseFiles: ["src/theme/fonts/OFL-Alegreya-Sans.txt"],
        siteDirectories: ["_astro"],
    },
    {
        name: "Open Paleo dataset and glossary",
        slug: "open-paleo-data",
        group: "data",
        packageName: undefined,
        version: undefined,
        license: "Creative Commons Attribution 4.0 (CC BY 4.0)",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        holder: "Open Paleo contributors",
        sourceUrl: "https://github.com/open-paleo/data",
        use: "Everything the site says about taxa, rock units, references and terms. The Data page has the downloads and how to cite them.",
        licenseFiles: [],
        siteDirectories: [],
    },
    {
        name: "Outlines from open-paleo/media",
        slug: "open-paleo-media",
        group: "data",
        packageName: undefined,
        version: undefined,
        license: "Each outline’s own license",
        licenseUrl: "https://github.com/open-paleo/media",
        holder: "The artists each credit line names",
        sourceUrl: "https://github.com/open-paleo/media",
        use: "The outlines beside genus and clade names. Each carries a credit line with its creator, license and the changes made.",
        licenseFiles: [],
        siteDirectories: [],
    },
    {
        name: "Plate model of Wright et al. (2013)",
        slug: "wright-2013",
        group: "data",
        packageName: undefined,
        version: undefined,
        license: "Creative Commons Attribution 3.0 Australia (CC BY 3.0 AU)",
        licenseUrl: "https://creativecommons.org/licenses/by/3.0/au/",
        holder: "N. Wright, S. Zahirovic, R. D. Müller and M. Seton",
        sourceUrl: "https://doi.org/10.5194/bg-10-1529-2013",
        use: "The ancient coastlines on genus maps, and the rotations that move fossil sites to where they were. The coastlines are simplified, and both are moved to the middle of each stage.",
        licenseFiles: [],
        siteDirectories: [],
    },
    {
        name: "Natural Earth",
        slug: "natural-earth",
        group: "data",
        packageName: undefined,
        version: "5.1.2",
        license: "Public domain",
        licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
        holder: "Natural Earth",
        sourceUrl: "https://www.naturalearthdata.com",
        use: "The region and country outlines the maps shade when a place is known only to its region or country, simplified.",
        licenseFiles: [],
        siteDirectories: [],
    },
    {
        name: "OpenStreetMap, through OpenFreeMap",
        slug: "openstreetmap",
        group: "data",
        packageName: undefined,
        version: undefined,
        license: "Open Database License (ODbL)",
        licenseUrl: "https://www.openstreetmap.org/copyright",
        holder: "OpenStreetMap contributors; OpenMapTiles; OpenFreeMap",
        sourceUrl: "https://openfreemap.org",
        use: "The base map. Browsers load its tiles from OpenFreeMap, not from this site, and each map credits it.",
        licenseFiles: [],
        siteDirectories: [],
    },
];

/**
 * Get every work by others that the site serves or the repository holds, in the order the
 * Licenses page lists them.
 *
 * @returns The works.
 */
export function getLicensedWorks(): Array<LicensedWork>
{
    return licensedWorks;
}

/**
 * Find a work by its slug.
 *
 * @param slug - The work's slug: "esm-potrace-wasm".
 * @returns The work.
 */
export function findLicensedWork(slug: string): LicensedWork
{
    for (const work of licensedWorks)
    {
        if (work.slug === slug)
        {
            return work;
        }
    }

    throw new Error("No licensed work has the slug " + slug + "; see src/data/licenses.ts.");
}

/**
 * Read the version of a work: its installed package's, or the version it records.
 *
 * @param work - The work.
 * @param rootDirectory - The repository's root.
 * @returns The version, or an empty string when there is none to give.
 */
export function readWorkVersion(work: LicensedWork, rootDirectory: string): string
{
    if (!work.packageName)
    {
        return work.version ?? "";
    }

    const manifestPath = path.join(rootDirectory, "node_modules", work.packageName, "package.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;

    return typeof manifest.version === "string" ? manifest.version : "";
}

/**
 * Create the works of one group as the Licenses page lists them.
 *
 * @param group - The group.
 * @param rootDirectory - The repository's root.
 * @returns The entries, in the list's order.
 */
export function createLicenseEntries(group: LicenseGroup, rootDirectory: string): Array<LicenseEntry>
{
    const entries = new Array<LicenseEntry>();

    for (const work of licensedWorks)
    {
        if (work.group === group)
        {
            entries.push({
                work,
                version: readWorkVersion(work, rootDirectory),
                textPath: work.licenseFiles.length > 0 ? "licenses/" + work.slug + ".txt" : undefined,
            });
        }
    }

    return entries;
}

/**
 * Create the license text of one work: a heading naming it, its version, copyright and source,
 * then its license and notices as they come.
 *
 * @param work - The work.
 * @param rootDirectory - The repository's root.
 * @returns The text.
 */
export function createLicenseText(work: LicensedWork, rootDirectory: string): string
{
    const version = readWorkVersion(work, rootDirectory);
    const lines = [
        work.name + (version ? " " + version : ""),
        "Copyright: " + work.holder,
        "License: " + work.license,
        "Source: " + work.sourceUrl,
    ];

    for (const file of work.licenseFiles)
    {
        lines.push("", fs.readFileSync(path.join(rootDirectory, file), "utf8").trimEnd());
    }

    return lines.join("\n") + "\n";
}

/**
 * Create the LICENSE.txt of one folder of the built site: the license texts of the works whose
 * files are in it.
 *
 * @param siteDirectory - The folder, relative to the built site's root: "_astro".
 * @param rootDirectory - The repository's root.
 * @returns The text.
 */
export function createDirectoryLicenseText(siteDirectory: string, rootDirectory: string): string
{
    const parts = [
        "Third-party software in this folder of the Open Paleo website, with its licenses.",
        "Every work the site uses is listed at https://open-paleo.org/licenses/.",
    ];

    for (const work of licensedWorks)
    {
        if (work.siteDirectories.includes(siteDirectory))
        {
            parts.push("", "=".repeat(78), "", createLicenseText(work, rootDirectory).trimEnd());
        }
    }

    return parts.join("\n") + "\n";
}

/**
 * Get the folders of the built site that get a LICENSE.txt.
 *
 * @returns The folders, relative to the built site's root, each once.
 */
export function getLicensedDirectories(): Array<string>
{
    const directories = new Array<string>();

    for (const work of licensedWorks)
    {
        for (const directory of work.siteDirectories)
        {
            if (!directories.includes(directory))
            {
                directories.push(directory);
            }
        }
    }

    return directories;
}
