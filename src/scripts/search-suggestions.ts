// Name suggestions under the search fields (the header's and the home page's), as the reader
// types. Each field marked with data-suggestions becomes a combobox (the WAI-ARIA pattern): a
// list of the best-matching genera, species, clades and synonyms opens below it, the arrow keys
// move through it, Enter opens the highlighted name or, with none highlighted, searches as
// before, and Escape closes it. The names load the first time a field is used.

import type { SearchSuggestion } from "../data/search-suggestions.ts";
import type { PreparedSuggestion } from "../data/suggestion-matching.ts";
import { findSuggestions, prepareSuggestions } from "../data/suggestion-matching.ts";

/**
 * One search field with its suggestion list.
 */
type SuggestionField = {
    /**
     * The search field.
     */
    input: HTMLInputElement;

    /**
     * The list of suggestions under it.
     */
    list: HTMLUListElement;

    /**
     * Where the number of suggestions is announced to screen readers.
     */
    announcement: HTMLElement;

    /**
     * The options shown, each with the address it opens.
     */
    options: Array<HTMLLIElement>;

    /**
     * The highlighted option's index, or -1 for none.
     */
    activeIndex: number;
};

// How many names the list shows, before the "Search for" row.
const suggestionLimit = 8;

let preparedSuggestions: Array<PreparedSuggestion> | undefined;
let loadingSuggestions: Promise<Array<PreparedSuggestion>> | undefined;

/**
 * Load the names, once for the page.
 *
 * @param baseUrl - The site's base path.
 * @returns The names, prepared for matching.
 */
async function loadSuggestions(baseUrl: string): Promise<Array<PreparedSuggestion>>
{
    if (preparedSuggestions)
    {
        return preparedSuggestions;
    }

    loadingSuggestions ??= fetch(baseUrl + "search/suggestions.json")
        .then((response) => response.json() as Promise<Array<SearchSuggestion>>)
        .then((suggestions) => prepareSuggestions(suggestions));
    preparedSuggestions = await loadingSuggestions;

    return preparedSuggestions;
}

/**
 * Report whether a suggestion's name is set in italic: genus and species names and their
 * synonyms are; clade names are not.
 *
 * @param suggestion - The suggestion.
 * @returns True for an italic name.
 */
function isItalicName(suggestion: SearchSuggestion): boolean
{
    return !suggestion.kind.startsWith("clade");
}

/**
 * Describe what a suggestion names, for the note beside it.
 *
 * @param suggestion - The suggestion.
 * @returns The note's text before any related name: "Genus (Osborn, 1905)", "Synonym of ".
 */
function describeKind(suggestion: SearchSuggestion): string
{
    if (suggestion.synonymOf !== "")
    {
        return "Synonym of ";
    }
    else if (suggestion.kind === "genus")
    {
        return suggestion.authority === "" ? "Genus" : "Genus (" + suggestion.authority + ")";
    }

    return suggestion.kind === "species" ? "Species" : "Clade";
}

/**
 * Create one option of the list: the name, and a note of what it names.
 *
 * @param field - The field.
 * @param index - The option's position.
 * @param href - The address it opens.
 * @returns The option.
 */
function createOption(field: SuggestionField, index: number, href: string): HTMLLIElement
{
    const option = document.createElement("li");

    option.id = field.list.id + "-" + index;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.dataset.href = href;

    return option;
}

/**
 * Create the option for one suggested name.
 *
 * @param field - The field.
 * @param index - The option's position.
 * @param suggestion - The suggestion.
 * @param baseUrl - The site's base path.
 * @returns The option.
 */
function createSuggestionOption(field: SuggestionField, index: number, suggestion: SearchSuggestion, baseUrl: string): HTMLLIElement
{
    const option = createOption(field, index, baseUrl + suggestion.path);
    const name = document.createElement(isItalicName(suggestion) ? "i" : "span");
    const note = document.createElement("span");

    name.className = "suggestion-name";
    name.textContent = suggestion.name;
    note.className = "suggestion-note";
    note.append(describeKind(suggestion));

    if (suggestion.synonymOf !== "")
    {
        const related = document.createElement(suggestion.kind === "clade-synonym" ? "span" : "i");

        related.textContent = suggestion.synonymOf;
        note.append(related);
    }

    option.append(name, note);

    return option;
}

/**
 * Highlight one option, or none.
 *
 * @param field - The field.
 * @param index - The option's index, or -1 for none.
 */
function highlightOption(field: SuggestionField, index: number): void
{
    field.activeIndex = index;

    for (let position = 0; position < field.options.length; position++)
    {
        field.options[position].setAttribute("aria-selected", String(position === index));
    }

    if (index === -1)
    {
        field.input.removeAttribute("aria-activedescendant");
    }
    else
    {
        field.input.setAttribute("aria-activedescendant", field.options[index].id);
        field.options[index].scrollIntoView({ block: "nearest" });
    }
}

/**
 * Close the list.
 *
 * @param field - The field.
 */
function closeList(field: SuggestionField): void
{
    field.list.hidden = true;
    field.input.setAttribute("aria-expanded", "false");
    highlightOption(field, -1);
}

/**
 * Show the suggestions for what is in the field.
 *
 * @param field - The field.
 * @param baseUrl - The site's base path.
 */
async function showSuggestions(field: SuggestionField, baseUrl: string): Promise<void>
{
    const query = field.input.value.trim();
    const suggestions = findSuggestions(query, await loadSuggestions(baseUrl), suggestionLimit);

    if (query.length < 2 || field.input.value.trim() !== query)
    {
        closeList(field);

        return;
    }

    field.options = [];

    for (let index = 0; index < suggestions.length; index++)
    {
        field.options.push(createSuggestionOption(field, index, suggestions[index], baseUrl));
    }

    const searchOption = createOption(field, suggestions.length, baseUrl + "search/?q=" + encodeURIComponent(query));

    searchOption.classList.add("suggestion-search");
    searchOption.textContent = "Search for “" + query + "”";
    field.options.push(searchOption);
    field.list.replaceChildren(...field.options);
    field.list.hidden = false;
    field.input.setAttribute("aria-expanded", "true");
    field.announcement.textContent = suggestions.length === 1 ? "1 name matches." : suggestions.length + " names match.";
    highlightOption(field, -1);
}

/**
 * Open the address an option leads to.
 *
 * @param option - The option.
 */
function openOption(option: HTMLLIElement): void
{
    window.location.assign(option.dataset.href ?? "");
}

/**
 * Handle the keys that move through the list and choose from it.
 *
 * @param field - The field.
 * @param event - The key press.
 */
function handleKey(field: SuggestionField, event: KeyboardEvent): void
{
    const isOpen = !field.list.hidden && field.options.length > 0;

    if (event.key === "ArrowDown" && isOpen)
    {
        event.preventDefault();
        highlightOption(field, (field.activeIndex + 1) % field.options.length);
    }
    else if (event.key === "ArrowUp" && isOpen)
    {
        event.preventDefault();
        highlightOption(field, field.activeIndex <= 0 ? field.options.length - 1 : field.activeIndex - 1);
    }
    else if (event.key === "Enter" && isOpen && field.activeIndex !== -1)
    {
        event.preventDefault();
        openOption(field.options[field.activeIndex]);
    }
    else if (event.key === "Escape" && isOpen)
    {
        event.preventDefault();
        closeList(field);
    }
}

/**
 * Turn one search field into a combobox with a suggestion list.
 *
 * @param input - The field.
 * @param baseUrl - The site's base path.
 */
function connectField(input: HTMLInputElement, baseUrl: string): void
{
    const list = document.createElement("ul");
    const announcement = document.createElement("p");
    const field: SuggestionField = { input, list, announcement, options: [], activeIndex: -1 };

    list.id = input.id + "-suggestions";
    list.className = "search-suggestions";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Suggested names");
    list.hidden = true;
    announcement.className = "visually-hidden";
    announcement.setAttribute("role", "status");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("aria-expanded", "false");
    input.after(list, announcement);

    input.addEventListener("focus", () => void loadSuggestions(baseUrl));
    input.addEventListener("input", () => void showSuggestions(field, baseUrl));
    input.addEventListener("keydown", (event) => handleKey(field, event));
    input.addEventListener("blur", () => closeList(field));

    // Pressing an option must not take the focus from the field, or the list would close before
    // the click lands.
    list.addEventListener("mousedown", (event) => event.preventDefault());
    list.addEventListener("click", (event) =>
    {
        const option = (event.target as Element).closest("li");

        if (option)
        {
            openOption(option as HTMLLIElement);
        }
    });
}

/**
 * Connect every search field that asks for suggestions.
 */
function initializeSearchSuggestions(): void
{
    const baseUrl = document.documentElement.dataset.baseUrl ?? "/";

    for (const input of document.querySelectorAll<HTMLInputElement>("input[data-suggestions]"))
    {
        connectField(input, baseUrl);
    }
}

initializeSearchSuggestions();
