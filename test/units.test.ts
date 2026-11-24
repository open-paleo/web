import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createUnitLabels, formatStratigraphicUnits, formatUnitName } from "../src/data/format.ts";
import { createSiteData } from "../src/data/site-data.ts";
import { createUnitIndex, describeUnitRank, findLocationUnit, getPageReferences, getUnitPath, getUnitRankTerm } from "../src/data/units.ts";
import { readFixture } from "./fixture.ts";

const dataset = readFixture();
const siteData = createSiteData(dataset);
const units = createUnitIndex(dataset, siteData);

test("a unit's name takes its rank unless it already names a rock type or the unit is informal", () =>
{
    assert.equal(formatUnitName("Hell Creek", "formation", false), "Hell Creek Formation");
    assert.equal(formatUnitName("Navajo Sandstone", "formation", false), "Navajo Sandstone");
    assert.equal(formatUnitName("Smoky Hill Chalk", "member", false), "Smoky Hill Chalk");
    assert.equal(formatUnitName("Lower Greensand", "group", false), "Lower Greensand Group");
    assert.equal(formatUnitName("Hastings Beds", "group", false), "Hastings Beds");
    assert.equal(formatUnitName("Chalk", "group", false), "Chalk Group");
    assert.equal(formatUnitName("Wealden", "supergroup", false), "Wealden Supergroup");
    assert.equal(formatUnitName("Bayan Mandahu", "formation", true), "Bayan Mandahu");
    assert.equal(formatUnitName("Dinosaur Beds", undefined, false), "Dinosaur Beds");
});

test("a location's units read finest to broadest, with any informal division, and keep their names for look-ups", () =>
{
    const location = { country: "US", member: "Brushy Basin", formation: "Morrison", part: "upper", part_of: "member" as const };

    assert.deepEqual(createUnitLabels(location), [
        { name: "Brushy Basin", text: "upper Brushy Basin Member" },
        { name: "Morrison", text: "Morrison Formation" },
    ]);
    assert.equal(formatStratigraphicUnits(location), "upper Brushy Basin Member, Morrison Formation");
    assert.equal(findLocationUnit(location), "Brushy Basin");
});

test("members are sections of their formation's page, and their paths lead to the section", () =>
{
    const morrison = units.pageByName.get("Morrison");

    assert.ok(morrison);
    assert.equal(units.pageByName.has("Brushy Basin"), false);
    assert.deepEqual(morrison.sections.map((section) => section.name).sort(), ["Brushy Basin", "Salt Wash"]);
    assert.equal(getUnitPath(units, "Morrison"), "unit/morrison/");
    assert.equal(getUnitPath(units, "Brushy Basin"), "unit/morrison/#brushy-basin");
});

test("a page counts the genera of its members, and a group's page those of its formations", () =>
{
    const morrison = units.pageByName.get("Morrison");
    const bellyRiver = units.pageByName.get("Belly River");

    assert.ok(morrison && bellyRiver);

    for (const section of morrison.sections)
    {
        for (const genus of section.genera)
        {
            assert.ok(morrison.genera.includes(genus), genus.name + " is listed on the Morrison page");
        }
    }

    assert.deepEqual(bellyRiver.subunitPages.map((subunit) => subunit.name), ["Oldman"]);
    assert.ok(bellyRiver.genera.length >= (units.pageByName.get("Oldman")?.genera.length ?? 0));
});

test("every unit a species names has a page or a section, and only units with genera have pages", () =>
{
    for (const genus of siteData.genera)
    {
        for (const species of genus.record.species)
        {
            const name = findLocationUnit(species.location);

            if (name)
            {
                assert.ok(getUnitPath(units, name), name);
            }
        }
    }

    for (const page of units.pages)
    {
        assert.ok(page.genera.length > 0, page.entry.name);
    }
});

test("a page lists each reference its unit and sections cite once", () =>
{
    const morrison = units.pageByName.get("Morrison");

    assert.ok(morrison);

    const ids = getPageReferences(morrison).map((reference) => reference.id);

    assert.equal(new Set(ids).size, ids.length);

    for (const unit of [morrison.entry, ...morrison.sections])
    {
        for (const reference of unit.record.references)
        {
            assert.ok(ids.includes(reference.id), reference.id);
        }
    }
});

test("a rank is described for display", () =>
{
    assert.equal(describeUnitRank({ rank: "formation", description: "", period: {}, references: [] }), "Formation");
    assert.equal(describeUnitRank({ rank: "bed", informal: true, description: "", period: {}, references: [] }), "Informal bed");
    assert.equal(describeUnitRank({ description: "", period: {}, references: [] }), "Rock unit");
});

test("a rank links to formation, strata or rock unit in the glossary", () =>
{
    const stratigraphy = dataset.stratigraphy ?? {};

    assert.equal(getUnitRankTerm(stratigraphy.Conques), "formation");
    assert.equal(getUnitRankTerm(stratigraphy["Brushy Basin"]), "rock unit", "a member");
    assert.equal(getUnitRankTerm(stratigraphy.Tremp), "rock unit", "a group");
    assert.equal(getUnitRankTerm(stratigraphy.Manuka), "rock unit", "a subgroup");
    assert.equal(getUnitRankTerm({ rank: "bed", description: "", period: {}, references: [] }), "strata");
});
