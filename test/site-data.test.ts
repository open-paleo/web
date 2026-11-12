import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import type { CladeEntry, GenusEntry, ReferenceEntry } from "../src/data/site-data.ts";
import { createSiteData } from "../src/data/site-data.ts";
import { readDataset } from "../src/data/load-dataset.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const dataset = readDataset(path.join(testDirectory, "fixtures"), "3.4.0");
const siteData = createSiteData(dataset);

/**
 * Get a clade entry that the fixture is known to contain.
 *
 * @param name - Clade name.
 * @returns The entry.
 */
function getClade(name: string): CladeEntry
{
    const clade = siteData.cladeByName.get(name);

    assert.ok(clade, name + " should be in the fixture");

    return clade;
}

/**
 * Get a genus entry that the fixture is known to contain.
 *
 * @param name - Genus name.
 * @returns The entry.
 */
function getGenus(name: string): GenusEntry
{
    const genus = siteData.genusByName.get(name);

    assert.ok(genus, name + " should be in the fixture");

    return genus;
}

/**
 * Get a reference entry that the fixture is known to contain.
 *
 * @param id - Reference key.
 * @returns The entry.
 */
function getReference(id: string): ReferenceEntry
{
    const reference = siteData.referenceById.get(id);

    assert.ok(reference, id + " should be in the fixture");

    return reference;
}

test("genera are sorted by name and have slugs", () =>
{
    const names = new Array<string>();

    for (const genus of siteData.genera)
    {
        names.push(genus.name);
    }

    assert.deepEqual(names, [...names].sort());
    assert.equal(getGenus("Tyrannosaurus").slug, "tyrannosaurus");
    assert.equal(siteData.genera.length, Object.keys(dataset.genera).length);
});

test("clades are listed in tree order from the root", () =>
{
    assert.equal(siteData.clades[0].name, "Life");
    assert.equal(siteData.clades[0].depth, 0);
    assert.equal(siteData.clades[0].parentName, undefined);
});

test("ranks above Dinosauria have no record", () =>
{
    assert.equal(getClade("Archosauria").record, undefined);
    assert.ok(getClade("Dinosauria").record);
});

test("clades link to their children and parent", () =>
{
    assert.deepEqual(getClade("Tyrannosauridae").childCladeNames, ["Tyrannosaurinae"]);
    assert.equal(getClade("Tyrannosaurinae").parentName, "Tyrannosauridae");
    assert.equal(getClade("Tyrannosaurinae").depth, getClade("Tyrannosauridae").depth + 1);
});

test("genera are attached to their parent clade, sorted", () =>
{
    assert.deepEqual(getClade("Tyrannosaurinae").genusNames, ["Daspletosaurus", "Tarbosaurus", "Tyrannosaurus"]);
});

test("genus totals include every clade below", () =>
{
    assert.equal(getClade("Tyrannosaurinae").totalGenusCount, 3);
    assert.equal(getClade("Life").totalGenusCount, siteData.genera.length);
    assert.equal(
        getClade("Tyrannosauridae").totalGenusCount,
        getClade("Tyrannosauridae").genusNames.length + getClade("Tyrannosaurinae").totalGenusCount,
    );
});

test("a reference lists the records that cite it", () =>
{
    const reference = getReference("osborn1905a");
    const citingNames = new Array<string>();

    for (const citation of reference.citations)
    {
        citingNames.push(citation.kind + ":" + citation.name);
    }

    assert.ok(citingNames.includes("genus:Tyrannosaurus"));
});

test("a reference's bibliographic details carry no citing record's notes", () =>
{
    for (const entry of siteData.references)
    {
        assert.equal(entry.reference.notes, undefined, entry.id + " should not carry notes");
    }
});

test("clade citations are gathered alongside genus citations", () =>
{
    const reference = getReference("osborn1906a");
    let citedByTyrannosauridae = false;

    for (const citation of reference.citations)
    {
        if (citation.kind === "clade" && citation.name === "Tyrannosauridae")
        {
            citedByTyrannosauridae = true;
            assert.ok(citation.notes);
        }
    }

    assert.ok(citedByTyrannosauridae);
});

test("reference keys with accents and apostrophes get plain slugs", () =>
{
    let checked = 0;

    for (const entry of siteData.references)
    {
        assert.match(entry.slug, /^[a-z0-9-]+$/, entry.id);

        if (entry.id !== entry.slug)
        {
            checked++;
        }
    }

    assert.ok(checked >= 2, "the fixture should include keys that need folding");
});

test("references are sorted by key", () =>
{
    const ids = new Array<string>();

    for (const entry of siteData.references)
    {
        ids.push(entry.id);
    }

    assert.deepEqual(ids, [...ids].sort(new Intl.Collator("en", { sensitivity: "base", numeric: true }).compare));
});

test("a genus placed in a clade missing from the tree is an error", () =>
{
    const broken = structuredClone(dataset);

    broken.genera.Tyrannosaurus.parent = "Nonexistentidae";
    assert.throws(() => createSiteData(broken), /Nonexistentidae/);
});

test("two genera with the same slug are an error", () =>
{
    const broken = structuredClone(dataset);

    broken.genera["tyrannosaurus"] = broken.genera.Tyrannosaurus;
    assert.throws(() => createSiteData(broken), /same URL slug|both have the URL slug/);
});

test("a reference lists the names first published in it", () =>
{
    const named = new Array<string>();

    for (const taxon of getReference("osborn1905a").namedTaxa)
    {
        named.push(taxon.kind + ":" + taxon.name);
    }

    assert.ok(named.includes("genus:Tyrannosaurus"));
    assert.ok(named.includes("species:Tyrannosaurus rex"));
});

test("a named species links to its section of the genus page", () =>
{
    for (const taxon of getReference("osborn1905a").namedTaxa)
    {
        if (taxon.kind === "species" && taxon.name === "Tyrannosaurus rex")
        {
            assert.equal(taxon.pageSlug, "tyrannosaurus");
            assert.equal(taxon.anchor, "tyrannosaurus-rex");
        }
    }
});

test("a clade is listed under the work that erected it", () =>
{
    let found = false;

    for (const taxon of getReference("osborn1906a").namedTaxa)
    {
        if (taxon.kind === "clade" && taxon.name === "Tyrannosauridae")
        {
            found = true;
        }
    }

    assert.ok(found);
});
