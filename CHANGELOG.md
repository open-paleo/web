# Changelog

## Unreleased

### Changed

- Accessibility and readability pass. The age figure no longer dims time outside a record's
  range, which had dropped band labels to 1.15:1; the range is marked by a double ring
  instead, band text is near-black (`#0c0e0f`) or white by measured contrast, and a test checks
  every band reaches 4.5:1. The type scale is larger (body 18px, nothing below 14px). Genus,
  clade and reference pages are divided into sections whose larger headings are underlined by a
  rule spanning the section; species sit
  under one Species section; a genus's etymology moves into the header; the dispute is its own
  section with a quieter panel. axe-core reports no WCAG 2.2 AA violations on the audited pages
  in either theme
- The fact panel beside genus, clade and reference pages ("At a glance", "About this work") is
  a titled box on the surface color with a firm border, and the side column is 21rem wide
- Record pages float the fact panel at the top right instead of reserving a right-hand column
  for the whole page, so sections below it use the full width (`RecordMain.astro`)
- Each species is a box holding its type specimen, horizon, locality and diagnosis as labeled
  rows, with its synonyms as a stacked list; a genus's species boxes sit two side by side where
  they fit
- Scrollable tables are keyboard-focusable, labeled regions
- A notable specimen's name sits above its details. Nicknames are quoted (“Fighting
  Dinosaurs”), descriptive names are not (Berlin specimen), and an unnamed specimen is headed by
  its catalog number
- Short citations that would read alike within a record get the letter from their reference
  key: "O'Connor et al. (2025a)" and "(2025b)"
- The Paleocene and Eocene belong to the Paleogene in the age figure, which has a chart color
  for it


### Added

- Reference pages (`reference/{slug}/`, one for each of the 2,553 cited works): kind of work,
  title, authors and year, the full citation, the names first published in the work (genera,
  species and clades, linking to their pages or species sections), and every genus and clade
  that cites it with that record's note, each linking to the work in the record's reference
  list. Every internal link on the site now resolves
- Components: `CitingRecordList`, `NamedTaxonList`
- Clade pages (`clade/{slug}/`, one for each of the 188 clades with a record): classification
  trail, authority and type genus, an age figure spanning every genus in the clade (with the
  stage row only when the span covers at most two epochs), description, dispute note,
  diagnosis, the clades directly below with their genus counts, synonyms, references, and a
  facts panel with genus counts. A full-width table lists the genera placed directly in the
  clade: authority, age, a range bar on the clade's span, and country, in ruled columns that
  keep to one line (narrow screens scroll the table). The ranks above Dinosauria have no record
  and get no page; classification trails show them without a link
- Components: `CladeGenusTable`, `RangeBar`, `SubcladeList`, and `FactList`, which the genus
  page's "at a glance" panel now uses too
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
