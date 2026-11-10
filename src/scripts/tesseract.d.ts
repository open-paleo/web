// Tesseract.js ships an ES module build without type declarations of its own for that path. Its
// default export is the Tesseract.js API, which the tree extractor's loader expects.
declare module "tesseract.js/dist/tesseract.esm.min.js"
{
    import type { TesseractLike } from "@open-paleo/tree-extractor";

    const tesseract: TesseractLike;

    export default tesseract;
}
