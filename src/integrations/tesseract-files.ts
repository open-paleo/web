import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

import type { AstroIntegration } from "astro";

// Serves the files Tesseract.js loads at run time from the site itself, so the tree extractor
// makes no request off the site: Tesseract's worker script, its core (WebAssembly) and the
// English language data, at the versions the tree extractor is tested against (pinned in
// package.json). The build copies them into dist/; the dev server serves them from
// node_modules/. The tool page passes their locations to the viewer.

/**
 * One directory of files to serve, and where under the site.
 */
type ServedDirectory = {
    /**
     * Path under the site's base: "tools/tree-extractor/tesseract-core".
     */
    sitePath: string;

    /**
     * The directory in node_modules/ it comes from.
     */
    sourceDirectory: string;

    /**
     * Only these files, or every file when empty.
     */
    files: Array<string>;
};

/**
 * Where under the site's base the tree extractor's Tesseract files are served.
 */
export const tesseractSitePaths = {
    worker: "tools/tree-extractor/tesseract/worker.min.js",
    core: "tools/tree-extractor/tesseract-core",
    language: "tools/tree-extractor/tessdata",
};

const rootDirectory = path.dirname(path.dirname(path.dirname(url.fileURLToPath(import.meta.url))));
const modulesDirectory = path.join(rootDirectory, "node_modules");

const servedDirectories: Array<ServedDirectory> = [
    { sitePath: path.posix.dirname(tesseractSitePaths.worker), sourceDirectory: path.join(modulesDirectory, "tesseract.js", "dist"), files: ["worker.min.js"] },
    { sitePath: tesseractSitePaths.core, sourceDirectory: path.join(modulesDirectory, "tesseract.js-core"), files: [] },
    { sitePath: tesseractSitePaths.language, sourceDirectory: path.join(modulesDirectory, "@tesseract.js-data", "eng", "4.0.0_best_int"), files: [] },
];

const contentTypes = new Map<string, string>([
    [".js", "text/javascript; charset=utf-8"],
    [".wasm", "application/wasm"],
    [".gz", "application/gzip"],
]);

/**
 * List the files of a served directory: the named ones, or every regular file in it.
 *
 * @param directory - The directory.
 * @returns The file names.
 */
function listServedFiles(directory: ServedDirectory): Array<string>
{
    if (directory.files.length > 0)
    {
        return directory.files;
    }

    const files = new Array<string>();

    for (const entry of fs.readdirSync(directory.sourceDirectory, { withFileTypes: true }))
    {
        if (entry.isFile())
        {
            files.push(entry.name);
        }
    }

    return files;
}

/**
 * Find the file a dev-server request asks for, if it is one of the served files.
 *
 * @param requestPath - The request's path, without the site's base.
 * @returns The file's path on disk, or undefined.
 */
function findServedFile(requestPath: string): string | undefined
{
    for (const directory of servedDirectories)
    {
        const prefix = directory.sitePath + "/";

        if (requestPath.startsWith(prefix))
        {
            const name = requestPath.slice(prefix.length);

            if (listServedFiles(directory).includes(name))
            {
                return path.join(directory.sourceDirectory, name);
            }
        }
    }

    return undefined;
}

/**
 * The integration: copy the files into the build, and serve them in development.
 *
 * @param basePath - The site's base path, ending in "/".
 * @returns The Astro integration.
 */
export function serveTesseractFiles(basePath: string): AstroIntegration
{
    const base = basePath.endsWith("/") ? basePath : basePath + "/";

    return {
        name: "tesseract-files",
        hooks: {
            "astro:server:setup": ({ server }) =>
            {
                server.middlewares.use((request, response, next) =>
                {
                    const requestPath = new URL(request.url ?? "/", "http://localhost").pathname;
                    const file = requestPath.startsWith(base) ? findServedFile(requestPath.slice(base.length)) : undefined;

                    if (!file)
                    {
                        next();

                        return;
                    }

                    response.setHeader("Content-Type", contentTypes.get(path.extname(file)) ?? "application/octet-stream");
                    response.end(fs.readFileSync(file));
                });
            },
            "astro:build:done": ({ dir }) =>
            {
                const outputDirectory = url.fileURLToPath(dir);

                for (const directory of servedDirectories)
                {
                    const target = path.join(outputDirectory, directory.sitePath);

                    fs.mkdirSync(target, { recursive: true });

                    for (const name of listServedFiles(directory))
                    {
                        fs.copyFileSync(path.join(directory.sourceDirectory, name), path.join(target, name));
                    }
                }
            },
        },
    };
}
