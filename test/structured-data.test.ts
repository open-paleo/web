import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { DatasetFile } from "../src/data/indexes.ts";
import type { GenusEntry } from "../src/data/site-data.ts";
import { createSiteData } from "../src/data/site-data.ts";
import type { StructuredData } from "../src/data/structured-data.ts";
import { createCladeStructuredData, createDatasetStructuredData, createGenusStructuredData, writeJsonLd } from "../src/data/structured-data.ts";
import { createSlug } from "../src/data/slugs.ts";
import { createPageUrl } from "../src/data/urls.ts";
import { readFixture } from "./fixture.ts";

/**
 * A profile reference as it is written in JSON-LD.
 */
type ProfileJson = {
    /**
     * The profile's address.
     */
    "@id": string;
};

/**
 * A taxon as it is written in JSON-LD, with the fields the tests read.
 */
type TaxonJson = {
    /**
     * The taxon's page, when it has one.
     */
    "@id"?: string;

    /**
     * The Bioschemas profile it follows, when it claims one.
     */
    "http://purl.org/dc/terms/conformsTo"?: ProfileJson;

    /**
     * The taxon's name.
     */
    name: string;

    /**
     * Its rank, as a word and a TDWG term.
     */
    taxonRank?: Array<string>;

    /**
     * Its page, or its section of a page.
     */
    url?: string;

    /**
     * The clade above it.
     */
    parentTaxon?: TaxonJson;

    /**
     * The taxa directly within it.
     */
    childTaxon?: Array<TaxonJson>;

    /**
     * Its synonyms.
     */
    alternateName?: Array<string>;

    /**
     * Its entries in outside databases.
     */
    sameAs?: Array<string>;
};

/**
 * A downloadable file as it is written in JSON-LD.
 */
type DataDownloadJson = {
    /**
     * The file's name.
     */
    name: string;

    /**
     * Where it is downloaded from.
     */
    contentUrl: string;

    /**
     * Its media type, when it has one.
     */
    encodingFormat?: string;
};

/**
 * The dataset as it is written in JSON-LD, with the fields the tests read.
 */
type DatasetJson = {
    /**
     * The release version.
     */
    version: string;

    /**
     * The address of the license.
     */
    license: string;

    /**
     * The dataset's files.
     */
    distribution: Array<DataDownloadJson>;
};

const dataset = readFixture();
const siteData = createSiteData(dataset);
const siteUrl = new URL("https://open-paleo.org/");

/**
 * Write structured data as JSON-LD and read it back, as a crawler would.
 *
 * @param data - The structured data.
 * @returns The parsed JSON.
 */
function readJsonLd(data: StructuredData): unknown
{
    return JSON.parse(writeJsonLd(data));
}

/**
 * Find a genus of the fixture, failing the test when it is missing.
 *
 * @param name - The genus's name.
 * @returns The genus's entry.
 */
function findGenus(name: string): GenusEntry
{
    const entry = siteData.genusByName.get(name);

    assert.ok(entry, name + " is in the fixture");

    return entry;
}

test("createPageUrl keeps the site's base path", () =>
{
    assert.equal(createPageUrl(siteUrl, "genus", "tyrannosaurus"), "https://open-paleo.org/genus/tyrannosaurus/");
    assert.equal(createPageUrl(new URL("https://open-paleo.github.io/web/"), "clade", "dinosauria"), "https://open-paleo.github.io/web/clade/dinosauria/");
});

test("a genus is a Bioschemas taxon with its rank, parent clade, species and outside entries", () =>
{
    const entry = findGenus("Tarbosaurus");
    const genus = entry.record;
    const taxon = readJsonLd(createGenusStructuredData(entry, siteData, siteUrl)) as TaxonJson;
    const pageUrl = "https://open-paleo.org/genus/" + entry.slug + "/";

    assert.equal(taxon["@id"], pageUrl);
    assert.equal(taxon["http://purl.org/dc/terms/conformsTo"]?.["@id"], "https://bioschemas.org/profiles/Taxon/1.0-RELEASE");
    assert.equal(taxon.name, genus.genus);
    assert.deepEqual(taxon.taxonRank, ["genus", "http://rs.tdwg.org/ontology/voc/TaxonRank#Genus"]);
    assert.equal(taxon.parentTaxon?.name, genus.parent);
    assert.equal(taxon.parentTaxon?.["@id"], createPageUrl(siteUrl, "clade", siteData.cladeByName.get(genus.parent)?.slug ?? ""));
    assert.equal(taxon.childTaxon?.length, genus.species.length);
    assert.equal(taxon.childTaxon?.[0].name, genus.species[0].name);
    assert.equal(taxon.childTaxon?.[0].url, pageUrl + "#" + createSlug(genus.species[0].name));
    assert.equal(taxon.sameAs?.length, genus.identifiers?.length);
});

test("a genus's alternate names leave out possible synonyms", () =>
{
    const entry = findGenus("Tarbosaurus");
    const genus = entry.record;
    const taxon = readJsonLd(createGenusStructuredData(entry, siteData, siteUrl)) as TaxonJson;
    const expected = new Array<string>();
    let possibleCount = 0;

    for (const synonym of genus.synonyms ?? [])
    {
        if (synonym.type === "possible subjective")
        {
            possibleCount++;
        }
        else
        {
            expected.push(synonym.name);
        }
    }

    assert.ok(possibleCount > 0, "the fixture has a possible synonym to leave out");
    assert.deepEqual(taxon.alternateName ?? [], expected);
});

test("an unranked clade is a Bioschemas taxon listing the clades and genera directly within it", () =>
{
    const entry = siteData.cladeByName.get("Dinosauria");

    assert.ok(entry?.record);

    const taxon = readJsonLd(createCladeStructuredData(entry, entry.record, siteData, siteUrl)) as TaxonJson;

    assert.equal(taxon["@id"], "https://open-paleo.org/clade/" + entry.slug + "/");
    assert.equal(taxon["http://purl.org/dc/terms/conformsTo"]?.["@id"], "https://bioschemas.org/profiles/Taxon/1.0-RELEASE");
    // The TDWG vocabulary has no term for an unranked clade.
    assert.deepEqual(taxon.taxonRank, ["unranked"]);
    assert.equal(taxon.childTaxon?.length, entry.childCladeNames.length + entry.genusNames.length);
    // The ranks above Dinosauria have no page, so its parent is named without an address or rank.
    assert.equal(taxon.parentTaxon?.name, entry.parentName);
    assert.equal(taxon.parentTaxon?.["@id"], undefined);
    assert.equal(taxon.parentTaxon?.taxonRank, undefined);
});

test("a ranked clade gives its rank as a word and a TDWG term, and so do the clades around it", () =>
{
    const entry = siteData.cladeByName.get("Tyrannosauridae");

    assert.ok(entry?.record);
    assert.equal(entry.record.rank, "family");

    const taxon = readJsonLd(createCladeStructuredData(entry, entry.record, siteData, siteUrl)) as TaxonJson;
    const subfamily = taxon.childTaxon?.find((child) => child.name === "Tyrannosaurinae");

    assert.deepEqual(taxon.taxonRank, ["family", "http://rs.tdwg.org/ontology/voc/TaxonRank#Family"]);
    assert.deepEqual(subfamily?.taxonRank, ["subfamily", "http://rs.tdwg.org/ontology/voc/TaxonRank#Subfamily"]);
    assert.deepEqual(taxon.parentTaxon?.taxonRank, getExpectedRank(entry.parentName));
});

test("a clade links to its entries in outside databases", () =>
{
    const entry = siteData.cladeByName.get("Tyrannosauridae");

    assert.ok(entry?.record);

    const identifiers = entry.record.identifiers ?? [];
    const taxon = readJsonLd(createCladeStructuredData(entry, entry.record, siteData, siteUrl)) as TaxonJson;
    const wikidata = identifiers.find((identifier) => identifier.source === "wikidata");

    assert.ok(identifiers.length > 0, "the fixture's Tyrannosauridae has identifiers");
    assert.equal(taxon.sameAs?.length, identifiers.length);
    assert.ok(wikidata?.id);
    assert.ok(taxon.sameAs?.includes("https://www.wikidata.org/wiki/" + wikidata.id));
});

/**
 * Get the rank a clade reference should carry: its record's rank, with the TDWG term when the
 * vocabulary has one.
 *
 * @param name - The clade's name.
 * @returns The rank values, or undefined for a clade without a record.
 */
function getExpectedRank(name: string | undefined): Array<string> | undefined
{
    const rank = name ? siteData.cladeByName.get(name)?.record?.rank : undefined;

    if (!rank)
    {
        return undefined;
    }

    return rank === "unranked" ? [rank] : [rank, "http://rs.tdwg.org/ontology/voc/TaxonRank#" + rank.charAt(0).toUpperCase() + rank.slice(1)];
}

test("the dataset gives its release, license and every file", () =>
{
    const files: Array<DatasetFile> = [
        { name: "open-paleo.json", description: "The complete dataset as JSON.", sizeBytes: 2048 },
        { name: "tree.newick", description: "The clade tree in Newick notation.", sizeBytes: undefined },
    ];
    const data = readJsonLd(createDatasetStructuredData(dataset._metadata, files, "https://open-paleo.org/data/")) as DatasetJson;

    assert.equal(data.version, dataset._metadata.version);
    assert.equal(data.license, "https://creativecommons.org/licenses/by/4.0/");
    assert.equal(data.distribution.length, 2);
    assert.equal(data.distribution[0].contentUrl, "https://github.com/open-paleo/data/raw/" + dataset._metadata.version + "/dist/open-paleo.json");
    assert.equal(data.distribution[0].encodingFormat, "application/json");
    assert.equal(data.distribution[1].encodingFormat, undefined);
});

test("writeJsonLd escapes text that would end the script element", () =>
{
    const data: StructuredData = { "@context": "https://schema.org", "@type": "Taxon", name: "</script><!-- & \u2028" };
    const text = writeJsonLd(data);

    assert.equal(text.includes("<"), false);
    assert.equal(text.includes(">"), false);
    assert.equal(text.includes("&"), false);
    assert.equal(text.includes("\u2028"), false);
    assert.deepEqual(JSON.parse(text), data);
});
