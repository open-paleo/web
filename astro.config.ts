import { defineConfig } from "astro/config";

// The site is static: every page is generated at build time from the dataset, and pages ship
// no JavaScript unless a component opts in.
//
// SITE_URL is the absolute address the site is published at (needed for canonical URLs and
// the sitemap), and SITE_BASE the path under it, such as "/web/" for
// open-paleo.github.io/web/. Both are set by the deploy workflow; local builds use "/".
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
});
