import type { SearchSuggestion, SuggestionKind } from "./search-suggestions.ts";

// Matching names as the reader types, shared by the build and the browser script, so it imports
// nothing that needs Node.

/**
 * A suggestion with its name prepared for matching.
 */
export type PreparedSuggestion = {
    /**
     * The suggestion.
     */
    suggestion: SearchSuggestion;

    /**
     * Its name folded for matching: lowercase, without accents.
     */
    foldedName: string;
};

/**
 * A suggestion that matches, with how well.
 */
type ScoredSuggestion = {
    /**
     * The suggestion.
     */
    suggestion: SearchSuggestion;

    /**
     * How well it matches: higher is better.
     */
    score: number;
};

// How well a name matches: the whole name, the start of the name, the start of a later word
// (the epithet of a species), or anywhere in it.
const exactScore = 4;
const startScore = 3;
const wordStartScore = 2;
const containsScore = 1;

// At equal scores, records come before synonyms, and genera first.
const kindOrder: Array<SuggestionKind> = ["genus", "clade", "species", "genus-synonym", "species-synonym", "clade-synonym"];

/**
 * Fold text for matching: lowercase and without accents, so "pérez" matches "Perez".
 *
 * @param text - The text.
 * @returns The folded text.
 */
export function foldText(text: string): string
{
    return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/**
 * Prepare suggestions for matching, folding each name once.
 *
 * @param suggestions - The suggestions.
 * @returns The prepared suggestions, in the same order.
 */
export function prepareSuggestions(suggestions: Array<SearchSuggestion>): Array<PreparedSuggestion>
{
    const prepared = new Array<PreparedSuggestion>();

    for (const suggestion of suggestions)
    {
        prepared.push({ suggestion, foldedName: foldText(suggestion.name) });
    }

    return prepared;
}

/**
 * Score how well a folded name matches a folded query.
 *
 * @param foldedName - The name, folded.
 * @param foldedQuery - The query, folded.
 * @returns The score, or 0 for no match.
 */
export function scoreName(foldedName: string, foldedQuery: string): number
{
    if (foldedName === foldedQuery)
    {
        return exactScore;
    }
    else if (foldedName.startsWith(foldedQuery))
    {
        return startScore;
    }
    else if (foldedName.includes(" " + foldedQuery))
    {
        return wordStartScore;
    }
    else if (foldedName.includes(foldedQuery))
    {
        return containsScore;
    }

    return 0;
}

/**
 * Order two matches: by score, then by kind (records before synonyms, genera first), then
 * shorter names first, then alphabetically.
 *
 * @param first - One match.
 * @param second - The other.
 * @returns A negative number when the first comes first.
 */
function compareMatches(first: ScoredSuggestion, second: ScoredSuggestion): number
{
    return second.score - first.score
        || kindOrder.indexOf(first.suggestion.kind) - kindOrder.indexOf(second.suggestion.kind)
        || first.suggestion.name.length - second.suggestion.name.length
        || first.suggestion.name.localeCompare(second.suggestion.name, "en");
}

/**
 * Find the best suggestions for what the reader has typed.
 *
 * @param query - What the reader typed.
 * @param suggestions - Every suggestion, prepared.
 * @param limit - How many to return.
 * @returns The best matches, best first; none for a query shorter than two characters.
 */
export function findSuggestions(query: string, suggestions: Array<PreparedSuggestion>, limit: number): Array<SearchSuggestion>
{
    const foldedQuery = foldText(query);

    if (foldedQuery.length < 2)
    {
        return [];
    }

    const matches = new Array<ScoredSuggestion>();

    for (const prepared of suggestions)
    {
        const score = scoreName(prepared.foldedName, foldedQuery);

        if (score > 0)
        {
            matches.push({ suggestion: prepared.suggestion, score });
        }
    }

    matches.sort(compareMatches);

    const best = new Array<SearchSuggestion>();

    for (const match of matches.slice(0, limit))
    {
        best.push(match.suggestion);
    }

    return best;
}
