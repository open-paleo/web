# Open Paleo website

The website for [Open Paleo](https://github.com/open-paleo/data), a community-maintained
phylogenetic dataset for paleontology.

The site is generated from the dataset's built output, `dist/open-paleo.json`. It renders a
page for every genus, clade and cited reference, and adds search, filtering, a tree explorer
and a timeline. It changes only the presentation: every value on it comes from the dataset,
which is backed by published literature.

The site is built with [Astro](https://astro.build/) as a fully static site.

**Status:** the site generates a page for every genus (1,428), every clade with a record (188)
and every cited work (2,553), A–Z indexes of genera and references, the clade tree as an
outline, a Data page with downloads and citation, and full-text search with Pagefind. The home
page is a placeholder; filters on the genera index and the timeline come next.

## Planned site

| Page | Contents |
|------|----------|
| Home | Search, the release version and counts, ways into the data by clade, period, country and diet |
| Genera | Every genus in one table, filterable by clade, period, country, diet, locomotion, status and features |
| Genus | Description, diagnosis, species with type specimens, synonyms, notable specimens, ICZN cases and references, with an age figure and an "at a glance" panel |
| Clade | Description, diagnosis, and the clades and genera it contains |
| Tree | The full classification as a collapsible outline |
| Timeline | Genera as bars against the Permian–Eocene stage scale |
| Reference | One page per cited work, listing every record that cites it |
| Data | Downloads, how to cite, and the versioning policy |

Every page is static HTML and works with JavaScript off. The build writes about 4,100 pages.

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

npm run dev         # local server with live reload at http://localhost:4321/
npm run build       # write the site to dist/
npm run preview     # serve dist/ as it will be published

npm test            # unit tests against a fixture cut from the real dataset
npm run typecheck   # TypeScript and astro check
npm run lint        # ESLint (style and correctness)
npm run spellcheck  # cspell over Markdown, TypeScript, Astro and CSS
```

The build reads the dataset from `../data/dist/open-paleo.json`, so clone
[open-paleo/data](https://github.com/open-paleo/data) beside this repository, or set
`OPEN_PALEO_DATA` to the directory that holds `open-paleo.json`.

## Deployment

The site is published to GitHub Pages at https://open-paleo.org by a GitHub Actions workflow,
on every push to `main`, when the data repository publishes new output, and nightly. See
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
