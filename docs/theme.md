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
| `--color-surface` | `#f7f8f5` | `#1d2321` | Specimen labels, inputs, raised panels |
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

## Geologic time colors

`tokens.css` defines a color for every period, epoch and stage that the data's `schema.yml`
allows, from the Permian to the Eocene, using the ICS chart values. They are named after the
schema's values (`--epoch-early-permian`, `--stage-maastrichtian`), so a template can build the
token name from the record.

They are used only in age graphics: the age figure on genus pages, range bars in clade tables
and the timeline. They do not change between light and dark. Text drawn on them uses
`--color-on-period`, or `--color-on-period-dark` on the darker bands (Permian, Triassic,
Early and Middle Triassic).

The hex values must match the current ICS chart. Check them against the published chart
before the first release and whenever the ICS revises it.

## Typography

| Role | Face | Token |
|------|------|-------|
| Headings, genus and species names, prose | Alegreya, variable weight 400 to 900, roman and italic | `--font-serif` |
| Navigation, tables, labels, figures, buttons | Alegreya Sans 400, 400 italic, 500, 700 | `--font-sans` |

The two families were drawn as a pair, so they share proportions and rhythm. Alegreya's italic is
distinctive, which matters because taxon names are italic in running text.

There is no monospace face. Catalog numbers (`CM 9380`) are set in Alegreya Sans 500 with
tabular figures.

Type scale (`--text-*`), against a 16px root:

| Token | Size | Use |
|-------|------|-----|
| `caption` | 13px | Age-figure scale labels, reference keys |
| `small` | 14px | Classification trail, specimen facts |
| `interface` | 15px | Navigation, tables, side panel |
| `body` | 17px | Prose |
| `lede` | 19px | Opening paragraph of a description |
| `heading-3` | 19px | Subsections such as Synonyms |
| `heading-2` | 24px | Page sections such as Diagnosis |
| `heading-1` | 28px | Page titles other than taxa |
| `display` | 44–64px | Genus name, the only display size |

Running text is limited to `--measure` (42rem, about 70 characters of Alegreya at 17px).

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
- Genus pages use two columns: the main text, and a `--sidebar-width` (19rem) "at a glance"
  panel. The age figure spans both columns, under the genus name. Below 52rem everything
  stacks: classification, name, age, at a glance, then the text.
- Surfaces are flat. Borders and fills mark the few elements that are separate objects (the
  specimen label, the dispute note); sections are separated by space and headings, not boxes.
  Radius is 4px on panels and 2px on bars and badges.

## Components

These were settled in the theme mockup. Each becomes an Astro component in `src/components/`
with its styles in its own scoped `<style>` block, built along with the first page that uses
it:

| Component | Description |
|-----------|-------------|
| Classification trail | Ranks from Dinosauria down to the parent clade; middle ranks collapse behind a "6 more" button |
| Age figure | Two rows of ICS bands: the whole Mesozoic, then the stages of the record's epoch, each with an outlined marker over the record's range, and the boundary ages beneath |
| Specimen label | Bordered surface panel for a type specimen: catalog number, institution, material, horizon, locality |
| At a glance | Definition list of diet, locomotion, integument, appearance features, size, location and identifiers |
| Status badge | "Disputed" (caution, solid border) and "Nomen dubium" (muted, dashed border) |
| Dispute note | Caution-soft panel with a caution-colored title, for a record's `dispute.summary` |
| Range bar | Small age bar in clade tables, drawn on the same scale as the age figure |
| Category chip | Accent-soft label for a notable specimen's category |
