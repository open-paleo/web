# Changelog

The site is published continuously from `main`, so changes are grouped by the date they went
live, newest first. Add to today's section, creating it if needed. The data the site shows has
its own changelog in [open-paleo/data](https://github.com/open-paleo/data).

## 2026-11-20

### Added

- Genus, clade and Data pages describe their subject as schema.org structured data (JSON-LD)
  for search engines and linked-data crawlers. Genus and clade pages follow the Bioschemas Taxon
  profile, with the taxon's rank (a clade's from the dataset's new clade ranks, schema 4.5.0),
  parent clade, children, synonyms and, for a genus, links to the same genus in PBDB, Wikidata,
  GBIF, EOL and ZooBank. The Data page describes the dataset, its license and its files for
  Google Dataset Search. Only the published site carries it, since it needs absolute addresses
  ([#25](https://github.com/open-paleo/web/issues/25))
- Rock unit pages open with the unit's description from the dataset, which now writes one for
  every unit; members and beds show theirs in their section. Names in the descriptions link to
  their pages, as in genus descriptions
- A description with a narrative after its summary, which the dataset separates with a blank
  line, is shown as separate paragraphs on genus, clade and rock unit pages, with each name
  linked once across them
- Clade pages give the clade's rank at a glance (family, subfamily, unranked and so on), linked
  to its glossary entry where there is one
- A Licenses page (`licenses/`, linked from the footer) lists the software, fonts and data by
  others that the site uses, each with its version, license, copyright holder and what it is
  for, and serves each license text beside it (`licenses/{name}.txt`). Every folder of bundled
  files on the site holds a `LICENSE.txt` with the same texts, since bundling strips the notices
  from the code; the tree extractor's Tesseract worker gets the notices file it points to

### Changed

- On rock unit pages, the note about which genera are listed moved into the genera section
- The outline tracer page names esm-potrace-wasm, the WebAssembly build of potrace it runs, and
  links the GPL's text
- The ancient coastlines' credit on genus maps links the paper and its license, and says the
  coastlines are simplified and moved to each stage's midpoint

### Removed

- The site icon. The stand-in fossil icon from Flaticon is gone, with its footer credit, since
  Flaticon's terms restrict using its icons as a logo; the project's own icon will replace it

### Fixed

- A name in prose that isn't linked, because it names the current page or was already linked
  in the passage, no longer has a glossary term linked inside it: "Formation" in "Hell Creek
  Formation"

## 2026-11-19

### Added

- Species boxes on genus pages give the epithet's pronunciation, from the dataset's new species
  pronunciations, beside the authority as the genus header does. Where a name has two readings,
  they are shown with "or" between them
- Clade pages show an outline beside the name, as genus pages do: the clade's own, or else its
  type genus's. A clade with neither shows none
- The outline tracer, a new tool at `tools/outline-tracer/`: open a skeletal reconstruction, and
  it traces the animal into an outline, shown over the figure to check it, with a threshold and
  keep-open points to adjust, and writes the record for open-paleo/media
- The tree extractor, now 0.7.1, can read the labels it couldn't match a second time, with
  PaddleOCR: tick "Read unmatched labels a second time". It downloads about 12 MB more from this
  site the first time it's used

### Changed

- The tree extractor's source links point to its folder in open-paleo/tools, the repository it
  moved to, and its releases are picked up from there

## 2026-11-18

### Added

- Genus pages show an outline beside the name: the genus's own, or failing that the nearest clade
  above the genus with one, from the new [open-paleo/media](https://github.com/open-paleo/media)
  repository (twelve PhyloPic silhouettes so far, from Dinosauria to Pachycephalosauria). A
  credit line beneath it names what it shows, the taxon it was drawn from, its creator, its
  license and the changes made. Deploys also run when the media change
- The period and stage bands of the age figure on genus, clade, stage and unit pages link to
  their pages. Hovering or focusing a band darkens it and shows a tooltip with its full name,
  what it is, its age and how many genera are known from it, which also names the narrow bands
  too small for a label
- Names in genus and clade text link to their pages: genera, species (to their section on the
  genus page, including synonyms and abbreviations such as "T. rex"), clades, rock units,
  stages and periods, and epochs to their row on the Time scale page. Each links once per block,
  never on its own page, and glossary terms link only in the text around them
- Pages for rock units (`unit/{slug}/`), from the stratigraphy the dataset publishes since schema
  4.1.0: one per formation, group or other top-level unit with genera, with its rank, the unit it
  belongs to, its age, the genera found in it, a group's formations, its members and beds as
  sections, and its references. A member or bed's address sends readers to its section on its
  unit's page. A Stratigraphy index (`stratigraphy/`) lists them all, A to Z
- A Clades page (`clades/`): every clade with a page, A to Z, with the clade it belongs to, how
  many genera it holds and the epochs they span, filterable by time, group and year named like
  the Genera page. It sits between Genera and Tree in the header's Taxa group
- A Time scale page (`time/`), first in the header's Time group: the "genera through time" chart,
  then each period's epochs and every one of its stages with their ages and genus counts,
  linking the stage and period pages. Stages with no genera are listed without a link
- Period pages give the period's full span (the Triassic from 251.9 million years ago), not just
  that of the stages with genera, and their charts show every stage of the period, as does the
  Time scale page's chart; the home page's chart still starts at the first stage with genera
- The species box and "At a glance" link each rock unit to its page, the search fields suggest
  rock units, and reference pages list the rock units that cite them. The sitemap lists the unit
  pages but not the members' and beds' forwarding pages

### Changed

- The header groups the site's pages: Taxa (Genera, Tree), Time (the period pages), Places (Map,
  Stratigraphy), Learn (Glossary, References) and Data (Download and cite, Tools). The top row
  holds the groups, and a second row shows the current group's pages, so the header fits one
  row on phones again and new pages have a place
- The rock unit index is now Stratigraphy, at `stratigraphy/`; `units/` forwards there
- The footer groups its links into Data and About columns, adds the glossary repository, and
  drops the tree extractor, which the header's Data group reaches
- Rock unit names whose last word already names a rock type are no longer followed by the rank:
  "Navajo Sandstone", not "Navajo Sandstone Formation"
- Long web addresses and DOIs in citations wrap on narrow screens

## 2026-11-17

### Added

- A Glossary page, linked from the header, with plain-English definitions from
  [open-paleo/glossary](https://github.com/open-paleo/glossary). Terms in genus and clade text
  (descriptions, disputes, diagnoses, type material, synonym reasons, notable specimens) link to
  their definitions once per block, as do statuses such as "nomen dubium", "incertae sedis" in
  the lineage and specimen types. With JavaScript, a link opens the definition in a popover
  beside the term. Phrases a glossary entry lists as exceptions, such as "derived from", stay
  unlinked
- Typographic quotation marks and apostrophes throughout: dataset text such as a Latin word
  meaning ‘tail’, a quoted “associated with” and O’Connor is shown with curly marks, and
  coordinates with primes (30°03′S). Search and the find fields match either kind of apostrophe

### Changed

- The site reads the dataset's schema 4.0.0, which spells the holotype status "uncataloged". A
  type specimen without a catalog number reads "Not cataloged" (it said "Not catalogued"), and
  no longer repeats that as its status

### Added

- Genus maps can show where each species was when it lived: a switch between "Today" and each
  stage the species lived in ("152 million years ago (Kimmeridgian)") turns the map to a globe
  of that stage's coastlines, with a dot for each published site and a ring for each region's
  center, a latitude and longitude grid, and the poles marked. Positions come from the
  dataset's paleocoordinates (plate model of Wright et al. 2013, CC BY 3.0 AU), rotated at build
  time to the stage's midpoint so they line up with the coastlines. The site reads schema 3.5.0,
  which adds the paleocoordinates

## 2026-11-14

### Added

- A find field on the References page: typing an author, a year or words from a title lists the
  matching references with their titles, and choosing one scrolls to it, highlights it and moves
  the focus to its link. It reads the list already on the page, so nothing extra loads

- A chart of the tree at the top of the Tree page: the classification from Dinosauria down,
  left to right, panned and zoomed like a map (MapLibre, as on the maps). Each major group has
  its own color, chosen to stay distinct with color-vision deficiencies, named in a legend.
  Genera are summarized: a clade with no clades below it is a tip ("Ornithomimidae",
  "*Ornithomimus* and 12 others"), and genera placed directly in a clade with subclades get one
  tip ("12 genera"). Selecting a tip lists its genera in a panel; selecting a clade opens its
  page. Clade names appear largest first as there is room. The find field shows its result in
  the chart, opening the panel for a genus, with a link to show it in the outline instead. The
  outline stays below as the version without JavaScript
- Clade colors in their own file (`src/theme/clade-colors.css`), for the clades listed in
  `src/data/clade-colors.ts`, apart from the home page's major groups; a test checks that every
  listed clade has light and dark colors that stay distinct under color-vision deficiencies and
  reach 3:1 on the chart's background

- A find field on the Tree page: typing part of a clade or genus lists the matches, and
  choosing one opens every clade above it in the outline, highlights it and moves the focus to
  it. A genus reveals the clade it is placed in, which a line under the field names

### Fixed

- Name suggestions match a query of several words when each word starts a word of the name, in
  any order, and ignore punctuation ("osborn 1905" finds "Osborn (1905)"). A slow lookup no
  longer closes the list a newer keystroke opened

## 2026-11-13

### Changed

- On a page shorter than the window, the footer sits at the bottom of the window instead of
  leaving a gap below it. The footer's "Open Paleo" and the line under it stay together
  instead of spreading to the height of the links beside them

- The tree extractor page refers readers to its documentation for the kinds of figure it
  handles well

### Added

- `tools/tree-extractor/known-clades.txt`: every clade with a record in the dataset, which the
  tree extractor (from 0.5.2) uses to correct the clade names it reads at nodes, on shaded boxes
  and at collapsed clades. Built from each release, like the known names
- Visit counts with [Plausible Analytics](https://plausible.io/): page views, referring sites,
  browsers, devices and countries, with no cookies and no IP addresses stored. The counting
  script loads only on the published site, so local and CI builds are never counted
- A privacy policy (`privacy/`, linked from the footer): who runs the site and how to reach them
  (privacy@open-paleo.org), what is collected and why, what isn't, each service that handles
  visitors' requests (GitHub Pages, Plausible, OpenFreeMap) with what it receives and its policy,
  retention, rights, children, and changes. The services come from `src/data/privacy.ts`, and
  the site check fails if a page contacts a host not declared there

## 2026-11-12

### Added

- A type specimen's nickname, new in the dataset's schema 3.4.0, is a "Nickname" row in its
  species box ("Happy" for the *Haplocanthosaurus delfsi* holotype), in quotation marks like a
  notable specimen's, and found by search. The bindings and test fixture are updated to 3.4.0

### Changed

- Genus maps open one zoom level further out, so the places are seen among their neighbors:
  Colorado opens with the West Coast and the Plains in view rather than filling the map. Places
  that already fill a continent-scale view, such as Alaska, open as before. Region names on all
  maps appear from zoom 3 rather than 4, so they show at a phone's opening zoom
- The tree-extractor update workflow opens its pull request with the token tree-extractor's
  notification uses, so CI runs on it without waiting for a maintainer's approval; the workflow
  itself now only pins the release and checks its integrity, leaving the checks to CI
- A clade's type genus is the first row of its "At a glance" panel, linked to the genus page,
  rather than a line under the clade's name

### Fixed

- No space before the comma in a species box's type specimen ("CMNH 10380, Cleveland Museum of
  Natural History") and horizon ("Early Cretaceous, 161.5–137.1 million years ago"), on every
  genus page
- The tree extractor's known names include the name each species was first published under
  ("Zalmoxes shqiperorum" for *Ferenceratops shqiperorum*), so the tool recognizes an older
  figure's names
- Long genus and clade names ("Haplocanthosaurus", "Micropachycephalosaurus") shrink to fit
  the line on phones instead of widening the page and pushing the content below them off
  screen. The site check now includes the longest genus and clade names

## 2026-11-11

### Added

- Name suggestions in the header and home page search fields: typing part of a genus, species,
  clade or synonym ("veloci") lists the best matches under the field, each opening its page,
  with a last row that searches the full text. Usable from the keyboard, and announced to screen
  readers

## 2026-11-09

### Added

- A "Tools" item in the header and a Tools page listing the site's tools
- The tree extractor at `tools/tree-extractor/` (beta), linked from the Tools page, the footer
  and the Data page: open-paleo/tree-extractor in the site's theme, reading a tree from a figure in the
  browser and matching its labels against the dataset's names (built from each release). Its
  text recognition is served from the site, so nothing leaves the reader's computer. The site
  check runs it on a figure. A workflow opens a pull request when the tree extractor releases
- A `--color-danger` token for destructive actions and errors
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
  the places under the map gives the same information in words. Region outlines are Natural Earth's, built by
  `npm run create-map-shapes`. Maps reaching toward a pole are drawn on a globe

### Changed

- The header's search field is compact on wide screens (18rem rather than up to 28rem), with a
  shorter placeholder ("Genus, clade, author"); on phones it keeps its own full-width row

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
