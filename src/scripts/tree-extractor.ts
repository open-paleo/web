// The tree extractor's page: gives the <tree-extractor> element the extraction worker's location
// and the loaders for Tesseract.js and the second OCR engine, then defines the element, which
// mounts the tool.

import type { SecondOcrLoader, TreeExtractorElement } from "@open-paleo/tree-extractor/element";
import { defineTreeExtractorElement } from "@open-paleo/tree-extractor/element";
import type { TesseractLike } from "@open-paleo/tree-extractor";
import type { OrtLike } from "@open-paleo/tree-extractor/paddle";
import { createPaddleOcr } from "@open-paleo/tree-extractor/paddle";
import type * as OnnxRuntime from "onnxruntime-web/wasm";
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
/**
 * The second OCR engine.
 */
type SecondOcrEngine = Awaited<ReturnType<SecondOcrLoader>>;

/**
 * ONNX Runtime, as the second OCR engine uses it, with its settings. Its own types allow tensors
 * of strings, which the engine's narrower type doesn't, so the module is cast to this.
 */
type OnnxRuntimeModule = OrtLike & Pick<typeof OnnxRuntime, "env">;

/**
 * Load the second OCR engine, PaddleOCR on ONNX Runtime, from the files this site serves.
 *
 * @param runtimePath - The folder of ONNX Runtime's files, ending in "/".
 * @param modelPath - The folder of the model and its dictionary, ending in "/".
 * @returns The engine.
 */
async function loadPaddleOcr(runtimePath: string, modelPath: string): Promise<SecondOcrEngine>
{
    const runtimeUrl = new URL(runtimePath, location.href).href;
    const modelUrl = new URL(modelPath, location.href).href;
    const ort = await import(/* @vite-ignore */ runtimeUrl + "ort.wasm.min.mjs") as OnnxRuntimeModule;

    // One thread: the page isn't cross-origin isolated, which threads need.
    ort.env.wasm.wasmPaths = runtimeUrl;
    ort.env.wasm.numThreads = 1;

    const dictionary = await (await fetch(modelUrl + "dict.txt")).text();

    return createPaddleOcr(ort, modelUrl + "inference.onnx", dictionary);
}

function initializeTreeExtractor(): void
{
    const element = document.querySelector<TreeExtractorElement>("tree-extractor");

    if (!element)
    {
        return;
    }

    element.setAttribute("worker-url", workerUrl);
    element.loadTesseract = loadTesseract;

    const runtimePath = element.dataset.onnxRuntimePath;
    const modelPath = element.dataset.paddleModelPath;

    // Set before the element is defined: it shows the second-reading checkbox only if this is set
    // when it mounts.
    if (runtimePath && modelPath)
    {
        element.loadSecondOcr = () => loadPaddleOcr(runtimePath, modelPath);
    }

    defineTreeExtractorElement();
}

initializeTreeExtractor();
