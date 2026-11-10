# Open Paleo website

The website for [Open Paleo](https://github.com/open-paleo/data), a community-maintained
phylogenetic dataset for paleontology, published at **https://open-paleo.org**.

The site is generated from the dataset's built output, `dist/open-paleo.json`: a page for every
genus, clade and cited work, indexes to browse them, and full-text search. It changes only the
presentation. Every value on it comes from the dataset, which is backed by published literature.

The site is static, built with [Astro](https://astro.build/). Every page is plain HTML that works
with JavaScript off; scripts add search, filters, the tree's open and close buttons, copy
buttons and the interactive maps, whose places are also listed in words. It targets WCAG 2.2
AA, checked on every deployment.

## What is on the site

| Page | Contents |
|------|----------|
| Home | Search, the release and its counts, a chart of genera through time whose stages and periods link to their pages, the major groups, the most recently named genera, and how to download, cite and contribute |
| Stage | One per stage with genera: the genera known from it with their clades, ages and countries, the stage's place in the time scale, and links to the stages before and after |
| Period | One per period with genera: its stages as a chart, and its genera from A to Z |
| Genus | One per genus: description, an age figure in the chart colors of the geologic time scale, a map of where each species was found (a dot for published coordinates, the region or country shaded otherwise), diagnosis, each species with its type specimen, horizon and locality, synonyms, notable specimens, ICZN cases and references, beside an "At a glance" panel; then how to cite the record and a link to suggest a correction |
| Clade | One per clade with a record: description, the span of time its genera cover, diagnosis, the clades within it, the genera placed directly in it with their ages and countries, how to cite the record, and a link to suggest a correction |
| Reference | One per cited work: the full citation, the names first published in it, every genus and clade that cites it, and a link to suggest a correction |
| Genera | Every genus, A to Z, with its group, epochs and country, and filters for time, group, diet, locomotion, integument, status and year named that are kept in the page address |
| Map | Where every genus's type species was found, on a world map: regions shaded by how many genera come from them, dots for published coordinates, the genera of a selected region, the Genera page's filters, and an index of genera by country and region that works without JavaScript |
| Feed | `feed.xml`, an Atom feed of the 50 most recently named genera, linked from every page's head and the home page |
| Tree | The classification as an outline you can open and close, with genus counts |
| References | Every cited work, by first author |
| Data | Downloads of the dataset's output files, how to cite a release, the versioning policy, and the tools |
| Tools | The site's tools, from the header's "Tools" item: for now the tree extractor |
| Tree extractor (beta) | `tools/tree-extractor/`: [open-paleo/tree-extractor](https://github.com/open-paleo/tree-extractor) in the site's theme, reading a tree from a figure into Newick or Nexus in the browser, with labels matched against the dataset's names. Its text recognition (Tesseract.js) is served from the site, so nothing leaves the reader's computer |
| Search | Full-text search of the genus, clade, reference, stage and period pages with [Pagefind](https://pagefind.app/), filtered by kind |

Every page also has link-preview tags (Open Graph and Twitter cards) and a sitemap entry.
Corrections go to the data repository through its correction form, and citations follow the
form the data repository recommends.

## Theme

The site uses the **Strata** theme: geologic time in the International Commission on
Stratigraphy chart colors, cool limestone neutrals, a glauconite green accent, and the Alegreya
and Alegreya Sans type families, self-hosted. See [docs/theme.md](docs/theme.md).

## Development

Requires **Node.js 24** or later.

```bash
git clone https://github.com/open-paleo/web.git
cd web
npm install

npm run dev         # local server with live reload at http://localhost:4321/ (no search)
npm run build       # write the site to dist/ and index it for search
npm run preview     # serve dist/ as it will be published, search included

npm test            # unit tests against a fixture cut from the real dataset
npm run typecheck   # TypeScript and astro check
npm run lint        # ESLint (style and correctness)
npm run spellcheck  # cspell over Markdown, TypeScript, Astro and CSS
npm run check-site  # after a build: links, axe (WCAG 2.2 AA) and 320px reflow on dist/

npm run create-map-shapes  # rebuild the map's region outlines from Natural Earth
npm run create-social-image  # redraw public/social-preview.png, the link preview image
```

`check-site` needs Chromium once: `npx playwright install --only-shell chromium`.

The build reads the dataset from `../data/dist/open-paleo.json`, so clone
[open-paleo/data](https://github.com/open-paleo/data) beside this repository, or set
`OPEN_PALEO_DATA` to the directory that holds `open-paleo.json`.

## Maps

Genus pages and the Map page show where species were found on interactive maps: MapLibre GL JS over
[OpenFreeMap](https://openfreemap.org)'s vector tiles of
[OpenStreetMap](https://www.openstreetmap.org/copyright) data (© OpenStreetMap contributors,
ODbL), restyled in the site's colors. Readers' browsers fetch the tiles from openfreemap.org; no
other page makes a request outside the site. Region and country outlines are from
[Natural Earth](https://www.naturalearthdata.com) (public domain).

## Tree extractor

The tool page uses a pinned release of `@open-paleo/tree-extractor` (a tarball from its GitHub
releases) and serves Tesseract.js's worker, core and English language data from the site. When
the tree extractor publishes a release, `.github/workflows/tree-extractor-update.yml` pins it,
runs every check, and opens a pull request.

## Icon

The site icon (`public/favicon.ico`, `public/apple-touch-icon.png`) is a stand-in until the
project has its own logo: the "rock" fossil icon by Smashicons from
[Flaticon](https://www.flaticon.com/free-icons/fossil), redrawn in light strokes on the header's
dark green. Its free license requires the attribution in every page's footer; remove that line
when the icon is replaced.

## Deployment

The site is published to GitHub Pages at https://open-paleo.org by a GitHub Actions workflow:
on every push to `main`, when the data repository's build changes its output, and nightly. See
[docs/deployment.md](docs/deployment.md) for the triggers and the one-time domain setup.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the code style and conventions. To fix or add data,
contribute to [open-paleo/data](https://github.com/open-paleo/data) instead; the site picks up
the change on its next build.

## License

- **Code** in this repository is licensed under the [MIT License](LICENSE).
- **Data** shown on the site comes from the Open Paleo dataset and is licensed under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), attributed to Open Paleo
  contributors. Rendered pages carry that attribution.
- **Fonts** in `src/theme/fonts/` (Alegreya and Alegreya Sans) are licensed under the
  [SIL Open Font License 1.1](src/theme/fonts/OFL-Alegreya.txt).
