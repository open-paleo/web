import type { Location, Period, Reference, SizeRange } from "./dataset.ts";

/**
 * A reference broken into the parts a citation displays, each already formatted.
 */
export type CitationParts = {
    /**
     * Authors as the reference store gives them: "Osborn, H. F." or several joined by "; ".
     */
    authors: string;

    /**
     * Year of publication, or "n.d." when the store has none.
     */
    year: string;

    /**
     * Title of the work, ending without a period.
     */
    title: string;

    /**
     * Journal, book or series the work appeared in; displayed in italics. Empty when there is
     * none.
     */
    container: string;

    /**
     * Volume, issue and pages or article number: "21(14): 259-265". Empty when there are
     * none.
     */
    location: string;

    /**
     * Publisher, or the degree and school of a thesis. Empty when there is none.
     */
    publisher: string;

    /**
     * Digital object identifier, without a resolver prefix. Empty when there is none.
     */
    doi: string;

    /**
     * Web address of the work when it has no DOI. Empty when there is none.
     */
    url: string;
};

/**
 * Formats integers with thousands separators: 9500 becomes "9,500".
 */
const integerFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * Formats decimals with up to two places, dropping trailing zeros: 3.750 becomes "3.75".
 */
const decimalFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/**
 * Country names for ISO 3166-1 codes, from the runtime's locale data.
 */
const countryNames = new Intl.DisplayNames("en", { type: "region" });

/**
 * Get the surnames from an author list in the reference store's format.
 *
 * Each author is "Surname, Initials", separated by "; ". An author without a comma (a
 * mononym such as Qinggele, or a body such as the International Commission on Zoological
 * Nomenclature) is kept whole.
 *
 * @param authors - The author list.
 * @returns The surnames, in order.
 */
export function getSurnames(authors: string): Array<string>
{
    const surnames = new Array<string>();

    for (const author of authors.split(";"))
    {
        const trimmed = author.trim();

        if (trimmed !== "")
        {
            const commaIndex = trimmed.indexOf(",");

            surnames.push(commaIndex === -1 ? trimmed : trimmed.slice(0, commaIndex));
        }
    }

    return surnames;
}

/**
 * Format an author list as zoological nomenclature cites it: one surname, two joined with
 * "&", or the first followed by "et al." for three or more.
 *
 * @param authors - The author list in the reference store's format.
 * @returns The short form, such as "Fiorillo & Tykoski".
 */
export function formatAuthorNames(authors: string): string
{
    const surnames = getSurnames(authors);

    if (surnames.length >= 3)
    {
        return surnames[0] + " et al.";
    }
    else if (surnames.length === 2)
    {
        return surnames[0] + " & " + surnames[1];
    }

    return surnames[0] ?? "";
}

/**
 * Format the authority of a name: "Osborn, 1905", or "(Maleev, 1955)" when the species was
 * first named in another genus.
 *
 * @param authors - The author list in the reference store's format.
 * @param year - Year the name was published.
 * @param inParentheses - True when the species was named in another genus.
 * @returns The authority, or an empty string when the authors are unknown.
 */
export function formatAuthority(authors: string | undefined, year: number | undefined, inParentheses: boolean): string
{
    if (!authors)
    {
        return "";
    }

    const authority = year === undefined ? formatAuthorNames(authors) : formatAuthorNames(authors) + ", " + year;

    return inParentheses ? "(" + authority + ")" : authority;
}

/**
 * Format a short in-text citation: "Brochu (2003)".
 *
 * @param reference - The reference.
 * @returns The citation.
 */
export function formatShortCitation(reference: Reference): string
{
    const names = formatAuthorNames(reference.authors ?? reference.id);

    return reference.year === undefined ? names : names + " (" + reference.year + ")";
}

/**
 * Format a decimal for display: up to two decimal places, trailing zeros dropped, thousands
 * separated.
 *
 * @param value - The number.
 * @returns The formatted number.
 */
export function formatDecimal(value: number): string
{
    return decimalFormat.format(value);
}

/**
 * Format a size range with its unit: "11.9–13 m", or "3.75 m" when both ends are equal.
 *
 * @param range - The minimum and maximum.
 * @param unit - The unit symbol, such as "m" or "kg".
 * @returns The formatted range.
 */
export function formatSizeRange(range: SizeRange, unit: string): string
{
    const minimum = unit === "kg" ? integerFormat.format(range.min) : formatDecimal(range.min);
    const maximum = unit === "kg" ? integerFormat.format(range.max) : formatDecimal(range.max);

    return range.min === range.max ? minimum + " " + unit : minimum + "–" + maximum + " " + unit;
}

/**
 * Format an age range in millions of years, to one decimal place: "72.2–66.0 million years
 * ago".
 *
 * @param fromMa - Older bound, in millions of years ago.
 * @param toMa - Younger bound, in millions of years ago.
 * @returns The formatted range.
 */
export function formatAgeRange(fromMa: number, toMa: number): string
{
    if (fromMa === toMa)
    {
        return fromMa.toFixed(1) + " million years ago";
    }

    return fromMa.toFixed(1) + "–" + toMa.toFixed(1) + " million years ago";
}

/**
 * Get the English name of a country from its ISO 3166-1 alpha-2 code.
 *
 * @param code - The country code, such as "US".
 * @returns The name, such as "United States", or the code itself if it is not known.
 */
export function formatCountry(code: string): string
{
    return countryNames.of(code) ?? code;
}

/**
 * Format the lithostratigraphic units of a location from finest to broadest: "Valle de la Luna
 * Member, Ischigualasto Formation". An informal division is placed before the unit it
 * qualifies: "upper Hell Creek Formation".
 *
 * @param location - The location.
 * @returns The units, or an empty string when none are recorded.
 */
export function formatStratigraphicUnits(location: Location): string
{
    const units = new Array<string>();
    const ranks: Array<"bed" | "member" | "formation" | "group"> = ["bed", "member", "formation", "group"];
    const rankNames = ["Bed", "Member", "Formation", "Group"];

    for (let index = 0; index < ranks.length; index++)
    {
        const name = location[ranks[index]];

        if (name)
        {
            const unit = name + " " + rankNames[index];

            units.push(location.part && location.part_of === ranks[index] ? location.part + " " + unit : unit);
        }
    }

    return units.join(", ");
}

/**
 * Format where a type specimen was found, from the broadest place to the country: "Montana,
 * United States".
 *
 * @param location - The location.
 * @returns The region and country.
 */
export function formatPlace(location: Location): string
{
    const parts = new Array<string>();

    if (location.region)
    {
        parts.push(location.region);
    }

    if (location.country)
    {
        parts.push(formatCountry(location.country));
    }

    return parts.join(", ");
}

/**
 * Turn a controlled-vocabulary value into words: "most-complete" becomes "most complete".
 *
 * @param value - The vocabulary value.
 * @returns The value with hyphens replaced by spaces.
 */
export function formatVocabularyValue(value: string): string
{
    return value.replace(/-/g, " ");
}

/**
 * Capitalize the first letter of a phrase: "nomen dubium" becomes "Nomen dubium".
 *
 * @param text - The phrase.
 * @returns The phrase with its first letter in uppercase.
 */
export function capitalizeFirstLetter(text: string): string
{
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Remove a trailing period from a title so the citation can supply its own.
 *
 * @param title - The title.
 * @returns The title without a final period.
 */
function trimFinalPeriod(title: string): string
{
    return title.endsWith(".") ? title.slice(0, -1) : title;
}

/**
 * Break a reference into the parts a full citation displays.
 *
 * @param reference - The reference.
 * @returns The formatted parts.
 */
export function createCitationParts(reference: Reference): CitationParts
{
    // Where the work appeared: a journal, or a chapter's book, or a book's series.
    const container = reference.journal ?? reference.book ?? reference.series ?? "";

    // Volume, issue and pages: "21(14): 259-265", "7: 1-138", "e7288".
    let location = reference.volume ?? "";

    if (reference.issue)
    {
        location += "(" + reference.issue + ")";
    }

    const pages = reference.pages ?? reference.article_number;

    if (pages)
    {
        location = location === "" ? pages : location + ": " + pages;
    }

    // A thesis names its degree and school in place of a publisher.
    let publisher = reference.publisher ?? "";

    if (reference.thesis)
    {
        const degree = reference.thesis === "dissertation-abstract"
            ? "Dissertation abstract"
            : capitalizeFirstLetter(reference.thesis) + " thesis";

        publisher = reference.school ? degree + ", " + reference.school : degree;
    }

    return {
        authors: reference.authors ?? "",
        year: reference.year === undefined ? "n.d." : String(reference.year),
        title: trimFinalPeriod(reference.title ?? ""),
        container,
        location,
        publisher,
        doi: reference.doi ?? "",
        url: reference.doi ? "" : reference.url ?? "",
    };
}

/**
 * Get the web address of a record in an outside database.
 *
 * @param source - The database, as the dataset names it.
 * @param id - The record's identifier there.
 * @returns The address, or undefined for an unknown source.
 */
export function getIdentifierUrl(source: string, id: string): string | undefined
{
    if (source === "pbdb")
    {
        return "https://paleobiodb.org/classic/checkTaxonInfo?taxon_no=" + encodeURIComponent(id);
    }
    else if (source === "wikidata")
    {
        return "https://www.wikidata.org/wiki/" + encodeURIComponent(id);
    }
    else if (source === "gbif")
    {
        return "https://www.gbif.org/species/" + encodeURIComponent(id);
    }
    else if (source === "eol")
    {
        return "https://eol.org/pages/" + encodeURIComponent(id);
    }
    else if (source === "zoobank")
    {
        return "https://zoobank.org/NomenclaturalActs/" + encodeURIComponent(id);
    }

    return undefined;
}

/**
 * Get the display name of an outside database.
 *
 * @param source - The database, as the dataset names it.
 * @returns Its usual name, such as "PBDB" or "ZooBank".
 */
export function getIdentifierSourceName(source: string): string
{
    if (source === "pbdb")
    {
        return "PBDB";
    }
    else if (source === "wikidata")
    {
        return "Wikidata";
    }
    else if (source === "gbif")
    {
        return "GBIF";
    }
    else if (source === "eol")
    {
        return "EOL";
    }
    else if (source === "zoobank")
    {
        return "ZooBank";
    }

    return source;
}

/**
 * Join a list of time units as a span: ["Campanian", "Maastrichtian"] becomes
 * "Campanian–Maastrichtian".
 *
 * @param names - Stage or period names, oldest first.
 * @returns The span.
 */
function joinTimeUnits(names: Array<string>): string
{
    if (names.length <= 1)
    {
        return names[0] ?? "";
    }

    return names[0] + "–" + names[names.length - 1];
}

/**
 * Format a species' geologic age in words: "Maastrichtian, Late Cretaceous".
 *
 * @param period - The species' period block.
 * @returns The stages and periods, or an empty string when neither is recorded.
 */
export function formatGeologicAge(period: Period): string
{
    const stages = joinTimeUnits(period.stage ?? []);
    const periods = joinTimeUnits(period.name ?? []);

    if (stages && periods)
    {
        return stages + ", " + periods;
    }

    return stages !== "" ? stages : periods;
}

/**
 * Explain how a species' stage relates to the rock unit it was found in, when that needs
 * saying.
 *
 * @param resolution - The period block's resolution value.
 * @returns A short note, or an empty string when the age needs no qualification.
 */
export function describeAgeResolution(resolution: string | undefined): string
{
    if (resolution === "unit")
    {
        return "The age of the containing rock unit; no finer age has been published.";
    }
    else if (resolution === "reworked")
    {
        return "The age of the older beds the specimen was reworked from.";
    }
    else if (resolution === "horizon")
    {
        return "Covers every bed that may have yielded the type specimen.";
    }

    return "";
}

/**
 * Name the kind of type specimen: "Holotype", or "Syntypes" for a series.
 *
 * @param specimenType - The specimen type, if recorded.
 * @param specimenCount - How many catalog numbers the type has.
 * @returns The label.
 */
export function formatSpecimenType(specimenType: string | undefined, specimenCount: number): string
{
    if (!specimenType || specimenType === "unknown")
    {
        return "Type specimen";
    }

    const label = capitalizeFirstLetter(specimenType);

    return specimenType === "syntype" && specimenCount > 1 ? label + "s" : label;
}

/**
 * Join the non-empty parts of a phrase with commas: ["", "Montana", "United States"] becomes
 * "Montana, United States".
 *
 * @param parts - The parts, some possibly empty.
 * @returns The joined phrase.
 */
export function joinNonEmpty(parts: Array<string>): string
{
    let joined = "";

    for (const part of parts)
    {
        if (part !== "")
        {
            joined = joined === "" ? part : joined + ", " + part;
        }
    }

    return joined;
}

/**
 * Get the first sentence of a passage, for a page's search-engine description.
 *
 * A sentence ends at a period, question mark or exclamation mark, optionally followed by a
 * closing quotation mark or parenthesis, then a space and a capital letter. A period after a single capital letter is taken as an initial or an
 * abbreviated genus ("T. rex"), not the end of a sentence.
 *
 * @param text - The passage.
 * @returns Its first sentence, or the whole passage if it is one sentence.
 */
export function getFirstSentence(text: string): string
{
    const sentenceEnd = /(?<!(?:^|\s)\p{Lu})[.?!]["'\u201d\u2019)]?(?=\s+\p{Lu})/u.exec(text);

    return sentenceEnd ? text.slice(0, sentenceEnd.index + sentenceEnd[0].length).trim() : text.trim();
}

/**
 * Format a species' age briefly for a table: the stages, or the periods when no stage is
 * recorded. "Campanian–Maastrichtian", "Late Jurassic".
 *
 * @param period - The species' period block.
 * @returns The span, or an empty string when neither is recorded.
 */
export function formatShortAge(period: Period): string
{
    const stages = joinTimeUnits(period.stage ?? []);

    return stages !== "" ? stages : joinTimeUnits(period.name ?? []);
}

/**
 * Format an age range as bare numbers for a table column: "72.2–66.0".
 *
 * @param fromMa - Older bound, in millions of years ago.
 * @param toMa - Younger bound, in millions of years ago.
 * @returns The range to one decimal place.
 */
export function formatAgeNumbers(fromMa: number, toMa: number): string
{
    return fromMa === toMa ? fromMa.toFixed(1) : fromMa.toFixed(1) + "–" + toMa.toFixed(1);
}

/**
 * Count genera in words: "1 genus", "1,428 genera".
 *
 * @param count - How many genera.
 * @returns The count with the right noun.
 */
export function formatGenusCount(count: number): string
{
    return integerFormat.format(count) + (count === 1 ? " genus" : " genera");
}

/**
 * Name the kind of a published work from the fields its reference has.
 *
 * @param reference - The reference.
 * @returns "Journal article", "Book chapter", "Book", "Doctoral thesis" and so on, or an empty
 * string when the fields don't identify it.
 */
export function describeWorkKind(reference: Reference): string
{
    if (reference.thesis === "dissertation-abstract")
    {
        return "Dissertation abstract";
    }
    else if (reference.thesis)
    {
        return capitalizeFirstLetter(reference.thesis) + " thesis";
    }
    else if (reference.journal)
    {
        return "Journal article";
    }
    else if (reference.book)
    {
        return "Book chapter";
    }
    else if (reference.publisher)
    {
        return "Book";
    }

    return "";
}

/**
 * Generic words that make a specimen name a description ("Berlin specimen", "Felch Quarry
 * skull", "AMNH mummy") rather than a nickname ("Sue", "Big Al"). The dataset stores both kinds
 * in the same field, so the site tells them apart by these words.
 */
const descriptiveSpecimenWordPattern = /\b(specimen|skull|skeleton|mummy|hatchling|exemplar|dinosaur)\b/i;

/**
 * Report whether a notable specimen's name is a description built on a generic word, as
 * opposed to a nickname.
 *
 * @param name - The specimen's name from the dataset.
 * @returns True for names like "Thermopolis specimen"; false for nicknames like "Sue".
 */
export function isDescriptiveSpecimenName(name: string): boolean
{
    return descriptiveSpecimenWordPattern.test(name);
}

/**
 * Format a notable specimen's name for display: a nickname in quotation marks ("Sue",
 * "Fighting Dinosaurs"), a descriptive name as it is ("Berlin specimen").
 *
 * @param name - The specimen's name from the dataset.
 * @returns The name to display.
 */
export function formatSpecimenName(name: string): string
{
    return isDescriptiveSpecimenName(name) ? name : "“" + name + "”";
}

/**
 * Format the short citations for a record's references, so that no two read the same. Two works
 * that would both read "O'Connor et al. (2025)" get the letter from their reference key, as in
 * "O'Connor et al. (2025a)" and "O'Connor et al. (2025b)".
 *
 * @param references - The record's references.
 * @returns The short citation for each reference key.
 */
export function formatDistinctShortCitations(references: Array<Reference>): Map<string, string>
{
    const countByLabel = new Map<string, number>();

    for (const reference of references)
    {
        const label = formatShortCitation(reference);

        countByLabel.set(label, (countByLabel.get(label) ?? 0) + 1);
    }

    const labels = new Map<string, string>();

    for (const reference of references)
    {
        const label = formatShortCitation(reference);
        const keySuffix = /(\d{4})([a-z])$/.exec(reference.id);

        if ((countByLabel.get(label) ?? 0) > 1 && keySuffix && reference.year !== undefined)
        {
            labels.set(reference.id, formatAuthorNames(reference.authors ?? reference.id) + " (" + reference.year + keySuffix[2] + ")");
        }
        else
        {
            labels.set(reference.id, label);
        }
    }

    return labels;
}

/**
 * A non-breaking space, built from its code so the source shows what it is.
 */
const nonBreakingSpace = String.fromCharCode(160);

/**
 * Keep an abbreviated genus on the same line as its epithet: "P. sibiricus" never breaks after
 * "P.". Other names are returned unchanged.
 *
 * @param name - A genus or species name as it appears in prose.
 * @returns The name, with a non-breaking space after a genus initial.
 */
export function bindAbbreviatedGenus(name: string): string
{
    return /^\p{Lu}\. /u.test(name) ? name.replace(" ", nonBreakingSpace) : name;
}
