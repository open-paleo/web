import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

import type { AstroIntegration } from "astro";

import { createDirectoryLicenseText, getLicensedDirectories } from "../data/licenses.ts";

// Writes a LICENSE.txt into each folder of the built site that holds others' code or fonts
// (_astro/ for the bundles, and the tree extractor's OCR folders), naming the works in it with
// their licenses, so the notices travel with the files. The list is src/data/licenses.ts.

const rootDirectory = path.dirname(path.dirname(path.dirname(url.fileURLToPath(import.meta.url))));

/**
 * Write the LICENSE.txt files into a built site.
 *
 * @param outputDirectory - The built site's root.
 */
function writeLicenseFiles(outputDirectory: string): void
{
    for (const directory of getLicensedDirectories())
    {
        const target = path.join(outputDirectory, directory);

        fs.mkdirSync(target, { recursive: true });
        fs.writeFileSync(path.join(target, "LICENSE.txt"), createDirectoryLicenseText(directory, rootDirectory));
    }
}

/**
 * The integration: write the license files once the site is built.
 *
 * @returns The Astro integration.
 */
export function writeBundleLicenses(): AstroIntegration
{
    return {
        name: "license-files",
        hooks: {
            "astro:build:done": ({ dir }) =>
            {
                writeLicenseFiles(url.fileURLToPath(dir));
            },
        },
    };
}
