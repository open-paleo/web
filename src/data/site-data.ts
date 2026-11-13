import type { GeologicTimeline } from "./age-figure.ts";
import { createGeologicTimeline } from "./age-figure.ts";
import type { Clade, Genus, Metadata, OpenPaleoDataset, Reference, TreeNode } from "./dataset.ts";
import { loadDataset } from "./load-dataset.ts";
import { getTypeSpecies } from "./records.ts";
import { createSlug } from "./slugs.ts";
import type { TaxonNameIndex } from "./taxon-names.ts";
import { createTaxonNameIndex } from "./taxon-names.ts";

/**
 * A genus with the values the site derives for it.
 */
export type GenusEntry = {
    /**
     * Genus name.
     */
    name: string;

    /**
     * URL path segment: genus/{slug}/.
     */
    slug: string;

    /**
     * The genus record from the dataset.
     */
    record: Genus;
};

/**
 * A node of the clade tree with the values the site derives for it.
 */
export type CladeEntry = {
    /**
     * Clade name.
     */
    name: string;

    /**
     * URL path segment: clade/{slug}/.
     */
    slug: string;

    /**
     * The clade record. Absent for the ranks above Dinosauria (Life to Archosauria), which
     * place the tree but carry no record of their own.
     */
    record: Clade | undefined;

    /**
     * Name of the parent clade; absent for the root.
     */
    parentName: string | undefined;

    /**
     * Number of ranks between this clade and the root; the root is 0.
     */
    depth: number;

    /**
     * Names of the clades directly below this one, in tree order.
     */
    childCladeNames: Array<string>;

    /**
     * Names of the genera placed directly in this clade, sorted.
     */
    genusNames: Array<string>;

    /**
     * Number of genera placed in this clade or any clade below it.
     */
    totalGenusCount: number;
};

/**
 * The kind of record that cites a reference.
 */
export type CitingRecordKind = "genus" | "clade";

/**
 * One record's citation of a reference.
 */
export type Citation = {
    /**
     * Whether a genus or a clade cites the reference.
     */
    kind: CitingRecordKind;

    /**
     * Name of the citing genus or clade.
     */
    name: string;

    /**
     * The citing record's note on what the reference supports, if it has one.
     */
    notes: string | undefined;
};

/**
 * A cited work with every record that cites it.
 */
export type ReferenceEntry = {
    /**
     * Reference key, such as osborn1905a.
     */
    id: string;

    /**
     * URL path segment: reference/{slug}/.
     */
    slug: string;

    /**
     * Bibliographic details, without any citing record's notes.
     */
    reference: Reference;

    /**
     * Records that cite the work, genera first, each group sorted by name.
     */
    citations: Array<Citation>;

    /**
     * Names first published in the work: genera, species and clades, in that order.
     */
    namedTaxa: Array<NamedTaxon>;
};

/**
 * The rank of a name established in a published work.
 */
export type NamedTaxonKind = "genus" | "species" | "clade";

/**
 * A name first published in a work, with the page that describes it.
 */
export type NamedTaxon = {
    /**
     * Whether the name is a genus, a species or a clade.
     */
    kind: NamedTaxonKind;

    /**
     * The name: "Tyrannosaurus", "Tyrannosaurus rex", "Tyrannosauridae".
     */
    name: string;

    /**
     * The binomial as first published, when a species was named in another genus.
     */
    publishedAs: string | undefined;

    /**
     * The section and slug of the page that describes it: a genus page for a genus or
     * species, a clade page for a clade.
     */
    pageSlug: string;

    /**
     * Fragment of the page to link to: the species' section, or empty for the page itself.
     */
    anchor: string;
};

/**
 * The dataset arranged for page generation.
 */
export type SiteData = {
    /**
     * Release metadata: version, schema version, build time, counts.
     */
    metadata: Metadata;

    /**
     * Every genus, sorted by name.
     */
    genera: Array<GenusEntry>;

    /**
     * Genera by name.
     */
    genusByName: Map<string, GenusEntry>;

    /**
     * Every node of the clade tree, in depth-first tree order.
     */
    clades: Array<CladeEntry>;

    /**
     * Clades by name.
     */
    cladeByName: Map<string, CladeEntry>;

    /**
     * Every cited work, sorted by key.
     */
    references: Array<ReferenceEntry>;

    /**
     * Cited works by key.
     */
    referenceById: Map<string, ReferenceEntry>;

    /**
     * Genus and species names, for setting them in italics in prose.
     */
    taxonNames: TaxonNameIndex;

    /**
     * The geologic timescale arranged into periods, epochs and stages, for age figures.
     * Absent when the dataset predates schema 3.3.0, which added the timescale.
     */
    timeline: GeologicTimeline | undefined;
};

const nameCollator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/**
 * Add a tree node and everything below it to the clade list, depth first.
 *
 * @param name - Name of the node to add.
 * @param subtree - The node's children, as the dataset's tree stores them.
 * @param parentName - Name of the node's parent, or undefined for the root.
 * @param depth - Depth of the node; the root is 0.
 * @param dataset - The dataset, for the clade records.
 * @param clades - The list being built.
 */
function addCladeSubtree(
    name: string,
    subtree: TreeNode,
    parentName: string | undefined,
    depth: number,
    dataset: OpenPaleoDataset,
    clades: Array<CladeEntry>,
): void
{
    const childCladeNames = Object.keys(subtree);

    clades.push({
        name,
        slug: createSlug(name),
        record: dataset.clades[name],
        parentName,
        depth,
        childCladeNames,
        genusNames: new Array<string>(),
        totalGenusCount: 0,
    });

    for (const childName of childCladeNames)
    {
        addCladeSubtree(childName, subtree[childName], name, depth + 1, dataset, clades);
    }
}

/**
 * Copy a reference without the citing record's notes, leaving only the bibliographic details.
 *
 * @param reference - A reference as inflated into a citing record.
 * @returns The same reference without notes.
 */
function createBibliographicReference(reference: Reference): Reference
{
    const bibliographic: Reference = { id: reference.id };

    for (const key of Object.keys(reference))
    {
        if (key !== "notes")
        {
            bibliographic[key] = reference[key];
        }
    }

    return bibliographic;
}

/**
 * Record that a genus or clade cites each of its references.
 *
 * @param references - The citing record's references.
 * @param kind - Whether the citing record is a genus or a clade.
 * @param name - Name of the citing record.
 * @param referenceById - Cited works by key, added to as new keys appear.
 */
function addCitations(
    references: Array<Reference> | undefined,
    kind: CitingRecordKind,
    name: string,
    referenceById: Map<string, ReferenceEntry>,
): void
{
    for (const reference of references ?? [])
    {
        let entry = referenceById.get(reference.id);

        if (!entry)
        {
            entry = {
                id: reference.id,
                slug: createSlug(reference.id),
                reference: createBibliographicReference(reference),
                citations: new Array<Citation>(),
                namedTaxa: new Array<NamedTaxon>(),
            };
            referenceById.set(reference.id, entry);
        }

        entry.citations.push({ kind, name, notes: reference.notes });
    }
}

/**
 * Record the works a genus and each of its species were first published in.
 *
 * A genus was erected in its own `erected_in` when the dataset gives one, and otherwise in the
 * work that named its type species.
 *
 * @param genus - The genus.
 * @param referenceById - Cited works by key; their named-taxa lists are added to.
 */
function addNamedGenus(genus: GenusEntry, referenceById: Map<string, ReferenceEntry>): void
{
    const record = genus.record;
    const genusAuthority = record.erected_in ?? getTypeSpecies(record).erected_in;

    referenceById.get(genusAuthority)?.namedTaxa.push({
        kind: "genus",
        name: genus.name,
        publishedAs: undefined,
        pageSlug: genus.slug,
        anchor: "",
    });

    for (const species of record.species)
    {
        referenceById.get(species.erected_in)?.namedTaxa.push({
            kind: "species",
            name: species.name,
            publishedAs: species.erected_as,
            pageSlug: genus.slug,
            anchor: createSlug(species.name),
        });
    }
}

/**
 * Throw if two different names produce the same slug, since their pages would overwrite each
 * other.
 *
 * @param kind - What the names are, for the error message.
 * @param names - The names.
 * @param slugs - The slug of each name, in the same order.
 */
function checkUniqueSlugs(kind: string, names: Array<string>, slugs: Array<string>): void
{
    const nameBySlug = new Map<string, string>();

    for (let index = 0; index < names.length; index++)
    {
        const existing = nameBySlug.get(slugs[index]);

        if (existing !== undefined)
        {
            throw new Error(
                "The " + kind + " \"" + existing + "\" and \"" + names[index] + "\" both have the URL slug \"" +
                slugs[index] + "\".",
            );
        }

        nameBySlug.set(slugs[index], names[index]);
    }
}

/**
 * Arrange the dataset for page generation: sort it, link clades to their children and genera,
 * gather every reference's citations, and assign URL slugs.
 *
 * @param dataset - The parsed dataset.
 * @returns The lookup tables the pages read.
 */
export function createSiteData(dataset: OpenPaleoDataset): SiteData
{
    // Clades, in tree order.
    const clades = new Array<CladeEntry>();

    for (const rootName of Object.keys(dataset.tree))
    {
        addCladeSubtree(rootName, dataset.tree[rootName], undefined, 0, dataset, clades);
    }

    const cladeByName = new Map<string, CladeEntry>();

    for (const clade of clades)
    {
        cladeByName.set(clade.name, clade);
    }

    // Genera, sorted, each attached to its parent clade.
    const genusNames = Object.keys(dataset.genera).sort(nameCollator.compare);
    const genera = new Array<GenusEntry>();
    const genusByName = new Map<string, GenusEntry>();

    for (const name of genusNames)
    {
        const record = dataset.genera[name];
        const entry: GenusEntry = { name, slug: createSlug(name), record };
        const parent = cladeByName.get(record.parent);

        if (!parent)
        {
            throw new Error("The genus " + name + " is placed in \"" + record.parent + "\", which is not in the tree.");
        }

        genera.push(entry);
        genusByName.set(name, entry);
        parent.genusNames.push(name);
    }

    // Genus totals, from the leaves up: clades are in depth-first order, so walking the list
    // backward visits every child before its parent.
    for (let index = clades.length - 1; index >= 0; index--)
    {
        const clade = clades[index];

        clade.totalGenusCount += clade.genusNames.length;

        if (clade.parentName !== undefined)
        {
            const parent = cladeByName.get(clade.parentName);

            if (parent)
            {
                parent.totalGenusCount += clade.totalGenusCount;
            }
        }
    }

    // References, with every genus and then every clade that cites them.
    const referenceById = new Map<string, ReferenceEntry>();

    for (const genus of genera)
    {
        addCitations(genus.record.references, "genus", genus.name, referenceById);
    }

    const cladeNames = new Array<string>();

    for (const clade of clades)
    {
        cladeNames.push(clade.name);
    }

    for (const name of [...cladeNames].sort(nameCollator.compare))
    {
        const record = dataset.clades[name];

        if (record)
        {
            addCitations(record.references, "clade", name, referenceById);
        }
    }

    // Names established in each work: genera and their species, then clades.
    for (const genus of genera)
    {
        addNamedGenus(genus, referenceById);
    }

    for (const clade of clades)
    {
        if (clade.record?.erected_in)
        {
            referenceById.get(clade.record.erected_in)?.namedTaxa.push({
                kind: "clade",
                name: clade.name,
                publishedAs: undefined,
                pageSlug: clade.slug,
                anchor: "",
            });
        }
    }

    const referenceIds = [...referenceById.keys()].sort(nameCollator.compare);
    const references = new Array<ReferenceEntry>();
    const referenceSlugs = new Array<string>();
    const genusSlugs = new Array<string>();
    const cladeSlugs = new Array<string>();

    for (const id of referenceIds)
    {
        const entry = referenceById.get(id) as ReferenceEntry;

        references.push(entry);
        referenceSlugs.push(entry.slug);
    }

    for (const genus of genera)
    {
        genusSlugs.push(genus.slug);
    }

    for (const clade of clades)
    {
        cladeSlugs.push(clade.slug);
    }

    checkUniqueSlugs("genera", genusNames, genusSlugs);
    checkUniqueSlugs("clades", cladeNames, cladeSlugs);
    checkUniqueSlugs("references", referenceIds, referenceSlugs);

    return {
        metadata: dataset._metadata,
        genera,
        genusByName,
        clades,
        cladeByName,
        references,
        referenceById,
        taxonNames: createTaxonNameIndex(dataset),
        timeline: dataset.timescale ? createGeologicTimeline(dataset.timescale) : undefined,
    };
}

let cachedSiteData: SiteData | undefined;

/**
 * Load the dataset and arrange it for page generation, once per build. Pages call this from
 * their frontmatter and getStaticPaths().
 *
 * @returns The lookup tables the pages read.
 */
export function getSiteData(): SiteData
{
    if (!cachedSiteData)
    {
        cachedSiteData = createSiteData(loadDataset());
    }

    return cachedSiteData;
}
