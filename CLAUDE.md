# Claude Code Instructions

## Code style

All code in this repository (TypeScript, CSS and HTML) must follow
[CONTRIBUTING.md](CONTRIBUTING.md). Read it before writing or modifying any code.

Rules that are easy to miss:

- **Allman braces everywhere**, including single-statement `if` bodies and CSS rules
- **A blank line before every `return`**
- **Every function name starts with a verb**: `renderGenusPage`, not `genusPage`
- **Helpers are `function` declarations**, not arrows assigned to a variable; arrows only for
  short callbacks passed to an API
- **Plain loops over `map`/`filter`/`reduce`** on anything that runs per record; no functions
  declared inside loops
- **No anonymous object types**; every returned object has a named `type`
- **`type` not `interface`, `Array<T>` not `T[]`**, no `any`
- **No abbreviated names**: `element`, `reference`, `index`, `event`, `initialize`
- **American English** in code, comments, docs and site copy
- **Multi-line JSDoc** on every function, type and type field
- **Exact dependency versions**; no `^` or `~` in `package.json`

Run `npm run typecheck`, `npm run lint` and `npm run spellcheck` before considering code
complete.

## Theme

The site uses the Strata theme, documented in [docs/theme.md](docs/theme.md).

- No literal colors outside `src/theme/tokens.css`. A new color is a new token, defined on bare
  `:root` and, if it changes in dark mode, redefined identically in both dark blocks
- Geologic time colors are used only in age graphics
- Every genus and species name gets `class="taxon"` (italic); clade names stay roman
- No all-caps labels, no monospace, no decorative numbering

## Data

- The site reads only `dist/open-paleo.json` from open-paleo/data, the versioned output
  contract. Never read the data repository's source YAML
- If the site needs something that is not in `dist/`, raise it as a change to the data
  repository's build; do not work around the contract
- Never write a fact about a taxon into a template or into copy. Every value comes from the
  dataset

## Git workflow

**Do not commit or push unless explicitly told to.** Show the changes and wait for the user to
say to commit or push.

## Generated output

The generated site goes in `public/`, and reports and working files go in `scratch/`. Neither is
ever committed. Anything in `scratch/` worth keeping belongs in a GitHub issue.
