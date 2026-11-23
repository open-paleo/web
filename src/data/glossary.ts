import * as fs from "node:fs";
import * as path from "node:path";

import type { OpenPaleoGlossary, Term } from "./bindings/glossary";
import { glossarySchemaVersion } from "./bindings/schema-version.ts";
import { compareSchemaVersions } from "./load-dataset.ts";
import { findGlossaryDirectory, glossaryFileName } from "./locate-dataset.ts";

// Reads open-paleo/glossary's output and finds its terms in the dataset's text.

/**
 * A glossary term, ready for pages.
 */
export type GlossaryEntry = {
    /**
     * The term's id, which is also its anchor on the Glossary page.
     */
    id: string;

    /**
     * The term as the glossary gives it.
     */
    record: Term;

    /**
     * The name of the term's category.
     */
    categoryName: string;
};

/**
 * The glossary, arranged for pages.
 */
export type GlossaryIndex = {
    /**
     * Every term, in alphabetical order.
     */
    entries: Array<GlossaryEntry>;

    /**
     * Each term, by id.
     */
    entryById: Map<string, GlossaryEntry>;

    /**
     * Each term, by each of its forms in lowercase.
     */
    entryByForm: Map<string, GlossaryEntry>;

    /**
     * Matches any form, or any exception, as a whole word, longest first; undefined when the
     * glossary is empty. An exception, such as "derived from", matches but finds no term, so it
     * stays plain.
     */
    formPattern: RegExp | undefined;
};

/**
 * A run of text that is either plain or a glossary term.
 */
export type TermSegment = {
    /**
     * The text of the run, as written.
     */
    text: string;

    /**
     * The term the run links to; undefined for plain text.
     */
    entry: GlossaryEntry | undefined;
};

let cachedGlossary: GlossaryIndex | undefined;

/**
 * Read the glossary, refusing one whose major schema version differs from the bindings'.
 *
 * @param glossaryDirectory - The directory holding glossary.json.
 * @param supportedVersion - The schema version the bindings describe.
 * @returns The glossary.
 */
export function readGlossary(glossaryDirectory: string, supportedVersion: string): OpenPaleoGlossary
{
    const filePath = path.join(glossaryDirectory, glossaryFileName);
    const glossary = JSON.parse(fs.readFileSync(filePath, "utf8")) as OpenPaleoGlossary;
    const version = glossary._metadata.schema_version;
    const compatibility = compareSchemaVersions(version, supportedVersion);

    if (compatibility === "incompatible")
    {
        throw new Error(
            filePath + " uses glossary schema " + version + ", but the site supports " + supportedVersion +
            ". A breaking change (a different major version, or before 1.0.0 a different minor version): update " +
            "the site for the new schema, then run npm run update-bindings.",
        );
    }
    else if (compatibility !== "same")
    {
        console.warn("The glossary uses schema " + version + "; the bindings describe " + supportedVersion + ". Run npm run update-bindings.");
    }

    return glossary;
}

/**
 * Escape a form for use in a regular expression, letting any run of spaces in it match any run
 * of white space in text.
 *
 * @param form - The form.
 * @returns The pattern source.
 */
function escapeForm(form: string): string
{
    return form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

/**
 * Arrange the glossary for pages.
 *
 * @param glossary - The glossary.
 * @returns The terms in order, the look-ups, and the pattern that finds them in text.
 */
export function createGlossaryIndex(glossary: OpenPaleoGlossary): GlossaryIndex
{
    const categoryNameById = new Map<string, string>();
    const entries = new Array<GlossaryEntry>();
    const entryById = new Map<string, GlossaryEntry>();
    const entryByForm = new Map<string, GlossaryEntry>();

    for (const category of glossary.categories)
    {
        categoryNameById.set(category.id, category.name);
    }

    for (const [id, record] of Object.entries(glossary.terms))
    {
        const entry: GlossaryEntry = { id, record, categoryName: categoryNameById.get(record.category) ?? record.category };

        entries.push(entry);
        entryById.set(id, entry);

        for (const form of record.forms)
        {
            entryByForm.set(form.toLowerCase(), entry);
        }
    }

    entries.sort((first, second) => first.record.term.localeCompare(second.record.term, "en"));

    const phrases = [...entryByForm.keys()];

    for (const entry of entries)
    {
        for (const exception of entry.record.exceptions ?? [])
        {
            phrases.push(exception.toLowerCase());
        }
    }

    phrases.sort((first, second) => second.length - first.length);
    const alternatives = new Array<string>();

    for (const phrase of phrases)
    {
        alternatives.push(escapeForm(phrase));
    }

    // Letters, digits and hyphens on either side mean the form is part of a longer word.
    const formPattern = alternatives.length > 0 ? new RegExp("(?<![\\p{L}\\p{N}-])(?:" + alternatives.join("|") + ")(?![\\p{L}\\p{N}-])", "giu") : undefined;

    return { entries, entryById, entryByForm, formPattern };
}

/**
 * Find the term a whole piece of text names, such as a status or a specimen type.
 *
 * @param glossary - The glossary.
 * @param text - The text.
 * @returns The term, or undefined if the text is not one of its forms.
 */
export function findGlossaryEntry(glossary: GlossaryIndex, text: string): GlossaryEntry | undefined
{
    return glossary.entryByForm.get(text.trim().replace(/\s+/g, " ").toLowerCase());
}

/**
 * Split text into plain runs and glossary terms. A term already in linkedIds stays plain, so a
 * block of text links each term once; terms linked here are added to it.
 *
 * @param glossary - The glossary.
 * @param text - The text.
 * @param linkedIds - The ids of the terms already linked in this block.
 * @returns The runs, in order.
 */
export function splitGlossaryTerms(glossary: GlossaryIndex, text: string, linkedIds: Set<string>): Array<TermSegment>
{
    const segments = new Array<TermSegment>();
    const pattern = glossary.formPattern;

    if (!pattern)
    {
        segments.push({ text, entry: undefined });

        return segments;
    }

    let plainStart = 0;

    pattern.lastIndex = 0;

    for (let match = pattern.exec(text); match; match = pattern.exec(text))
    {
        const entry = findGlossaryEntry(glossary, match[0]);

        if (!entry || linkedIds.has(entry.id))
        {
            continue;
        }

        if (match.index > plainStart)
        {
            segments.push({ text: text.slice(plainStart, match.index), entry: undefined });
        }

        segments.push({ text: match[0], entry });
        linkedIds.add(entry.id);
        plainStart = match.index + match[0].length;
    }

    if (plainStart < text.length)
    {
        segments.push({ text: text.slice(plainStart), entry: undefined });
    }

    return segments;
}

/**
 * Get the name a term is listed under on the Glossary page.
 *
 * @param entry - The term.
 * @returns The term itself.
 */
export function getGlossaryIndexName(entry: GlossaryEntry): string
{
    return entry.record.term;
}

/**
 * Load the glossary and arrange it for pages, once per build.
 *
 * @returns The glossary.
 */
export function getGlossary(): GlossaryIndex
{
    if (!cachedGlossary)
    {
        const glossaryDirectory = findGlossaryDirectory(process.cwd(), process.env.OPEN_PALEO_GLOSSARY);

        cachedGlossary = createGlossaryIndex(readGlossary(glossaryDirectory, glossarySchemaVersion));
    }

    return cachedGlossary;
}
