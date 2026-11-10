import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import { serveTesseractFiles } from "./src/integrations/tesseract-files.ts";

// The site is static: every page is generated at build time from the dataset, and pages ship
// no JavaScript unless a component opts in.
//
// SITE_URL is the absolute address the site is published at (needed for canonical URLs, the
// sitemap and robots.txt), and SITE_BASE the path under it. The deploy workflow sets
// https://open-paleo.org and "/"; a copy published under a path, such as
// open-paleo.github.io/web/, would set SITE_BASE to "/web/". Local builds set neither.
export default defineConfig({
    site: process.env.SITE_URL,
    base: process.env.SITE_BASE ?? "/",
    output: "static",
    outDir: "dist",
    trailingSlash: "always",
    // Keep the whitespace between elements as the templates write it. Compression removes it
    // between neighboring inline elements, which runs words together in text that Pagefind
    // extracts for search ("Found 1971iconic") and has dropped spaces before links and values.
    compressHTML: false,
    build: {
        format: "directory",
    },
    // MapLibre is one 1.1 MB chunk, loaded only when a map scrolls into view, so the default
    // 500 kB warning would fire on every build without pointing at a problem.
    vite: {
        build: {
            chunkSizeWarningLimit: 1200,
        },
    },
    // The sitemap lists every page for search engines. It needs the site's address, so local
    // builds without SITE_URL leave it out. The tree extractor's OCR files are served from the
    // site in every build (src/integrations/tesseract-files.ts).
    integrations: process.env.SITE_URL
        ? [sitemap(), serveTesseractFiles(process.env.SITE_BASE ?? "/")]
        : [serveTesseractFiles(process.env.SITE_BASE ?? "/")],
});
