# Open Paleo website

The website for [Open Paleo](https://github.com/open-paleo/data), a community-maintained
phylogenetic dataset for paleontology, published at **https://open-paleo.org**.

The site is generated from the dataset's built output, `dist/open-paleo.json`: a page for every
genus, clade and cited work, indexes to browse them, and full-text search. It changes only the
presentation. Every value on it comes from the dataset, which is backed by published literature.

The site is static, built with [Astro](https://astro.build/). Every page is plain HTML that works
with JavaScript off; scripts add search and the tree's open and close buttons. It targets WCAG
2.2 AA.

## What is on the site

| Page | Contents |
|------|----------|
| Home | Search, the release and its counts, a chart of genera through time whose stages and periods link to their pages, the major groups, the most recently named genera, and how to download, cite and contribute |
| Stage (26) | The genera known from one stage with their clades, ages and countries, the stage's place in the time scale, and links to the stages before and after |
| Period (3) | The period's stages as a chart, and its genera from A to Z |
| Genus (1,428) | Description, an age figure in the chart colors of the geologic time scale, diagnosis, each species with its type specimen, horizon and locality, synonyms, notable specimens, ICZN cases and references, beside an "at a glance" panel |
| Clade (188) | Description, the span of time its genera cover, diagnosis, the clades within it, and a list of the genera placed directly in it with their ages and countries |
| Reference (2,553) | One page per cited work: the full citation, the names first published in it, and every genus and clade that cites it |
| Genera | Every genus, A to Z, with its group, epochs and country, and filters for time, group, diet, locomotion, integument, status and year named that are kept in the page address |
| Tree | The classification as an outline you can open and close, with genus counts |
| References | Every cited work, by first author |
| Data | Downloads of the dataset's output files, how to cite a release, and the versioning policy |
| Search | Full-text search of the genus, clade and reference pages with [Pagefind](https://pagefind.app/), filtered by kind |

Still to come: filters on the Genera index, and a timeline of genera against the stage scale.

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
```

`check-site` needs Chromium once: `npx playwright install --only-shell chromium`.

The build reads the dataset from `../data/dist/open-paleo.json`, so clone
[open-paleo/data](https://github.com/open-paleo/data) beside this repository, or set
`OPEN_PALEO_DATA` to the directory that holds `open-paleo.json`.

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
