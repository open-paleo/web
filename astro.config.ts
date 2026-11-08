import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

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
    // The sitemap lists every page for search engines. It needs the site's address, so local
    // builds without SITE_URL leave it out.
    integrations: process.env.SITE_URL ? [sitemap()] : [],
});
