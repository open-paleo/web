import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

import type { AstroIntegration } from "astro";

import { paddleModelDirectory, paddleModelFiles, preparePaddleModel } from "./paddle-model.ts";

// Serves the tree extractor's OCR files from the site, so it makes no request off the site:
// Tesseract.js's worker, core and language data, and for the second OCR engine, ONNX Runtime and
// the PaddleOCR model. The build copies them into dist/; the dev server serves them in place.

/**
 * One directory of files to serve, and where under the site.
 */
type ServedDirectory = {
    /**
     * Path under the site's base: "tools/tree-extractor/tesseract-core".
     */
    sitePath: string;

    /**
     * The directory it comes from.
     */
    sourceDirectory: string;

    /**
     * Only these files, or every file when empty.
     */
    files: Array<string>;
};

/**
 * Where under the site's base the tree extractor's OCR files are served.
 */
export const ocrSitePaths = {
    worker: "tools/tree-extractor/tesseract/worker.min.js",
    core: "tools/tree-extractor/tesseract-core",
    language: "tools/tree-extractor/tessdata",
    onnxRuntime: "tools/tree-extractor/onnxruntime",
    paddleModel: "tools/tree-extractor/paddleocr",
};

const rootDirectory = path.dirname(path.dirname(path.dirname(url.fileURLToPath(import.meta.url))));
const modulesDirectory = path.join(rootDirectory, "node_modules");

const servedDirectories: Array<ServedDirectory> = [
    // The worker's opening comment points to its notices file, which lists the libraries bundled
    // in it.
    { sitePath: path.posix.dirname(ocrSitePaths.worker), sourceDirectory: path.join(modulesDirectory, "tesseract.js", "dist"), files: ["worker.min.js", "worker.min.js.LICENSE.txt"] },
    { sitePath: ocrSitePaths.core, sourceDirectory: path.join(modulesDirectory, "tesseract.js-core"), files: [] },
    { sitePath: ocrSitePaths.language, sourceDirectory: path.join(modulesDirectory, "@tesseract.js-data", "eng", "4.0.0_best_int"), files: [] },
    // The WebAssembly build of ONNX Runtime, without the WebGPU and WebGL back ends.
    { sitePath: ocrSitePaths.onnxRuntime, sourceDirectory: path.join(modulesDirectory, "onnxruntime-web", "dist"), files: ["ort.wasm.min.mjs", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"] },
    { sitePath: ocrSitePaths.paddleModel, sourceDirectory: paddleModelDirectory, files: paddleModelFiles },
];

const contentTypes = new Map<string, string>([
    [".js", "text/javascript; charset=utf-8"],
    [".mjs", "text/javascript; charset=utf-8"],
    [".txt", "text/plain; charset=utf-8"],
    [".wasm", "application/wasm"],
    [".gz", "application/gzip"],
]);

/**
 * Get the files of a served directory: the named ones, or every regular file in it.
 *
 * @param directory - The directory.
 * @returns The file names.
 */
function getServedFiles(directory: ServedDirectory): Array<string>
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

            if (getServedFiles(directory).includes(name))
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
export function serveOcrFiles(basePath: string): AstroIntegration
{
    const base = basePath.endsWith("/") ? basePath : basePath + "/";

    return {
        name: "ocr-files",
        hooks: {
            "astro:config:setup": async () =>
            {
                await preparePaddleModel();
            },
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

                    for (const name of getServedFiles(directory))
                    {
                        fs.copyFileSync(path.join(directory.sourceDirectory, name), path.join(target, name));
                    }
                }
            },
        },
    };
}
