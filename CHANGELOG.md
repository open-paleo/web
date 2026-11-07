# Changelog

## Unreleased

### Added

- Data loading in `src/data/`: locating `open-paleo.json`, a schema-version check against the
  copied bindings, and lookup tables for the pages (sorted genera, the clade tree with children
  and genus counts, every reference with the records that cite it, and URL slugs). The home
  page shows the release version and counts
- `npm run update-bindings` copies the dataset's TypeScript bindings and records their schema
  version; `npm run create-test-fixture` cuts a small test dataset from the real one
- Unit tests (`npm test`), and a CI step that checks out open-paleo/data's `dist/` and runs them
- Astro 7 as the static site generator: configuration for directory-style URLs and a
  configurable base path, a base layout that loads the theme, a placeholder home page, ESLint
  rules for component code, `astro check` in type checking, and a build step in CI

- Repository infrastructure: README, contributor and style guide, Claude Code instructions,
  MIT license, code of conduct, ESLint, TypeScript and cspell configuration, and a CI workflow
  that runs type checking, linting and spell checking
- The Strata theme (`src/theme/`): color tokens for light and dark, International Commission on
  Stratigraphy colors for every period, epoch and stage in the dataset's schema, a type and
  spacing scale, element defaults, and self-hosted Alegreya and Alegreya Sans fonts
