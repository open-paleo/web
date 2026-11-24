import type { DataDownload, Dataset, Taxon, Thing, WithContext } from "schema-dts";

import { createDatasetCitation, dataRepositoryUrl } from "./citations.ts";
import type { Clade, CladeRanks, Identifier, Metadata, Species, Synonym } from "./dataset.ts";
import { formatGenusCount, formatQuotes, getIdentifierUrl } from "./format.ts";
import type { DatasetFile } from "./indexes.ts";
import { formatFileSize } from "./indexes.ts";
import { getLicenseInfo } from "./media.ts";
import type { CladeEntry, GenusEntry, SiteData } from "./site-data.ts";
import { createSlug } from "./slugs.ts";
import { createPageUrl } from "./urls.ts";

// Structured data describes a page's subject to search engines and linked-data crawlers, as
// schema.org JSON-LD in the page's head. Genus and clade pages describe their taxon, following
// the Bioschemas Taxon profile where the dataset has what it requires, and the Data page
// describes the dataset, which Google Dataset Search reads.

/**
 * One page's structured data: a schema.org item with its context, ready to write as JSON-LD.
 */
export type StructuredData = WithContext<Thing>;

/**
 * A link to the profile a record follows, under Dublin Core's conformsTo, which Bioschemas uses
 * to mark its profiles.
 */
type ProfileReference = {
    /**
     * The profile's address, with its version.
     */
    "@id": string;

    /**
     * Always a creative work.
     */
    "@type": "CreativeWork";
};

/**
 * A taxon that states it follows the Bioschemas Taxon profile. schema.org has no conformsTo,
 * so the property is written as its full Dublin Core address.
 */
type BioschemasTaxon = Taxon & {
    /**
     * The Bioschemas profile the taxon follows.
     */
    "http://purl.org/dc/terms/conformsTo": ProfileReference;
};

/**
 * A rank the dataset states: genus and species, and each clade's rank, "unranked" for a clade
 * with a phylogenetic name.
 */
type TaxonRank = "genus" | "species" | CladeRanks;

const taxonProfile: ProfileReference = {
    "@id": "https://bioschemas.org/profiles/Taxon/1.0-RELEASE",
    "@type": "CreativeWork",
};

// Each rank's term in the TDWG taxon rank vocabulary, which the profile asks for alongside the
// word. The vocabulary has no term for an unranked clade, which gets the word alone.
const taxonRankTerms = new Map<TaxonRank, string>([
    ["superfamily", "http://rs.tdwg.org/ontology/voc/TaxonRank#Superfamily"],
    ["family", "http://rs.tdwg.org/ontology/voc/TaxonRank#Family"],
    ["subfamily", "http://rs.tdwg.org/ontology/voc/TaxonRank#Subfamily"],
    ["tribe", "http://rs.tdwg.org/ontology/voc/TaxonRank#Tribe"],
    ["genus", "http://rs.tdwg.org/ontology/voc/TaxonRank#Genus"],
    ["species", "http://rs.tdwg.org/ontology/voc/TaxonRank#Species"],
]);

// Media types of the dataset's files, by extension. Files with no registered or customary type
// (the Newick and NEXUS trees, the TypeScript declarations) get none.
const encodingFormats: Array<[string, string]> = [
    [".json", "application/json"],
    [".yml", "application/yaml"],
    [".bib", "application/x-bibtex"],
    [".py", "text/x-python"],
];

// Characters written as \u escapes, so that dataset text can't end the script element ("</script>")
// or open an HTML comment in it. JSON reads the escapes back as the same characters.
const scriptUnsafeCharacters = /[<>&\u2028\u2029]/gu;

/**
 * Get a rank as the profile asks for it: the word, and its TDWG term when it has one.
 *
 * @param rank - The rank.
 * @returns The word, then the term.
 */
function getTaxonRankValues(rank: TaxonRank): Array<string>
{
    const term = taxonRankTerms.get(rank);

    return term ? [rank, term] : [rank];
}

/**
 * Get the other names a taxon has gone by, from its synonyms. Possible synonyms are left out,
 * since they may name a different animal.
 *
 * @param synonyms - The record's synonyms.
 * @returns The names, in the dataset's order.
 */
function getAlternateNames(synonyms: Array<Synonym> | undefined): Array<string>
{
    const names = new Array<string>();

    for (const synonym of synonyms ?? [])
    {
        if (synonym.type !== "possible subjective")
        {
            names.push(synonym.name);
        }
    }

    return names;
}

/**
 * Get the addresses of a genus's or clade's entries in outside databases.
 *
 * @param identifiers - The record's identifiers.
 * @returns The addresses, in the dataset's order.
 */
function getSameAsUrls(identifiers: Array<Identifier> | undefined): Array<string>
{
    const urls = new Array<string>();

    for (const identifier of identifiers ?? [])
    {
        const url = getIdentifierUrl(identifier.source ?? "", identifier.id ?? "");

        if (url)
        {
            urls.push(url);
        }
    }

    return urls;
}

/**
 * Create a reference to a clade from another taxon: its name, and its rank and page when it
 * has a record. The ranks above Dinosauria have neither.
 *
 * @param name - The clade's name.
 * @param siteData - The site's lookup tables.
 * @param siteUrl - The site's address with its base path.
 * @returns The clade.
 */
function createCladeReference(name: string, siteData: SiteData, siteUrl: URL): Taxon
{
    const clade = siteData.cladeByName.get(name);

    if (clade?.record)
    {
        const pageUrl = createPageUrl(siteUrl, "clade", clade.slug);

        return { "@type": "Taxon", "@id": pageUrl, name, taxonRank: getTaxonRankValues(clade.record.rank), url: pageUrl };
    }

    return { "@type": "Taxon", name };
}

/**
 * Create a reference to a genus from its clade: its name, rank and page.
 *
 * @param name - The genus's name.
 * @param siteData - The site's lookup tables.
 * @param siteUrl - The site's address with its base path.
 * @returns The genus.
 */
function createGenusReference(name: string, siteData: SiteData, siteUrl: URL): Taxon
{
    const genus = siteData.genusByName.get(name);
    const taxonRank = getTaxonRankValues("genus");

    if (genus)
    {
        const pageUrl = createPageUrl(siteUrl, "genus", genus.slug);

        return { "@type": "Taxon", "@id": pageUrl, name, taxonRank, url: pageUrl };
    }

    return { "@type": "Taxon", name, taxonRank };
}

/**
 * Create a species of a genus, as a child of the genus's taxon. A species has no page of its
 * own; its address is its section of the genus page.
 *
 * @param species - The species.
 * @param genusPageUrl - The genus page's address.
 * @returns The species.
 */
function createSpeciesTaxon(species: Species, genusPageUrl: string): Taxon
{
    const taxon: Taxon = {
        "@type": "Taxon",
        name: species.name,
        taxonRank: getTaxonRankValues("species"),
        url: genusPageUrl + "#" + createSlug(species.name),
    };
    const alternateNames = getAlternateNames(species.synonyms);

    if (alternateNames.length > 0)
    {
        taxon.alternateName = alternateNames;
    }

    return taxon;
}

/**
 * Create a genus page's structured data: the genus as a Bioschemas taxon, with its parent
 * clade, its species, its synonyms and its entries in outside databases.
 *
 * @param entry - The genus.
 * @param siteData - The site's lookup tables.
 * @param siteUrl - The site's address with its base path.
 * @returns The structured data.
 */
export function createGenusStructuredData(entry: GenusEntry, siteData: SiteData, siteUrl: URL): StructuredData
{
    const genus = entry.record;
    const pageUrl = createPageUrl(siteUrl, "genus", entry.slug);
    const species = new Array<Taxon>();

    for (const item of genus.species)
    {
        species.push(createSpeciesTaxon(item, pageUrl));
    }

    const taxon: WithContext<BioschemasTaxon> = {
        "@context": "https://schema.org",
        "@type": "Taxon",
        "@id": pageUrl,
        "http://purl.org/dc/terms/conformsTo": taxonProfile,
        name: genus.genus,
        taxonRank: getTaxonRankValues("genus"),
        url: pageUrl,
        description: formatQuotes(genus.description.trim()),
        parentTaxon: createCladeReference(genus.parent, siteData, siteUrl),
        childTaxon: species,
    };
    const alternateNames = getAlternateNames(genus.synonyms);
    const sameAsUrls = getSameAsUrls(genus.identifiers);

    if (alternateNames.length > 0)
    {
        taxon.alternateName = alternateNames;
    }

    if (sameAsUrls.length > 0)
    {
        taxon.sameAs = sameAsUrls;
    }

    return taxon;
}

/**
 * Create a clade page's structured data: the clade as a Bioschemas taxon, with its rank, its
 * parent clade, the clades and genera directly within it, its synonyms and its entries in
 * outside databases.
 *
 * @param entry - The clade.
 * @param record - The clade's record.
 * @param siteData - The site's lookup tables.
 * @param siteUrl - The site's address with its base path.
 * @returns The structured data.
 */
export function createCladeStructuredData(entry: CladeEntry, record: Clade, siteData: SiteData, siteUrl: URL): StructuredData
{
    const pageUrl = createPageUrl(siteUrl, "clade", entry.slug);
    const children = new Array<Taxon>();

    for (const name of entry.childCladeNames)
    {
        children.push(createCladeReference(name, siteData, siteUrl));
    }

    for (const name of entry.genusNames)
    {
        children.push(createGenusReference(name, siteData, siteUrl));
    }

    const taxon: WithContext<BioschemasTaxon> = {
        "@context": "https://schema.org",
        "@type": "Taxon",
        "@id": pageUrl,
        "http://purl.org/dc/terms/conformsTo": taxonProfile,
        name: entry.name,
        taxonRank: getTaxonRankValues(record.rank),
        url: pageUrl,
        description: formatQuotes(record.description.trim()),
    };
    const alternateNames = getAlternateNames(record.synonyms);
    const sameAsUrls = getSameAsUrls(record.identifiers);

    if (entry.parentName !== undefined)
    {
        taxon.parentTaxon = createCladeReference(entry.parentName, siteData, siteUrl);
    }

    if (children.length > 0)
    {
        taxon.childTaxon = children;
    }

    if (alternateNames.length > 0)
    {
        taxon.alternateName = alternateNames;
    }

    if (sameAsUrls.length > 0)
    {
        taxon.sameAs = sameAsUrls;
    }

    return taxon;
}

/**
 * Find the media type of a dataset file from its extension.
 *
 * @param fileName - The file's name: "open-paleo.json".
 * @returns The media type, or undefined when the file has none.
 */
function findEncodingFormat(fileName: string): string | undefined
{
    for (const [extension, format] of encodingFormats)
    {
        if (fileName.endsWith(extension))
        {
            return format;
        }
    }

    return undefined;
}

/**
 * Create one downloadable file of the dataset, at its address in the data repository.
 *
 * @param file - The file.
 * @returns The download.
 */
function createDataDownload(file: DatasetFile): DataDownload
{
    const download: DataDownload = {
        "@type": "DataDownload",
        name: file.name,
        description: file.description,
        contentUrl: dataRepositoryUrl + "/raw/main/dist/" + file.name,
    };
    const encodingFormat = findEncodingFormat(file.name);

    if (encodingFormat)
    {
        download.encodingFormat = encodingFormat;
    }

    if (file.sizeBytes !== undefined)
    {
        download.contentSize = formatFileSize(file.sizeBytes);
    }

    return download;
}

/**
 * Create the Data page's structured data: the dataset, its release, license and files, for
 * Google Dataset Search.
 *
 * @param metadata - The release metadata.
 * @param files - The dataset's files, as the Data page lists them.
 * @param pageUrl - The Data page's address.
 * @returns The structured data.
 */
export function createDatasetStructuredData(metadata: Metadata, files: Array<DatasetFile>, pageUrl: string): WithContext<Dataset>
{
    const downloads = new Array<DataDownload>();

    for (const file of files)
    {
        downloads.push(createDataDownload(file));
    }

    return {
        "@context": "https://schema.org",
        "@type": "Dataset",
        "@id": pageUrl,
        name: "Open Paleo",
        description: "A free, community-built dataset of fossil genera and clades, such as dinosaurs, with every value taken from published research: "
            + formatGenusCount(metadata.genus_count) + " in " + metadata.clade_count + " clades, with the clade tree and every work cited.",
        url: pageUrl,
        sameAs: dataRepositoryUrl,
        version: metadata.version,
        dateModified: metadata.built_at,
        isAccessibleForFree: true,
        license: getLicenseInfo(metadata.license).url || metadata.license,
        creator: { "@type": "Organization", name: metadata.attribution, url: "https://github.com/open-paleo" },
        creditText: createDatasetCitation(metadata).text,
        distribution: downloads,
    };
}

/**
 * Write the escape of one character that may not appear as itself in a script element.
 *
 * @param character - The character.
 * @returns Its \u escape: "<" for "<".
 */
function writeUnicodeEscape(character: string): string
{
    return "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0");
}

/**
 * Write structured data as the text of a JSON-LD script element. The text is JSON with "<", ">",
 * "&" and the line and paragraph separators escaped, so dataset text in it can never end the
 * element: this is the one place the site writes dataset text with set:html.
 *
 * @param data - The page's structured data.
 * @returns The script's text.
 */
export function writeJsonLd(data: StructuredData): string
{
    return JSON.stringify(data).replace(scriptUnsafeCharacters, writeUnicodeEscape);
}
