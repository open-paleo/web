// Name suggestions for the header and home page search fields, with a last row that runs the
// full-text search.

import type { SearchSuggestion } from "../data/search-suggestions.ts";
import type { PreparedSuggestion } from "../data/suggestion-matching.ts";
import { prepareSuggestions } from "../data/suggestion-matching.ts";
import { connectNameCombobox } from "./name-combobox.ts";

// How many names the list shows, before the "Search for" row.
const suggestionLimit = 8;

const baseUrl = document.documentElement.dataset.baseUrl ?? "/";

let loadingSuggestions: Promise<Array<PreparedSuggestion>> | undefined;

/**
 * Load the names, once for the page.
 *
 * @returns The names, prepared for matching.
 */
async function loadSuggestions(): Promise<Array<PreparedSuggestion>>
{
    loadingSuggestions ??= fetch(baseUrl + "search/suggestions.json")
        .then((response) => response.json() as Promise<Array<SearchSuggestion>>)
        .then((suggestions) => prepareSuggestions(suggestions));

    return await loadingSuggestions;
}

/**
 * Build the note beside a suggested name: what it names ("Genus (Osborn, 1905)", "Species",
 * "Clade"), or for a synonym, the name it is a synonym of.
 *
 * @param suggestion - The suggestion.
 * @returns The note.
 */
function createNote(suggestion: SearchSuggestion): HTMLElement
{
    const note = document.createElement("span");

    if (suggestion.synonymOf !== "")
    {
        const related = document.createElement(suggestion.kind === "clade-synonym" ? "span" : "i");

        related.textContent = suggestion.synonymOf;
        note.append("Synonym of ", related);
    }
    else if (suggestion.kind === "genus")
    {
        note.textContent = suggestion.authority === "" ? "Genus" : "Genus (" + suggestion.authority + ")";
    }
    else
    {
        note.textContent = suggestion.kind === "species" ? "Species" : "Clade";
    }

    return note;
}

/**
 * Open a suggested name's page.
 *
 * @param suggestion - The chosen name.
 */
function openSuggestion(suggestion: SearchSuggestion): void
{
    window.location.assign(baseUrl + suggestion.path);
}

/**
 * Describe the last row, which searches the full text.
 *
 * @param query - What the reader typed.
 * @returns The row's text.
 */
function describeSearchRow(query: string): string
{
    return "Search for “" + query + "”";
}

/**
 * Open the search page for what the reader typed.
 *
 * @param query - What the reader typed.
 */
function openSearch(query: string): void
{
    window.location.assign(baseUrl + "search/?q=" + encodeURIComponent(query));
}

/**
 * Connect every search field that asks for suggestions.
 */
function initializeSearchSuggestions(): void
{
    for (const input of document.querySelectorAll<HTMLInputElement>("input[data-suggestions]"))
    {
        connectNameCombobox(input, {
            listLabel: "Suggested names",
            limit: suggestionLimit,
            loadNames: loadSuggestions,
            createNote,
            chooseName: openSuggestion,
            queryRow: { describe: describeSearchRow, choose: openSearch },
            notePlacement: "beside",
        });
    }
}

initializeSearchSuggestions();
