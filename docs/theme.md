# The Strata theme

The site's look is built around geologic time. Each genus page opens with an age figure in the
International Commission on Stratigraphy (ICS) chart colors, which shows where the animal sits
in the Mesozoic before the reader gets to the text. Everything around that figure is quiet:
cool limestone grays, one green accent, and a book serif.

The theme lives in [`src/theme/`](../src/theme/):

| File | Contents |
|------|----------|
| `theme.css` | Entry point; `BaseLayout.astro` imports it, so every page gets it |
| `fonts.css` | `@font-face` rules for the self-hosted fonts |
| `tokens.css` | Every color, font, size and space as a custom property |
| `base.css` | Element defaults (body, headings, links, tables, focus) |
| `fonts/` | WOFF2 files and their SIL Open Font License texts |

## Color

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--color-background` | `#eceeea` | `#151a19` | Page |
| `--color-surface` | `#f7f8f5` | `#1d2321` | Fact panels, species boxes, the full citation, inputs |
| `--color-ink` | `#1d2329` | `#e2e6e0` | Text, table header rules |
| `--color-muted` | `#59625d` | `#9aa49e` | Authorities, metadata, labels |
| `--color-line` | `#cdd3cc` | `#323a37` | Dividers and table rows |
| `--color-accent` | `#2c6655` | `#80c4ab` | Links, focus rings, specimen categories |
| `--color-accent-soft` | `#dce9e3` | `#213731` | Selection, category chips |
| `--color-caution` | `#8a5a0b` | `#e2b562` | Dispute notes, the "disputed" status |
| `--color-caution-soft` | `#f3e6c8` | `#3a2f19` | Dispute note background |

Rules:

- **No literal colors outside `tokens.css`.** A component that needs a new color gets a new
  token, defined in the bare `:root` block and redefined in both dark blocks if it changes.
- **The two dark blocks stay identical.** One applies when the viewer's system is dark and no
  theme is forced; the other applies when `data-theme="dark"` is set on `<html>`.
- **Caution is semantic.** Use it for disputes and contested status only, never as decoration.
- **Valid names get no badge.** "Disputed" and "nomen dubium" are written out in the badge, so
  the status never depends on color alone.

### Header colors

The site header is a dark band in both themes, with its own tokens (`--color-header-*`): the
band, the search field's fill and border, text, muted text, and the accent for the current
section and the search button. On the band, text reaches 12.7:1, muted text 8.1:1 and links
8.9:1, and the search field's border 4.2:1 (non-text needs 3:1). In dark mode the band is darker
than the page, with `--color-header-edge` as a visible bottom border.

### Chart colors

Marks in charts (the bars of the home page's "Genera through time") use `--color-chart-mark`
(`#288463` light, `#32a67d` dark), not `--color-accent`. The accent is too muted to read as a
color at bar size: the dataviz palette validator measures its chroma at 0.067, below its 0.10
floor. The chart color keeps the accent's hue with more chroma, and passes the validator's
lightness, chroma and 3:1 contrast checks against each theme's background. A single-series chart
uses this one color for every mark; time is shown by the stage strip under the axis, in the
chart colors of the time scale, never by coloring the bars.

## Geologic time colors

`tokens.css` defines a color for every period, epoch and stage that the data's `schema.yml`
allows, from the Permian to the Eocene, using the ICS chart values. They are named after the
schema's values (`--epoch-early-permian`, `--stage-maastrichtian`), so a template can build the
token name from the record.

They are used only in age graphics: the age figure on genus and clade pages, and the timeline.
They do not change between light and dark. Text drawn on them uses `--color-on-period`
(near-black), or `--color-on-period-dark` (white) on the Triassic, Early Triassic, Induan and
Olenekian. `test/age-figure.test.ts` checks that every band label reaches 4.5:1; the closest are
the Permian and Middle Triassic at 5.0:1. Never lay a translucent layer over the bands: it
breaks that contrast.

## Accessibility

The site targets WCAG 2.2 AA. Text contrast is at least 4.5:1 for every token pair in both
themes; the tightest is `--color-caution` on `--color-caution-soft`, at 4.8:1 in light mode.
Check a change that touches color or layout with axe-core in a browser, in both themes.

The hex values must match the current ICS chart. Check them against the published chart
before the first release and whenever the ICS revises it.

## Typography

| Role | Face | Token |
|------|------|-------|
| Headings, genus and species names, prose | Alegreya, variable weight 400 to 900, roman and italic | `--font-serif` |
| Navigation, tables, labels, figures, buttons | Alegreya Sans 400, 400 italic, 500, 700 | `--font-sans` |

The two families were drawn as a pair, so they share proportions and rhythm. Alegreya's italic is
distinctive, which matters because taxon names are italic in running text.

There is no monospace face for text. Catalog numbers (`CM 9380`) are set in Alegreya Sans 500
with tabular figures. `--font-mono` (the system's monospace) is for code only, such as the
BibTeX on the Data page, whose alignment depends on equal-width characters.

Type scale (`--text-*`), against a 16px root. Nothing is set below 14px: both families have
small x-heights and read smaller than their nominal size.

| Token | Size | Use |
|-------|------|-----|
| `caption` | 14px | Age-figure labels and scales, badges, reference keys |
| `small` | 15px | Classification trail, specimen facts |
| `interface` | 16px | Navigation, tables, side panel |
| `body` | 18px | Prose |
| `lede` | 20px | Reserved for short introductory text |
| `heading-4` | 18px | Subsections inside a species (Diagnosis, Synonyms) |
| `heading-3` | 21px | A species within the Species section |
| `heading-2` | 28px | Page sections (Diagnosis, Species, References) |
| `heading-1` | 32px | Page titles other than taxa, such as a reference's title |
| `display` | 48–72px | Genus and clade names |

Running text is limited to `--measure` (40rem, about 75 characters of Alegreya at 18px).

### Typographic conventions

- **Taxon names are italic.** Every genus and species name carries `class="taxon"`. This
  follows nomenclature convention, not emphasis, and applies in tables, links and headings.
  Clade names above genus rank are roman.
- **Authorities follow zoological format**: `Osborn, 1905`; two authors `Fiorillo & Tykoski,
  2014`; three or more `Loewen et al., 2013`. Parentheses when the species was named in another
  genus.
- **Ranges use an en dash** with no spaces: `72.2–66.0 Ma`, `11.9–13 m`.
- **Ages are given to one decimal place** in millions of years, written `Ma`.
- **No all-caps labels, no tracking-out, no monospace.**

## Layout

- Page content is centered at `--page-width` (72rem) with a side gutter of at least 16px.
- Record pages (genus, clade, reference) put the classification trail, header and age figure
  across the full width. Below them, `RecordMain.astro` floats the fact panel
  (`--sidebar-width`, 21rem) at the top right; the description and the first sections run
  beside it at the reading measure, and once past it, sections use the full width. Below
  52rem the panel stops floating and sits above the text.
- A genus's species are boxes in a grid: two side by side where they fit, one per row
  otherwise.
- Surfaces are flat. Borders and fills mark the few elements that are separate objects (the
  fact panel, species boxes, the dispute note); sections are separated by space and headings, not boxes.
  Radius is 4px on panels and 2px on bars and badges.

## Components

These were settled in the theme mockup. Each becomes an Astro component in `src/components/`
with its styles in its own scoped `<style>` block, built along with the first page that uses
it:

| Component | Description |
|-----------|-------------|
| Classification trail | Ranks from Dinosauria down to the parent clade; middle ranks collapse behind a "6 more" button. Each separator follows its item, so a wrapped line ends with one rather than starting with one |
| Age figure | Two rows of ICS bands: the Mesozoic periods, then the stages of the record's epoch (omitted when a span covers more than two epochs). The record's range is a marker in `--color-ink` drawn behind the bands and 6px taller, so it shows as tabs above and below the row and never crosses a label; the bands the range overlaps have bold labels. Boundary ages beneath each row |
| Species box | `SpeciesSection.astro`: a bordered surface box per species with its heading, etymology, and labeled rows (`SpeciesFacts.astro`): type specimen, material, horizon, locality and diagnosis. Its synonyms follow as a stacked list (`SynonymList.astro`), since a table does not fit at half width |
| Fact panel | `FactList.astro`: a titled box on `--color-surface` with a firm border, holding a definition list. Values are plain text (features read "Elongate snout, sickle claw"). The genus page's "At a glance" (diet, locomotion, integument, features, size, location, identifiers), the clade page's genus counts, and the reference page's "About this work" |
| Status badge | "Disputed" (caution, solid border) and "Nomen dubium" (muted, dashed border) |
| Page section | `PageSection.astro`: a `heading-2` heading underlined by a rule in `--color-ink` across the content column, then the content, with `--space-8` between sections. Prose inside keeps to the reading measure. Every major part of a genus, clade or reference page is one |
| Dispute note | A lightly tinted panel with a caution border, inside a section headed "Under dispute" |
| Site header GitHub link | GitHub's mark (Primer Octicons, MIT License) linking to the organization, left of the search field, in `--color-header-muted` |
| Notable specimen | Name as a `heading-3`, then the catalog number, institution, discovery and category, the significance, and short citations. Nicknames are set in typographic quotation marks (“Sue”); descriptive names built on a generic word (Berlin specimen, Felch Quarry skull) are not. A specimen without a name is headed by its catalog number in Alegreya Sans |
| Category chip | Accent-soft label for a notable specimen's category |
| Genera through time | `GeneraThroughTime.astro`: one column per stage (at most 24px wide, rounded at the top), hairline gridlines at round values, the tallest column labeled, a stage strip under the axis, and periods (home page, linked) or epochs (period page) beneath it. Each column is a link to its stage page whose accessible name gives the stage and its count, so the values reach keyboard and screen-reader users without a separate table; hovering or focusing a column shows the same in a tooltip |
| Genus list | `GenusIndex.astro` and `GenusListItem.astro`: genera in columns; each entry is the name, any status badge and the authority, then a `small` muted line of details separated by commas drawn in CSS. The details depend on the page: group, epochs and country on the Genera and period pages; linked clade, stages with dates, and country on stage pages; stages with dates and country on clade pages. *Incertae sedis* is italic and "under dispute" is in `--color-caution`. Lists of more than 100 genera are grouped under letter headings with a row of letter links |
| Genus filters | `GenusFilterForm.astro`: a surface box of labeled lists, each option followed by how many genera it would show given the other filters (options that would show none are disabled), a year range, the number shown and "Clear filters". The lists draw their own chevron, inset by `--space-3`. Five lists to a row on wide screens, two on phones. While a filter is on, the matches move into one list without letter headings. Hidden until its script runs, so without JavaScript the page is the plain index |
| Diagnosis list | Numbered features with the numbers in their own right-aligned column (Alegreya Sans, muted), flush with the text around the list |
| Site footer | The header's dark band repeated at the foot of every page: wordmark, a one-line description, links to the Data page and both repositories, and the license line with the data release the page was built from |
