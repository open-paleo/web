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

Three scripts regenerate committed files, and are run by hand when their inputs change:
`npm run create-map-shapes` (the map outlines, see below), `npm run create-paleo-coastlines`
(the ancient coastlines, see below) and `npm run create-social-image` (the link preview image,
after a theme change).

The build reads the dataset from `../data/dist/open-paleo.json`, the glossary from
`../glossary/dist/glossary.json` and the outlines from `../media/dist/media.json`, so clone
[open-paleo/data](https://github.com/open-paleo/data),
[open-paleo/glossary](https://github.com/open-paleo/glossary) and
[open-paleo/media](https://github.com/open-paleo/media) next to this repository. Or set
`OPEN_PALEO_DATA`, `OPEN_PALEO_GLOSSARY` and `OPEN_PALEO_MEDIA` to the directories that hold the
files.

## Dependencies

- **Pin every dependency to an exact version**: `"eslint": "10.13.0"`, never `"^10.13.0"`. The
  repository's `.npmrc` sets `save-exact=true`, so `npm install <package>` writes an exact
  version. Upgrades are deliberate edits to `package.json`
- **Choose a release at least two weeks old** when adding or upgrading a package, so a broken
  or compromised release has time to be noticed and pulled. Open Paleo's own packages (such as
  the tree extractor) are exempt: the project builds and reviews them itself
- **No runtime dependencies in the browser.** Pages must work with JavaScript off; scripts add
  search, filters and interactive views on top. Three exceptions:
  - MapLibre GL JS draws the maps, on genus pages (when the map scrolls into view) and the Map
    page, over OpenStreetMap tiles from OpenFreeMap. Without JavaScript those pages list the
    same places in words. It also draws the Tree page's chart (`src/data/tree-chart.ts` lays it
    out as GeoJSON; `src/scripts/tree-chart-renderer.ts` draws it), with no tiles, only
    OpenFreeMap's fonts for the labels; without JavaScript the outline lists the same clades
  - The tree extractor (`@open-paleo/tree-extractor`) and Tesseract.js, its text recognition,
    run the tool at `tools/tree-extractor/`, which is a tool and needs JavaScript. Tesseract's
    core and language data are served from the site (`src/integrations/ocr-files.ts`) at the
    versions the tree extractor's README names
  - ONNX Runtime (`onnxruntime-web`, its WebAssembly build) runs the tool's optional second OCR
    engine, PaddleOCR, which reads again the labels Tesseract couldn't match. It loads only when
    a reader ticks "Read unmatched labels a second time". The build downloads the model from
    Hugging Face at a pinned revision, checks it against its checksum, and serves it from the
    site with its dictionary and license (`src/integrations/paddle-model.ts`)
  - The outline tracer (`@open-paleo/outline-tracer`), with potrace's WebAssembly build, runs
    the tool at `tools/outline-tracer/`, in a Web Worker. Both are GPL-licensed, so they stay in
    that worker's own file, and the page names the license and links to the source
  - Plausible's counting script, on every page of the published site only (builds with
    `SITE_URL` set), counts page views without cookies; the privacy page (`privacy/`) links to
    Plausible's data policy for what it records. A page works the same without it
- **Declare every outside service in `src/data/privacy.ts`**: the host serving the site and
  every host a page's browser contacts, with who runs it, what the site sends it, and a link to
  its own policy (the privacy page states what this site sends and links to each service for
  what it does with it, so the page doesn't go stale when their policies change). The privacy
  page lists them from there, and `npm run check-site` fails on any off-site
  host a checked page contacts that isn't declared. Any change to the policy also updates
  `privacyPolicyEffectiveDate`
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
| `src/integrations/` | Astro integrations: serving the tree extractor's OCR files, and downloading the second engine's model |
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
- The glossary is read the same way: only `dist/glossary.json` from open-paleo/glossary, with its
  bindings and schema version copied by `npm run update-bindings`, and a different major version
  refused

### How pages get the data

`src/data/` loads the dataset once per build and arranges it for the pages:

| Module | Contents |
|--------|----------|
| `locate-dataset.ts` | Finds `open-paleo.json`: `OPEN_PALEO_DATA`, then `./data/dist/`, then `../data/dist/`; and `glossary.json` and `media.json` the same way, with `OPEN_PALEO_GLOSSARY` and `glossary/dist/`, and `OPEN_PALEO_MEDIA` and `media/dist/` |
| `load-dataset.ts` | Reads and parses it, and checks the schema version |
| `site-data.ts` | `getSiteData()`: sorted genera, the clade tree with children and genus counts, every reference with the records that cite it, and URL slugs |
| `dataset.ts` | The dataset's types |
| `slugs.ts`, `urls.ts` | URL slugs and page paths, and the correction links |
| `format.ts`, `records.ts`, `taxon-names.ts` | Formatting values for display, reading records, and finding taxon names in prose |
| `age-figure.ts`, `time-pages.ts`, `home.ts` | The geologic timeline, the age figure, the stage and period pages, and the home page's chart and lists |
| `clades.ts`, `indexes.ts` | Clade spans and genera, and the A–Z indexes |
| `genus-index.ts`, `genus-filters.ts` | Lists of genera and of clades with their details, and the filters (shared with the browser) |
| `genus-map.ts`, `site-map.ts`, `map-shapes.ts`, `map-geometry.ts` | The genus maps, the Map page, and the region and country outlines |
| `citations.ts`, `feed.ts` | Citations of the dataset and its records, and the feed of new genera |
| `structured-data.ts` | The schema.org JSON-LD in the head of genus, clade and Data pages (see "Structured data" below) |
| `known-names.ts` | The taxon and clade names the tree extractor matches labels against |
| `glossary.ts` | `getGlossary()`: the glossary's terms in order, and finding them in text |
| `media.ts` | `getMedia()`: the outlines by genus or clade, `findGenusOutline()`: a genus's own outline, or that of the nearest clade above it that has one, and `findCladeOutline()`: a clade's own outline, or else its type genus's |
| `prose-links.ts` | `getProseLinks()`: the pages that genus, species, clade, rock unit and geologic time names in prose link to |
| `units.ts` | `getUnits()`: the rock units arranged into pages, one per formation, group or other top-level unit with genera, with members and beds as sections of their unit's page; `getUnitDescription()`: the dataset's description of a unit, or a standard one built from its rank, parent, age and earliest-named genera when it has none |

Pages call `getSiteData()` from their frontmatter or `getStaticPaths()`; the first call loads
the file and later calls reuse the result.

### Links in prose

`Prose` links names and glossary terms in dataset text when it is given `linkTerms`, each once
per block. Blocks that should link each once between them share a set of what is already linked
through `linkedTerms` instead, as the items of `DiagnosisList` do. A name or term whose page is
the current page stays plain. In order, `Prose` finds:

1. Genus and species names (the ones it already italicizes), linked through
   `src/data/prose-links.ts` to the genus page or the species' section; synonyms lead to the
   genus or species they belong to, and an abbreviated name ("T. rex") links only when it
   belongs to one species.
2. In the rest of the text, the names of clades, rock units (as displayed, with the rank word
   capitalized or not, and their variants), stages and periods with pages, and epochs, which link
   to their row on the Time scale page (`time/#late-cretaceous`). Matched as whole words,
   case-sensitively, longest first.
3. In what is left, glossary terms. Forms are matched case-insensitively as whole words, longest
   first, never inside hyphenated words or etymologies. Statuses, placements and specimen
types link through `findGlossaryEntry()` when the whole value is a form. Each link goes to the
term's entry on the Glossary page; with JavaScript, `src/scripts/glossary-popover.ts` shows the
definition beside the term instead.

### Tests

`npm test` runs `node:test` over `test/*.test.ts`. Tests read `test/fixtures/open-paleo.json`,
a small dataset cut from the real one by `npm run create-test-fixture`: a few named genera,
plus the first genus that shows each case the tests need (a nomen dubium, an ICZN case,
reference keys with accents and apostrophes, a type species dated to an epoch but no stage, one
with published coordinates and one known only to its country, and one with a nicknamed type
specimen). Tests read it with `readFixture()` from `test/fixture.ts`, which uses the schema
version the bindings describe, so after a schema change `npm run update-bindings` and
`npm run create-test-fixture` are all that's needed; review the fixture's diff. The same script
copies the glossary whole to `test/fixtures/glossary.json`, read with `readGlossaryFixture()`.
Tests never use invented records.

### Structured data

Genus, clade and Data pages describe their subject as schema.org JSON-LD, which
`BaseLayout.astro` writes into the head from its `structuredData` property:

- **Genus pages** follow the [Bioschemas Taxon profile](https://bioschemas.org/profiles/Taxon/1.0-RELEASE):
  the genus with its rank, parent clade, species (as its children, addressed by their section
  of the page), synonyms (`alternateName`, leaving out possible synonyms) and outside database
  entries (`sameAs`)
- **Clade pages** describe the clade the same way, but without a rank, which the dataset doesn't
  give and the profile requires, so they don't claim to follow it. Ask open-paleo/data for clade
  ranks rather than deriving them from a name's suffix
- **The Data page** describes the dataset for Google Dataset Search: release, license, citation
  and every file as a download

The types come from [`schema-dts`](https://www.npmjs.com/package/schema-dts), which is only type
declarations. JSON-LD addresses must be absolute, so, like the canonical link, it is written
only when the build has `SITE_URL`. `npm run check-site` checks that every JSON-LD script parses
and is a typed schema.org item. A new type is worth adding only when something reads it.

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

`public/paleo-coastlines/{stage}.json` holds the world's coastlines at the middle of each stage
the dataset's species are dated to, Carnian to Maastrichtian, from the plate model of Wright et
al. (2013) (the GPlates web service's GOLONKA; CC BY 3.0 AU). The data repository reconstructs
each species' ancient position with the same model, so the dots and the coastlines match. These
are today's coastlines moved to where the plates were, not ancient shorelines: they show where a
place was, not the seaways of the time, and maps label them so. Each file is simplified (0.12°,
land under 0.2 square degrees dropped) to about 60 KB compressed, and a map loads only the stage
it shows. `npm run create-paleo-coastlines` rebuilds them from the GPlates web service; rerun it
when the dataset gains a stage. Readers' browsers never contact GPlates.

Genus maps switch between today and each stage the species lived in. The dataset reconstructs
each species at its own age (`location.paleocoordinates`); the build rotates it again to its
stage's midpoint (`src/data/paleo-positions.ts`), so it sits on that stage's coastlines.
`src/data/plate-rotation.ts` does the rotation as GPlates does, with the published rotation file
of Wright et al. (2013) in `src/data/plate-models/wright-2013.rot`; `test/plate-rotation.test.ts`
checks it against the dataset's own reconstructions. A genus whose species have no
paleocoordinates gets no switch.

## Code style

ESLint enforces the formatting; run `npm run lint:fix` to apply it. The rules below are those of
open-paleo/data's [scripts/CONTRIBUTING.md](https://github.com/open-paleo/data/blob/main/scripts/CONTRIBUTING.md),
plus the stricter rules adopted in open-paleo/tools. Where the two differ, this file follows
open-paleo/tools.

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
- **The verb says what the function does with its result.** `get`, `find`, `create`, `read`
  and `build` return something; `list`, `show`, `display` and `print` put something in front of
  the reader. A function that returns the dated stages is `getDatedStages`, not
  `listDatedStages`, which would print them
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
  A component that only wraps slotted content declares none, and notes this in a comment
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
  components that add markup to prose (italic taxon names) build it from escaped parts. The one
  exception is the JSON-LD script in `BaseLayout.astro`, whose text comes from `writeJsonLd()`
  in `src/data/structured-data.ts`: it escapes `<`, `>` and `&`, so dataset text can't end the
  element
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
  (`src/scripts/search-suggestions.ts`, on the shared combobox in `src/scripts/name-combobox.ts`,
  which the Tree and References pages' find fields also use), from `search/suggestions.json`: every genus, species,
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
- **Colors, fonts, sizes and spacing come from tokens** in `src/theme/tokens.css`, and the clade
  colors in `src/theme/clade-colors.css` (one per clade in `src/data/clade-colors.ts`, checked by
  `test/clade-colors.test.ts`). No literal color appears in any other stylesheet. A new color is
  a new token, with a dark value if it changes in dark mode. See [docs/theme.md](docs/theme.md)
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
- A button's label describes what it does, and the result uses the same word ("Copy
  citation", then "Citation copied.")
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

`npm run check-site` checks the built site: every internal link resolves, every JSON-LD script
is valid (in builds with `SITE_URL`), and a sample of
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
commits a change is responsible for it, and commits drafted with an LLM note this in a
`Co-Authored-By` trailer.
