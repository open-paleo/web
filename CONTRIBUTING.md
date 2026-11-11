# Contributing to the Open Paleo website

This repository builds the website for the [Open Paleo dataset](https://github.com/open-paleo/data).
It holds code and design only. To correct or add a genus, clade or reference, contribute to
[open-paleo/data](https://github.com/open-paleo/data/blob/main/CONTRIBUTING.md) instead: the
site rebuilds from the dataset, so a data fix there appears here on the next deploy.

## Technology

- **[Astro](https://astro.build/)** as the static site generator. Every page is generated at
  build time from the dataset; pages ship no JavaScript unless a component opts in
- **TypeScript** for data modules, component logic, scripts and browser code
- **Node.js 24**. Standalone scripts run directly with `--experimental-strip-types`
- **TypeScript 7** checks `.ts` files; `astro check` checks `.astro` files with TypeScript 6.
  `typescript` is aliased to TypeScript 6 because typescript-eslint and Astro's checker need its
  JavaScript API (the same arrangement as open-paleo/data)
- **Plain CSS.** Global theme files plus component-scoped `<style>` blocks; no CSS framework
  or preprocessor

## Setup

```bash
git clone https://github.com/open-paleo/web.git
cd web
npm install

npm run dev       # local server with live reload at http://localhost:4321/ (no search)
npm run build     # write the site to dist/, then index it for search with Pagefind
npm run preview   # serve dist/ as it will be published, search included
```

Two scripts regenerate committed files, and are run by hand when their inputs change:
`npm run create-map-shapes` (the map outlines, see below) and `npm run create-social-image`
(the link preview image, after a theme change).

The build reads the dataset from `../data/dist/open-paleo.json`, so clone
[open-paleo/data](https://github.com/open-paleo/data) next to this repository, or set
`OPEN_PALEO_DATA` to the directory that holds `open-paleo.json`.

## Dependencies

- **Pin every dependency to an exact version**: `"eslint": "10.13.0"`, never `"^10.13.0"`. The
  repository's `.npmrc` sets `save-exact=true`, so `npm install <package>` writes an exact
  version. Upgrades are deliberate edits to `package.json`
- **Choose a release at least two weeks old** when adding or upgrading a package, so a broken
  or compromised release has time to be noticed and pulled. Open Paleo's own packages (such as
  the tree extractor) are exempt: the project builds and reviews them itself
- **No runtime dependencies in the browser.** Pages must work with JavaScript off; scripts add
  search, filters and interactive views on top. Two exceptions, each loaded only where it is
  used:
  - MapLibre GL JS draws the maps, on genus pages (when the map scrolls into view) and the Map
    page, over OpenStreetMap tiles from OpenFreeMap. Without JavaScript those pages list the
    same places in words
  - The tree extractor (`@open-paleo/tree-extractor`) and Tesseract.js, its text recognition,
    run the tool at `tools/tree-extractor/`, which is a tool and needs JavaScript. Tesseract's
    core and language data are served from the site (`src/integrations/tesseract-files.ts`) at
    the versions the tree extractor's README names
- Keep the shared development dependencies (ESLint, typescript-eslint, TypeScript, cspell) on
  the same versions as open-paleo/data, so the repositories lint and type-check alike

## Where things go

| Path | Contents |
|------|----------|
| `src/pages/` | One `.astro` file per page type; Astro turns each into one or more pages |
| `src/layouts/` | Page shells shared by the pages (`BaseLayout.astro`) |
| `src/components/` | Reusable components: dispute note, age figure, reference list and so on |
| `src/data/` | TypeScript that loads the dataset and prepares lookup tables for the pages |
| `src/scripts/` | Browser TypeScript: search, filters, maps, copy buttons and the tree extractor |
| `src/integrations/` | Astro integrations: serving the tree extractor's Tesseract files |
| `src/theme/` | The Strata theme: tokens, fonts, element defaults. See [docs/theme.md](docs/theme.md) |
| `public/` | Static files copied to the site unchanged: the site icon and the link preview image |
| `scripts/` | Standalone Node tooling that is not part of the Astro build |
| `docs/` | Design and architecture notes |
| `dist/` | Generated site output. Gitignored, never committed |
| `scratch/` | Generated reports and working files. Gitignored, never committed |

## The dataset is the only data source

- Read only the built output, `dist/open-paleo.json`. It is the dataset's versioned contract
  (see the data repository's
  [VERSIONING.md](https://github.com/open-paleo/data/blob/main/docs/VERSIONING.md)). The
  source YAML under `genera/`, `clades/` and `references/` can change shape between releases
- If the site needs something that is not in `dist/`, propose adding it to the data
  repository's build. Do not read source files around the contract
- Types for the dataset come from the data repository's generated bindings, copied into
  `src/data/bindings/` by `npm run update-bindings` along with the schema version they describe.
  Import them from `src/data/dataset.ts`. Never edit the copy by hand
- The build refuses a dataset whose schema has a different major version from the bindings,
  and warns on a different minor version. When the data repository publishes a new schema,
  run `npm run update-bindings`, fix what the type checker reports, and regenerate the test
  fixture
- Never write data values into templates or copy. Every value on the site comes from the
  dataset, which is backed by published literature

### How pages get the data

`src/data/` loads the dataset once per build and arranges it for the pages:

| Module | Contents |
|--------|----------|
| `locate-dataset.ts` | Finds `open-paleo.json`: `OPEN_PALEO_DATA`, then `./data/dist/`, then `../data/dist/` |
| `load-dataset.ts` | Reads and parses it, and checks the schema version |
| `site-data.ts` | `getSiteData()`: sorted genera, the clade tree with children and genus counts, every reference with the records that cite it, and URL slugs |
| `dataset.ts` | The dataset's types |
| `slugs.ts`, `urls.ts` | URL slugs and page paths, and the correction links |
| `format.ts`, `records.ts`, `taxon-names.ts` | Formatting values for display, reading records, and finding taxon names in prose |
| `age-figure.ts`, `time-pages.ts`, `home.ts` | The geologic timeline, the age figure, the stage and period pages, and the home page's chart and lists |
| `clades.ts`, `indexes.ts` | Clade spans and genera, and the A–Z indexes |
| `genus-index.ts`, `genus-filters.ts` | Lists of genera with their details, and the filters (shared with the browser) |
| `genus-map.ts`, `site-map.ts`, `map-shapes.ts`, `map-geometry.ts` | The genus maps, the Map page, and the region and country outlines |
| `citations.ts`, `feed.ts` | Citations of the dataset and its records, and the feed of new genera |
| `known-names.ts` | The taxon names the tree extractor matches labels against |

Pages call `getSiteData()` from their frontmatter or `getStaticPaths()`; the first call loads
the file and later calls reuse the result.

### Tests

`npm test` runs `node:test` over `test/*.test.ts`. Tests read `test/fixtures/open-paleo.json`,
a small dataset cut from the real one by `npm run create-test-fixture`: a few named genera,
plus the first genus that shows each case the tests need (a nomen dubium, an ICZN case,
reference keys with accents and apostrophes, a type species dated to an epoch but no stage, one
with published coordinates and one known only to its country). Regenerate it after a schema
change and review the diff. Tests never use invented records.

### Map outlines

`src/data/map-shapes.json` holds the region and country outlines the maps shade when a place is
known only to its region or country: Natural Earth 5.1.2 (public domain), simplified, and only
the regions and countries the dataset uses. Country outlines, used only as a coarse fallback,
are simplified in proportion to the country's size and lose islands under 0.5% of its largest
polygon, and every outline stops at 85° north and south, where the map's tiles end.
`npm run create-map-shapes` rebuilds it, downloading Natural Earth into `scratch/` the first
time. Rerun it when the build warns that a region has no
outline. Region codes Natural Earth records under an older code are mapped in the script; codes
it has no outline for at all are listed in the file, and their species are shaded at country
level.

## Code style

ESLint enforces the formatting; run `npm run lint:fix` to apply it. The rules below are those of
open-paleo/data's [scripts/CONTRIBUTING.md](https://github.com/open-paleo/data/blob/main/scripts/CONTRIBUTING.md),
plus the stricter rules adopted in open-paleo/tree-extractor. Where the two differ, this file
follows tree-extractor.

### Formatting

- **4-space indentation**, no tabs
- **Allman brace style**: opening braces on their own line, including single-statement `if`
  bodies. No braceless one-liners
- Double quotes, semicolons, trailing commas in multiline expressions
- A blank line after every block-like statement (`if`, `for`, `while` and so on)
- **A blank line before every `return`**
- Blank lines between type members
- If a call does not fit on one line, put every argument on its own line
- **Collapse sequential guards into `if`/`else if`** when adjacent `if` blocks each `return`,
  `continue` or `break`
- **No section separators** (`// ------`); use plain comments

### Functions

- **Every function name starts with a verb**, because a function does something:
  `renderGenusPage`, `createAgeFigure`, `findSynonymMatches`, `formatAuthority`,
  `getStageColor`. Not `genusPage` or `ageFigure`
- **Helpers are `function` declarations**, never arrows or function expressions assigned to a
  variable (ESLint's `func-style` enforces this). A bundle of functions sharing state is a class
- **Arrow functions only for callbacks passed to an API**, such as `addEventListener`, and only
  when the body is short. Omit the braces for a single expression
- **Be sparing with `map`, `filter`, `reduce`, `some` and similar.** Use plain loops, and
  always on anything that runs once per genus, species, reference or tree node: the build
  iterates over thousands of records
- **No functions declared inside loops.** Hoist the helper above the loop and pass what it
  needs as parameters

### Types

- **`type`, never `interface`**
- **`Array<T>`, never `T[]`**; `new Array<T>()` for an empty array
- **No anonymous object types.** A function that returns an object returns a named `type`, and
  no type has a field whose type is an inline object literal. Returning an object literal that
  matches a declared type is fine
- **No `any`.** Use real types, or `unknown` with a type guard
- **Omit inferable annotations on variables**; keep them on parameters and return types
- **Declare globals with types**, in a `.d.ts` file, never with `globalThis as { ... }` casts

### Naming

- **camelCase** for variables, functions and parameters; **PascalCase** for types; no
  `SCREAMING_SNAKE_CASE`
- **No leading or trailing underscores.** A single `_` is allowed only for an unused callback
  parameter
- **No abbreviations**: `element` not `el`, `button` not `btn`, `reference` not `ref`, `index`
  not `idx`, `event` not `evt`, `response` not `res`, `value` not `val`, `initialize` not
  `init`. This includes loop variables and callback parameters
- **American English** in identifiers, comments, documentation and site copy: color, gray,
  center, normalize, license (noun and verb), catalog

### Imports

- **Namespace imports with the `node:` protocol** for Node built-ins:
  `import * as fs from "node:fs"`
- **`import type`** for type-only imports

### General

- **`??` over `||`** for fallback values; keep `||` for boolean logic
- **`const` by default**; `let` only when the value is reassigned
- **Inline single-use variables** that are used only on the next line
- **No identity wrappers** such as `String()` on a value that is already a string

### Documentation

- **Multi-line JSDoc** on every function, type and type field, with `@param` and `@returns`
- A blank line between the description and the tags
- Each type field gets its own `/** ... */` block, separated by blank lines

### Example

```typescript
import * as fs from "node:fs";

import type { Genus } from "./dataset.ts";

/**
 * A genus's authority in zoological format.
 */
type Authority = {
    /**
     * Surnames, joined with "&" for two authors or shortened to "et al." for three or more.
     */
    names: string;

    /**
     * Year the genus was erected.
     */
    year: number;
};

/**
 * Count the genera that have a dispute summary.
 *
 * @param genera - Genus records keyed by name.
 * @returns How many carry a dispute.
 */
function countDisputedGenera(genera: Record<string, Genus>): number
{
    let count = 0;

    for (const name in genera)
    {
        if (genera[name].dispute)
        {
            count++;
        }
    }

    return count;
}
```

## Astro components

A component is an `.astro` file with three parts: TypeScript between `---` fences at the top
(the frontmatter), template markup, and a `<style>` block.

```astro
---
import type { Dispute } from "../data/dataset.ts";

/**
 * Properties of the dispute note.
 */
type Props = {
    /**
     * The record's dispute block.
     */
    dispute: Dispute;

    /**
     * What is disputed, as a question.
     */
    question: string;
};

const { dispute, question } = Astro.props;
---

<aside class="dispute-note">
    <p class="dispute-title">Disputed: {question}</p>
    <p>{dispute.summary}</p>
</aside>

<style>
    .dispute-note
    {
        padding: var(--space-4) var(--space-5);
        background: var(--color-caution-soft);
        border-radius: var(--radius);
    }
</style>
```

- **The frontmatter follows every TypeScript rule in this guide**, and ESLint checks it
- **Every component that takes properties declares a `Props` type** with JSDoc on each field.
  A component that only wraps slotted content declares none, and says so in a comment
- **Component file names are PascalCase nouns** (`DisputeNote.astro`), because a component is
  a thing on the page; page files under `src/pages/` are named for their URL
- **Keep data work out of components.** Sorting, grouping, look-ups and formatting belong in
  `src/data/` as tested functions; the frontmatter calls them and the template displays the
  result
- **`map` in template markup is allowed**, as the one exception to the rule on callbacks:
  `{species.map((item) => <SpeciesSection species={item} />)}` is how Astro repeats elements,
  and there is no loop form in a template. Keep the arrow to a single element; anything more
  belongs in the frontmatter or in `src/data/`
- **Whitespace in templates is kept as written.** HTML compression is off
  (`compressHTML: false` in `astro.config.ts`), so a line break between two inline parts
  renders as a space, and two parts that must touch go on the same line with nothing between
  them. Compression used to drop line breaks before expressions and tags ("in188 clades",
  "underCC BY") and ran neighboring elements together in the text Pagefind indexes for search.
  Output of a `map` has no whitespace between items, so a list of inline items needs explicit
  separators or a flex container
- **Wrap prose in one element before placing it in a grid or flex container.** Every text run and
  inline element directly inside a grid or flex container becomes an item of its own, so a
  sentence containing an italic name would split into separate cells
- **Astro escapes every `{value}` in the template.** Never use `set:html` on dataset text;
  components that add markup to prose (italic taxon names) build it from escaped parts
- ESLint does not check template markup or `<style>` blocks, so reviewers do: 4-space
  indentation, double-quoted attributes, Allman braces in CSS

## Search

[Pagefind](https://pagefind.app/) indexes the built site after `astro build` (part of
`npm run build`), and the search page (`src/pages/search/index.astro` with
`src/scripts/search.ts`) queries that index in the browser. There is no index under
`npm run dev`; use `npm run build` and `npm run preview` to try search.

- **Only record and time pages are indexed.** Genus, clade, reference, stage and period pages
  mark their `<article>` with `data-pagefind-body` and a `kind` filter (`Genus`, `Clade`,
  `Reference`, `Stage`, `Period`). Pages without `data-pagefind-body` (the index pages, the home
  page, the Map page) are left out
- **Parts that would add noise are excluded** with `data-pagefind-ignore`: the classification
  trail (every theropod page would match "Theropoda"), the age-figure bands, the reference list
  on genus and clade pages (the reference pages carry those citations), the external database
  links, the genus lists and charts on stage and period pages (every stage would match each of
  its genera), and the correction note
- **Names are weighted** with `data-pagefind-weight`: genus, clade, stage and period names 10,
  specimen nicknames 8
- **Ranking is tuned** in `search.ts` (`pageLength: 0.1`, `termFrequency: 0`) against queries with
  a known best page. With Pagefind's defaults, "Tyrannosaurus" ranked the Tyrannosaurus page
  14th, below short reference pages that mention it. Check a ranking change against such
  queries before making it
- **A query that is exactly a stage or period name puts its page first.** Weighting cannot do
  it: hundreds of reference titles contain "Jurassic", which ranked the Jurassic page 15th
- **The header and home page search fields suggest names as the reader types**
  (`src/scripts/search-suggestions.ts`), from `search/suggestions.json`: every genus, species,
  clade and synonym with its page, built by `src/data/search-suggestions.ts` and matched by
  `src/data/suggestion-matching.ts` (case and accents ignored; a whole name, then the start of the
  name, then the start of a later word, then anywhere). The list loads the first time a field is
  used. The fields follow the WAI-ARIA combobox pattern; without JavaScript they submit to the
  search page as before. The search page's own field has no list, since its results follow it
- **Excerpts are built as text nodes.** Pagefind returns excerpts as HTML with `<mark>` around
  matched words; the script keeps only those marks and inserts everything else as text

## CSS

- **Styles live with their component.** Each component's `<style>` block is scoped to that
  component by Astro. The global files in `src/theme/` hold only tokens, fonts and element
  defaults
- **Colors, fonts, sizes and spacing come from tokens** in `src/theme/tokens.css`. No literal
  color appears in any other stylesheet. A new color is a new token, with a dark value if it
  changes in dark mode. See [docs/theme.md](docs/theme.md)
- 4-space indentation and Allman braces, matching the TypeScript: selector on its own line,
  opening brace on the next
- **Class names are full words** describing what the element is: `.species-box`,
  `.age-figure`, `.status-badge`. No abbreviations (`.ns-card`), no utility classes
  (`.mt-4`), no presentational names (`.green-text`)
- Keep specificity flat: one class per selector where possible, no IDs, no `!important`
  (except the reduced-motion rule in `base.css`)
- Lay out sibling groups with flex or grid and `gap`, not margins on each child
- Respect `prefers-reduced-motion`; give every focusable element a visible `:focus-visible`
  state
- Every page works at 320px wide with no horizontal scroll (`npm run check-site` checks it); only
  tables, charts and code scroll sideways, inside their own `overflow-x: auto` container

## HTML

- Semantic elements first: `article`, `nav`, `aside`, `figure`, `dl`, `table`. A `div` only
  when nothing else fits
- Every page works with JavaScript off. Scripts enhance what is already rendered
- Every genus and species name is wrapped in an element with `class="taxon"`
- Attributes are double-quoted; every non-void element is closed
- Every form control has an `id` and a label

## Writing site copy

- Plain, specific English from the reader's side: "Show 6 more ranks", not "Expand"
- Sentence case for headings, buttons and navigation
- A button says what it does, and the result uses the same word ("Copy citation", then
  "Citation copied.")
- Paleontological terms (holotype, nomen dubium, junior subjective synonym) are used as they
  are, not replaced with paraphrases
- Never state a fact about a taxon in copy; facts come from the dataset

## Before opening a pull request

```bash
npm run typecheck
npm run lint
npm run spellcheck
npm test
npm run build
npm run check-site
```

`npm run check-site` checks the built site: every internal link resolves, and a sample of
pages (one of each kind, plus the records with the most unusual content) passes WCAG 2.2 AA in
axe in light and dark mode, has no grid or flex container that splits prose into columns (loose
text beside a link, italic name or span; a checkbox beside its label text is fine),
and does not scroll sideways in a 320px window. It needs Chromium once:
`npx playwright install --only-shell chromium`. The sample is listed in
`scripts/check-site.ts`; if a record in it leaves the dataset, replace it with one that shows the
same thing.

All six run in CI on every pull request, against the current `main` of open-paleo/data, and
every deployment runs the site check before publishing. Add words that the spell checker
rejects but are correct (taxon names, font names) to `cspell.json`. Note the change in
`CHANGELOG.md`, under today's date.

## AI and LLM use

The project policy in the data repository's
[README](https://github.com/open-paleo/data#ai-and-llm-use) applies here: the person who
commits a change is responsible for it, and commits drafted with an LLM say so in a
`Co-Authored-By` trailer.
