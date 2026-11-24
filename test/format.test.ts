import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
    bindAbbreviatedGenus,
    createCitationParts,
    describeAgeResolution,
    describeWorkKind,
    formatAgeRange,
    formatAuthority,
    formatAuthorNames,
    formatCountry,
    formatDistinctShortCitations,
    formatGenusCount,
    formatGeologicAge,
    formatIntegumentEvidence,
    formatLocomotion,
    formatPlace,
    formatQuotes,
    formatShortCitation,
    formatSizeRange,
    formatSpecimenName,
    formatSpecimenType,
    formatStratigraphicUnits,
    formatThesisKind,
    getFirstSentence,
    getIdentifierUrl,
    getSurnames,
    joinNonEmpty,
    joinWithAnd,
    splitParagraphs,
    splitPronunciationReadings,
} from "../src/data/format.ts";
import { readFixture } from "./fixture.ts";

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
    assert.match(describeAgeResolution("unit"), /rock unit as a whole/);
    assert.match(describeAgeResolution("horizon"), /isn’t known which bed/);
    assert.equal(describeAgeResolution(undefined), "");
});

test("joinNonEmpty skips empty parts", () =>
{
    assert.equal(joinNonEmpty(["", "Montana", "United States"]), "Montana, United States");
    assert.equal(joinNonEmpty(["", ""]), "");
});

test("splitParagraphs splits a description at blank lines and drops empty paragraphs", () =>
{
    const dataset = readFixture();
    const summary = dataset.genera.Tyrannosaurus.description;

    assert.deepEqual(splitParagraphs(summary), [summary.trim()]);
    assert.deepEqual(splitParagraphs(summary + "\n\n" + summary + "\n \n\n"), [summary.trim(), summary.trim()]);
    assert.deepEqual(splitParagraphs(" \n\n "), []);
});

test("getFirstSentence stops at the first sentence end, not at an abbreviation", () =>
{
    assert.equal(getFirstSentence("Tyrannosaurus is a genus. It lived in Laramidia."), "Tyrannosaurus is a genus.");
    assert.equal(
        getFirstSentence("The species T. rex is the type. Others are doubtful."),
        "The species T. rex is the type.",
    );
    assert.equal(getFirstSentence("Only one sentence"), "Only one sentence");
    assert.equal(
        getFirstSentence('Its basal forms were traditionally grouped as "prosauropods." The clade first appeared later.'),
        'Its basal forms were traditionally grouped as "prosauropods."',
    );
});

test("formatGenusCount uses the singular for one", () =>
{
    assert.equal(formatGenusCount(1), "1 genus");
    assert.equal(formatGenusCount(1428), "1,428 genera");
    assert.equal(formatGenusCount(0), "0 genera");
});

test("describeWorkKind names the kind of work from its fields", () =>
{
    assert.equal(describeWorkKind({ id: "a", journal: "Science" }), "Journal article");
    assert.equal(describeWorkKind({ id: "b", book: "Mesozoic Vertebrate Life", publisher: "Indiana University Press" }), "Book chapter");
    assert.equal(describeWorkKind({ id: "c", publisher: "Princeton University Press" }), "Book");
    assert.equal(describeWorkKind({ id: "d", thesis: "doctoral", school: "University of Kansas" }), "Doctoral thesis");
    assert.equal(describeWorkKind({ id: "e", thesis: "dissertation-abstract" }), "Dissertation abstract");
    assert.equal(describeWorkKind({ id: "f", title: "Sinopsis" }), "");
});

test("formatThesisKind names a thesis by its degree, with the apostrophe in Master’s", () =>
{
    assert.equal(formatThesisKind("doctoral"), "Doctoral thesis");
    assert.equal(formatThesisKind("masters"), "Master’s thesis");
    assert.equal(formatThesisKind("habilitation"), "Habilitation thesis");
    assert.equal(formatThesisKind("dissertation-abstract"), "Dissertation abstract");
    assert.equal(createCitationParts({ id: "g", thesis: "masters", school: "University of Alberta" }).publisher, "Master’s thesis, University of Alberta");
});

test("joinWithAnd joins a list as a sentence does", () =>
{
    assert.equal(joinWithAnd([]), "");
    assert.equal(joinWithAnd(["Jurassic"]), "Jurassic");
    assert.equal(joinWithAnd(["Jurassic", "Cretaceous"]), "Jurassic and Cretaceous");
    assert.equal(joinWithAnd(["Triassic", "Jurassic", "Cretaceous"]), "Triassic, Jurassic and Cretaceous");
});

test("formatLocomotion says what facultative locomotion is", () =>
{
    assert.equal(formatLocomotion("bipedal"), "bipedal");
    assert.equal(formatLocomotion("quadrupedal"), "quadrupedal");
    assert.equal(formatLocomotion("facultative"), "facultatively bipedal");
});

test("formatIntegumentEvidence says how the integument is known", () =>
{
    assert.equal(formatIntegumentEvidence("direct"), "direct evidence");
    assert.equal(formatIntegumentEvidence("inferred"), "inferred");
});

test("formatSpecimenName quotes nicknames and leaves descriptive names alone", () =>
{
    assert.equal(formatSpecimenName("Sue"), "“Sue”");
    assert.equal(formatSpecimenName("Fighting Dinosaurs"), "“Fighting Dinosaurs”");
    assert.equal(formatSpecimenName("Big Al II"), "“Big Al II”");
    assert.equal(formatSpecimenName("E.T."), "“E.T.”");
    assert.equal(formatSpecimenName("Berlin specimen"), "Berlin specimen");
    assert.equal(formatSpecimenName("Felch Quarry skull"), "Felch Quarry skull");
    assert.equal(formatSpecimenName("Dunluce Skull"), "Dunluce Skull");
    assert.equal(formatSpecimenName("AMNH mummy"), "AMNH mummy");
    assert.equal(formatSpecimenName("Mafeteng hatchling"), "Mafeteng hatchling");
    assert.equal(formatSpecimenName("Exemplar b"), "Exemplar b");
    assert.equal(formatSpecimenName("Rutland Dinosaur"), "Rutland Dinosaur");
});

test("formatDistinctShortCitations adds the key's letter only where two citations would match", () =>
{
    const labels = formatDistinctShortCitations([
        { id: "oconnor2025a", authors: "O'Connor, J.; Clark, A.; Kuo, P.-C.", year: 2025 },
        { id: "oconnor2025b", authors: "O'Connor, J.; Kuo, P.-C.; Clark, A.", year: 2025 },
        { id: "mayr2005a", authors: "Mayr, G.; Pohl, B.; Peters, D. S.", year: 2005 },
    ]);

    assert.equal(labels.get("oconnor2025a"), "O’Connor et al. (2025a)");
    assert.equal(labels.get("oconnor2025b"), "O’Connor et al. (2025b)");
    assert.equal(labels.get("mayr2005a"), "Mayr et al. (2005)");
});

test("bindAbbreviatedGenus keeps an initial with its epithet", () =>
{
    assert.equal(bindAbbreviatedGenus("P. sibiricus"), "P." + String.fromCharCode(160) + "sibiricus");
    assert.equal(bindAbbreviatedGenus("Psittacosaurus sibiricus"), "Psittacosaurus sibiricus");
    assert.equal(bindAbbreviatedGenus("Tyrannosaurus"), "Tyrannosaurus");
});

test("formatQuotes makes quotation marks and apostrophes typographic, and minute marks primes", () =>
{
    assert.equal(formatQuotes("From Afrikaans 'aard' meaning 'earth'"), "From Afrikaans ‘aard’ meaning ‘earth’");
    assert.equal(formatQuotes("Marc's Quarry, dell'Argentina, the dinosaurs' teeth"), "Marc’s Quarry, dell’Argentina, the dinosaurs’ teeth");
    assert.equal(formatQuotes("cautioning that \"no witnesses are alive\" (\"quoted\")"), "cautioning that “no witnesses are alive” (“quoted”)");
    assert.equal(formatQuotes("'coyote,' and a 'lizard.'\" Then"), "‘coyote,’ and a ‘lizard.’” Then");
    assert.equal(formatQuotes("as \"S30°03', E28°32'\" at 30° 03'S"), "as “S30°03′, E28°32′” at 30° 03′S");
    assert.equal(formatQuotes("Museo ‘Carmen Funes’"), "Museo ‘Carmen Funes’");
});

test("a pronunciation splits into its readings", () =>
{
    const dataset = readFixture();
    const agilisaurus = dataset.genera["Agilisaurus"];
    const apatodon = dataset.genera["Apatodon"];

    assert.deepEqual(splitPronunciationReadings(agilisaurus.species[0].pronunciation?.phonetic ?? ""), ["LOU-dur-BACK-eye", "LAW-dur-BACK-eye"]);
    assert.deepEqual(splitPronunciationReadings(apatodon.species[0].pronunciation?.phonetic ?? ""), ["MYE-rus"], "shown though the genus has none");
    assert.deepEqual(splitPronunciationReadings(""), []);
});
