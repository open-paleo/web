# Contributing to the Open Paleo website

This repository builds the website for the [Open Paleo dataset](https://github.com/open-paleo/data).
It holds code and design only. To correct or add a genus, clade or reference, contribute to
[open-paleo/data](https://github.com/open-paleo/data/blob/main/CONTRIBUTING.md) instead: the
site rebuilds from the dataset, so a data fix there appears here on the next deploy.

## Technology

- **TypeScript** for the build scripts (`scripts/`) and the browser code (`src/site/`)
- **Node.js 24**, running TypeScript directly with `--experimental-strip-types`; no build step
  for the scripts
- **TypeScript 7** for `npm run typecheck`; `typescript` itself is aliased to TypeScript 6
  because typescript-eslint needs its JavaScript API (the same arrangement as open-paleo/data)
- **Plain CSS and HTML.** No framework, no CSS preprocessor, no runtime dependencies in the
  browser

## Setup

```bash
git clone https://github.com/open-paleo/web.git
cd web
npm install
```

The build reads the dataset from `../data/dist/open-paleo.json`, so clone
[open-paleo/data](https://github.com/open-paleo/data) next to this repository, or set
`OPEN_PALEO_DATA` to the directory that holds `open-paleo.json`.

## Dependencies

- **Pin every dependency to an exact version**: `"eslint": "10.13.0"`, never `"^10.13.0"`. The
  repository's `.npmrc` sets `save-exact=true`, so `npm install <package>` writes an exact
  version. Upgrades are deliberate edits to `package.json`
- **No runtime dependencies in the browser.** Pages must work with JavaScript off; scripts add
  search, filters and interactive views on top
- Keep development dependencies on the same versions as open-paleo/data, so the three
  repositories lint and type-check alike

## Where things go

| Path | Contents |
|------|----------|
| `scripts/` | Build tooling run by Node: reading the dataset, rendering pages, writing indexes |
| `src/site/` | Browser TypeScript: search, filters, the tree and timeline views |
| `src/theme/` | The Strata theme: tokens, fonts, element defaults. See [docs/theme.md](docs/theme.md) |
| `docs/` | Design and architecture notes |
| `public/` | Generated site output. Gitignored, never committed |
| `scratch/` | Generated reports and working files. Gitignored, never committed |

## The dataset is the only data source

- Read only the built output, `dist/open-paleo.json`. It is the dataset's versioned contract
  (see the data repository's
  [VERSIONING.md](https://github.com/open-paleo/data/blob/main/docs/VERSIONING.md)). The
  source YAML under `genera/`, `clades/` and `references/` can change shape between releases
- If the site needs something that is not in `dist/`, propose adding it to the data
  repository's build. Do not read source files around the contract
- Types for the dataset come from the data repository's generated bindings
  (`dist/bindings/open-paleo.d.ts`), not from hand-written copies
- Never write data values into templates or copy. Every value on the site comes from the
  dataset, which is backed by published literature

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
- **Declare globals with types**, in a `.d.ts` (`src/site/globals.d.ts`), never with
  `globalThis as { ... }` casts

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

## CSS

- **Colors, fonts, sizes and spacing come from tokens** in `src/theme/tokens.css`. No literal
  color appears in any other stylesheet. A new color is a new token, with a dark value if it
  changes in dark mode. See [docs/theme.md](docs/theme.md)
- 4-space indentation and Allman braces, matching the TypeScript: selector on its own line,
  opening brace on the next
- **Class names are full words** describing what the element is: `.specimen-label`,
  `.age-figure`, `.status-badge`. No abbreviations (`.ns-card`), no utility classes
  (`.mt-4`), no presentational names (`.green-text`)
- Keep specificity flat: one class per selector where possible, no IDs, no `!important`
  (except the reduced-motion rule in `base.css`)
- Lay out sibling groups with flex or grid and `gap`, not margins on each child
- Respect `prefers-reduced-motion`; give every focusable element a visible `:focus-visible`
  state
- Every page works at 400px wide with no horizontal scroll; only tables and diagrams scroll
  sideways, inside their own `overflow-x: auto` container

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
  "Copied")
- Paleontological terms (holotype, nomen dubium, junior subjective synonym) are used as they
  are and explained in the glossary, not replaced with paraphrases
- Never state a fact about a taxon in copy; facts come from the dataset

## Before opening a pull request

```bash
npm run typecheck
npm run lint
npm run spellcheck
```

All three run in CI on every pull request. Add words that the spell checker rejects but are
correct (taxon names, font names) to `cspell.json`.

## AI and LLM use

The project policy in the data repository's
[README](https://github.com/open-paleo/data#ai-and-llm-use) applies here: the person who
commits a change is responsible for it, and commits drafted with an LLM say so in a
`Co-Authored-By` trailer.
