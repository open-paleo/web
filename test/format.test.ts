import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
    createCitationParts,
    describeAgeResolution,
    formatAgeRange,
    formatAuthority,
    formatAuthorNames,
    formatCountry,
    formatGeologicAge,
    formatPlace,
    formatShortCitation,
    formatSizeRange,
    formatSpecimenType,
    formatStratigraphicUnits,
    getFirstSentence,
    getIdentifierUrl,
    getSurnames,
    joinNonEmpty,
} from "../src/data/format.ts";

test("getSurnames reads the reference store's author format", () =>
{
    assert.deepEqual(getSurnames("Osborn, H. F."), ["Osborn"]);
    assert.deepEqual(getSurnames("Fiorillo, A. R.; Tykoski, R. S."), ["Fiorillo", "Tykoski"]);
    assert.deepEqual(getSurnames("Ma, F.; Qinggele; Logan King, J."), ["Ma", "Qinggele", "Logan King"]);
    assert.deepEqual(
        getSurnames("International Commission on Zoological Nomenclature"),
        ["International Commission on Zoological Nomenclature"],
    );
});

test("formatAuthorNames follows zoological convention", () =>
{
    assert.equal(formatAuthorNames("Osborn, H. F."), "Osborn");
    assert.equal(formatAuthorNames("Fiorillo, A. R.; Tykoski, R. S."), "Fiorillo & Tykoski");
    assert.equal(formatAuthorNames("Persons, S. W.; Currie, P. J.; Erickson, G. M."), "Persons et al.");
});

test("formatAuthority adds the year and, for a species moved to another genus, parentheses", () =>
{
    assert.equal(formatAuthority("Osborn, H. F.", 1905, false), "Osborn, 1905");
    assert.equal(formatAuthority("Maleev, E. A.", 1955, true), "(Maleev, 1955)");
    assert.equal(formatAuthority(undefined, 1955, false), "");
});

test("formatShortCitation gives surname and year", () =>
{
    assert.equal(formatShortCitation({ id: "brochu2003a", authors: "Brochu, C. R.", year: 2003 }), "Brochu (2003)");
});

test("formatSizeRange collapses equal ends and separates thousands", () =>
{
    assert.equal(formatSizeRange({ min: 11.9, max: 13 }, "m"), "11.9–13 m");
    assert.equal(formatSizeRange({ min: 3.75, max: 3.75 }, "m"), "3.75 m");
    assert.equal(formatSizeRange({ min: 5400, max: 9500 }, "kg"), "5,400–9,500 kg");
});

test("formatAgeRange gives one decimal place", () =>
{
    assert.equal(formatAgeRange(72.2, 66), "72.2–66.0 million years ago");
    assert.equal(formatAgeRange(66, 66), "66.0 million years ago");
});

test("formatCountry names countries from their codes", () =>
{
    assert.equal(formatCountry("US"), "United States");
    assert.equal(formatCountry("MN"), "Mongolia");
});

test("formatStratigraphicUnits lists units finest first and places informal divisions", () =>
{
    assert.equal(formatStratigraphicUnits({ formation: "Hell Creek" }), "Hell Creek Formation");
    assert.equal(
        formatStratigraphicUnits({ member: "Valle de la Luna", formation: "Ischigualasto" }),
        "Valle de la Luna Member, Ischigualasto Formation",
    );
    assert.equal(
        formatStratigraphicUnits({ formation: "Hell Creek", part: "upper", part_of: "formation" }),
        "upper Hell Creek Formation",
    );
    assert.equal(formatStratigraphicUnits({ country: "US" }), "");
});

test("formatPlace joins region and country", () =>
{
    assert.equal(formatPlace({ country: "US", region: "Montana", region_code: "US-MT" }), "Montana, United States");
    assert.equal(formatPlace({ country: "MN" }), "Mongolia");
});

test("createCitationParts assembles journal volume, issue and pages", () =>
{
    const parts = createCitationParts({
        id: "osborn1905a",
        authors: "Osborn, H. F.",
        year: 1905,
        title: "Tyrannosaurus and other Cretaceous carnivorous dinosaurs",
        journal: "Bulletin of the American Museum of Natural History",
        volume: "21",
        issue: "14",
        pages: "259-265",
        doi: "10.5281/zenodo.814935",
    });

    assert.equal(parts.container, "Bulletin of the American Museum of Natural History");
    assert.equal(parts.location, "21(14): 259-265");
    assert.equal(parts.doi, "10.5281/zenodo.814935");
    assert.equal(parts.url, "");
});

test("createCitationParts names a thesis's degree and school", () =>
{
    const parts = createCitationParts({
        id: "shipman2004a",
        authors: "Shipman, P.",
        year: 2004,
        title: "Late Triassic stratigraphy.",
        thesis: "doctoral",
        school: "University of Kansas",
    });

    assert.equal(parts.publisher, "Doctoral thesis, University of Kansas");
    assert.equal(parts.title, "Late Triassic stratigraphy");
});

test("getIdentifierUrl links each outside database", () =>
{
    assert.equal(getIdentifierUrl("pbdb", "38613"), "https://paleobiodb.org/classic/checkTaxonInfo?taxon_no=38613");
    assert.equal(getIdentifierUrl("wikidata", "Q14332"), "https://www.wikidata.org/wiki/Q14332");
    assert.equal(getIdentifierUrl("unknown", "1"), undefined);
});

test("formatGeologicAge names stages and periods as spans", () =>
{
    assert.equal(formatGeologicAge({ name: ["Late Cretaceous"], stage: ["Maastrichtian"] }), "Maastrichtian, Late Cretaceous");
    assert.equal(
        formatGeologicAge({ name: ["Late Cretaceous"], stage: ["Campanian", "Maastrichtian"] }),
        "Campanian–Maastrichtian, Late Cretaceous",
    );
    assert.equal(formatGeologicAge({ name: ["Late Jurassic"] }), "Late Jurassic");
});

test("formatSpecimenType pluralizes a syntype series", () =>
{
    assert.equal(formatSpecimenType("holotype", 1), "Holotype");
    assert.equal(formatSpecimenType("syntype", 3), "Syntypes");
    assert.equal(formatSpecimenType("unknown", 1), "Type specimen");
    assert.equal(formatSpecimenType(undefined, 0), "Type specimen");
});

test("describeAgeResolution explains only qualified ages", () =>
{
    assert.match(describeAgeResolution("unit"), /containing rock unit/);
    assert.equal(describeAgeResolution(undefined), "");
});

test("joinNonEmpty skips empty parts", () =>
{
    assert.equal(joinNonEmpty(["", "Montana", "United States"]), "Montana, United States");
    assert.equal(joinNonEmpty(["", ""]), "");
});

test("getFirstSentence stops at the first sentence end, not at an abbreviation", () =>
{
    assert.equal(getFirstSentence("Tyrannosaurus is a genus. It lived in Laramidia."), "Tyrannosaurus is a genus.");
    assert.equal(
        getFirstSentence("The species T. rex is the type. Others are doubtful."),
        "The species T. rex is the type.",
    );
    assert.equal(getFirstSentence("Only one sentence"), "Only one sentence");
});
