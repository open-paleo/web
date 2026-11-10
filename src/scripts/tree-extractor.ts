// The tree extractor's page. The <tree-extractor> element (from @open-paleo/tree-extractor) is
// written into the page with the locations of Tesseract's files; this script adds the location
// of the extraction worker, which the bundler builds, and the loader for Tesseract.js, then
// defines the element, which mounts the tool.

import type { TreeExtractorElement } from "@open-paleo/tree-extractor/element";
import { defineTreeExtractorElement } from "@open-paleo/tree-extractor/element";
import type { TesseractLike } from "@open-paleo/tree-extractor";
import "@open-paleo/tree-extractor/viewer.css";
import workerUrl from "@open-paleo/tree-extractor/worker?worker&url";

/**
 * Load Tesseract.js from the site's own bundle, the first time the tool reads labels.
 *
 * @returns The Tesseract.js API.
 */
async function loadTesseract(): Promise<TesseractLike>
{
    const module = await import("tesseract.js/dist/tesseract.esm.min.js");

    return module.default;
}

/**
 * Give the element its worker and Tesseract loader, and define it.
 */
function initializeTreeExtractor(): void
{
    const element = document.querySelector<TreeExtractorElement>("tree-extractor");

    if (!element)
    {
        return;
    }

    element.setAttribute("worker-url", workerUrl);
    element.loadTesseract = loadTesseract;
    defineTreeExtractorElement();
}

initializeTreeExtractor();
