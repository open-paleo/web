# Changelog

The site is published continuously from `main`, so changes are grouped by the date they went
live, newest first. Add to today's section, creating it if needed. The data the site shows has
its own changelog in [open-paleo/data](https://github.com/open-paleo/data).

## 2026-11-09

### Added

- "Cite this record" on genus and clade pages: a citation in the dataset's own form, naming the
  record, the release and the page (the genus in italic), with a BibTeX entry. It and the Data
  page's dataset citation have "Copy citation" and "Copy BibTeX" buttons
- "Suggest a correction" at the end of every genus, clade and reference page: a link to a new
  issue in open-paleo/data with its correction form, the record and page filled in. The home
  page's "Report an error" opens the same form
- Stage and period pages in search, with "Stages" and "Periods" filters; their genus lists are
  left out of the index so they do not turn up for every genus. A query that is exactly a stage
  or period name puts its page first, above references with the name in their titles. Kinds
  with no results for a query no longer show a filter button
- An Atom feed of the 50 most recently named genera (`feed.xml`), linked from every page's
  head and from the home page
- A site icon for browser tabs, bookmarks and search results (`favicon.ico` at 16, 32 and 48
  pixels, and an Apple touch icon): a stand-in fossil icon by Smashicons from Flaticon, in the
  header's colors, credited in the footer as its license requires
- Link previews: every page has Open Graph and Twitter card tags with its title and
  description, and a site-wide preview image (`public/social-preview.png`, drawn by
  `npm run create-social-image`)
- A Map page (`map/`, in the header): where every genus's type species was found, with each
  region shaded by how many genera come from it and a dot for each genus with published
  coordinates. Selecting a region lists its genera; the Genera page's filters apply to the map,
  the list and an index of genera by country and region, which also serves readers without
  JavaScript. The filters fold into one line and the map is sized to the window
- A map on every genus page of where each species was found, on today's map: a dot for
  published coordinates, the region shaded when only the region is known, and the country
  shaded more lightly when only the country is. Each place is labeled with its species; species
  found at the same place share one mark. MapLibre GL JS over OpenFreeMap's OpenStreetMap
  tiles, styled in the site's colors and loaded only when the map scrolls into view; a list of
  the places under the map says the same in words. Region outlines are Natural Earth's, built by
  `npm run create-map-shapes`. Maps reaching toward a pole are drawn on a globe

### Fixed

- On the Map page a click selects the state or region under it rather than the whole country:
  countries holding genera known only to the country (the United States, Mongolia) are drawn
  under their regions and shaded lightly
- Genus maps for Alaskan genera open on Alaska rather than the whole world, since Alaska's
  outline crosses the 180° meridian. Antarctica's outline no longer draws artificial edges
  along the meridian and the pole

## 2026-11-07

### Added

- The home page: search, the release and its counts, "Genera through time" (genera known from
  each stage, Carnian to Maastrichtian, each column linking to its stage page), the major groups
  with their sizes and one-sentence summaries, the most recently named genera (at least a dozen,
  reaching back a year when the newest year has few), and how to download, cite and contribute
- Stage pages (`stage/{slug}/`) listing the genera known from each stage, and period pages
  (`period/{slug}/`) with the period's stages as a chart and its genera A to Z. Stage and epoch
  names in every age figure's caption link to them
- Filters on the Genera page: time (period or epoch), major group, diet, locomotion,
  integument, status and a range of years named. Each option shows how many genera it would
  leave, the filters are kept in the page address, and the matches are listed together without
  letter headings
- Each genus in a list of genera gets a line with its details (group, epochs and country on the
  Genera and period pages), and a badge when its type species is a nomen dubium or disputed
- `npm run check-site`, run in CI and before every deployment: every internal link in the built
  site resolves, and a sample of pages passes WCAG 2.2 AA in axe (light and dark), has no grid
  or flex container that splits loose text, and fits a 320px window
- Deployment to GitHub Pages at https://open-paleo.org (`.github/workflows/deploy.yml`): on
  pushes to `main`, on a `data-updated` notification from the data repository (building against
  the data commit it names), by hand, and nightly. The deployed build has canonical addresses, a
  sitemap and a `robots.txt` naming it. `docs/deployment.md` records the one-time domain setup
- A full-width header on every page: the wordmark, navigation marking the current section, a
  GitHub link and a search field; plus a "Skip to content" link. A matching footer band
- Index pages: Genera (A–Z with letter links), Tree (the clade hierarchy as a collapsible
  outline with genus counts), References (by first author), and Data (release details,
  downloads with sizes, how to cite)
- Full-text search with Pagefind over the genus, clade and reference pages, with filters by
  kind, highlighted excerpts, and ranking tuned so a record ranks above pages that only mention
  it
- A "Page not found" page with links to search and the indexes

### Changed

- Clade and stage pages list their genera like the Genera page, in columns with a line of
  details for each, instead of a table; lists of more than 100 genera are grouped by letter
- Accessibility and readability: band text in the age figure reaches 4.5:1 (a test checks
  every band), the type scale is larger (body 18px, nothing below 14px), record pages are
  divided into sections with headings underlined across the content column, and axe-core
  reports no WCAG 2.2 AA violations on the checked pages in either theme
- Record pages float the fact panel ("At a glance", "About this work") at the top right in a
  bordered box, so sections below it use the full width
- Each species is a box holding its type specimen, horizon, locality and diagnosis as labeled
  rows, with its synonyms as a list; a genus's species boxes sit two side by side where they fit
- A notable specimen's name sits above its details; nicknames are quoted (“Fighting
  Dinosaurs”), descriptive names are not, and an unnamed specimen is headed by its catalog
  number
- The age figure's range marker sits behind the bands as tabs above and below the row, and
  bands in the range have bold labels
- HTML compression is off, so template whitespace renders as written

### Fixed

- Period pages include genera whose type species is dated to an epoch but no stage
- Pages fit a 320px window: the age figure's stage row, the home page's search field and the
  time chart no longer widen the page
- Short citations that would read alike within a record get the letter from their reference
  key: "O'Connor et al. (2025a)" and "(2025b)"
- An abbreviated genus stays on the line with its epithet ("P. sibiricus" never breaks after
  "P.")

## 2026-11-06

### Added

- Reference pages (`reference/{slug}/`, one per cited work): the full citation, the names first
  published in the work, and every genus and clade that cites it
- Clade pages (`clade/{slug}/`, one per clade with a record): classification trail, authority
  and type genus, an age figure spanning the clade's genera, description, dispute note,
  diagnosis, the clades directly below with their genus counts, the genera placed directly in
  it, synonyms and references. The ranks above Dinosauria have no record and get no page
- Genus pages (`genus/{slug}/`, one per genus): classification trail, name, authority and
  pronunciation, etymology, an age figure in the International Commission on Stratigraphy
  colors, description with taxon names in italics, dispute note, diagnosis, each species with
  its type specimen and synonyms, notable specimens, ICZN cases, references, and an "At a
  glance" panel
- Data loading in `src/data/`: locating `open-paleo.json`, a schema-version check against the
  copied bindings (`npm run update-bindings`), and lookup tables for the pages. Unit tests run
  against a fixture cut from the real dataset (`npm run create-test-fixture`)
- Astro as the static site generator, with directory-style URLs and a configurable base path
- The Strata theme (`src/theme/`): color tokens for light and dark, the ICS colors for every
  period, epoch and stage in the dataset's schema, a type and spacing scale, element defaults,
  and self-hosted Alegreya and Alegreya Sans
- Repository infrastructure: README, contributor and style guide, Claude Code instructions,
  MIT license, code of conduct, ESLint, TypeScript and cspell configuration, and CI
