# Changelog

## Unreleased

### Added

- Genus pages (`genus/{slug}/`, one per genus): classification trail, name, authority and
  pronunciation, description with genus and species names set in italics, dispute note,
  etymology, diagnosis, a section per species with its type-specimen label and synonyms,
  notable specimens, ICZN cases, the reference list, and an "at a glance" panel
- The age figure on genus pages: the Mesozoic periods and the stages of the type species'
  epoch in ICS colors, with the record's range outlined and the time outside it dimmed. It
  reads the `timescale` the dataset publishes from schema 3.3.0; the bindings are updated to
  3.3.0
- Components: `AgeFigure`, `Prose`, `StatusBadge`, `DisputeNote`, `LineageTrail`, `Citation`,
  `CitationLink`, `ReferenceList`, `DiagnosisList`, `SpecimenLabel`, `SynonymTable`,
  `NotableSpecimenList`, `IcznCaseList`, `SpeciesSection`, `GlancePanel`
- Formatting helpers in `src/data/format.ts` and `src/data/records.ts`, and the taxon-name
  matcher in `src/data/taxon-names.ts`, with tests
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
