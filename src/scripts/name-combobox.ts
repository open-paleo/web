// A text field that lists matching names as the reader types: the WAI-ARIA combobox pattern. A
// list of the best matches opens below the field, the arrow keys move through it, Enter chooses
// the highlighted row (with none highlighted, the field's form submits as usual), and Escape
// closes it. Used by the header and home page search fields (search-suggestions.ts) and the Tree
// page's find field; each supplies its names, the note beside each name, and what choosing one
// does.

import type { SearchSuggestion, SuggestionKind } from "../data/search-suggestions.ts";
import type { PreparedSuggestion } from "../data/suggestion-matching.ts";
import { findSuggestions } from "../data/suggestion-matching.ts";

/**
 * A last row after the names that acts on the query itself, such as "Search for “veloci”".
 */
export type NameComboboxQueryRow = {
    /**
     * The row's text for a query.
     */
    describe: (query: string) => string;

    /**
     * What choosing the row does.
     */
    choose: (query: string) => void;
};

/**
 * What a combobox lists and what choosing from it does.
 */
export type NameComboboxSettings = {
    /**
     * The list's accessible name: "Suggested names".
     */
    listLabel: string;

    /**
     * How many names the list shows, before any query row.
     */
    limit: number;

    /**
     * Load the names, prepared for matching; called on focus and on each change, so it should
     * load once and keep the result.
     */
    loadNames: () => Promise<Array<PreparedSuggestion>>;

    /**
     * Build the note shown beside a name: "Genus (Osborn, 1905)".
     */
    createNote: (suggestion: SearchSuggestion) => HTMLElement;

    /**
     * What choosing a name does.
     */
    chooseName: (suggestion: SearchSuggestion) => void;

    /**
     * A last row for the query itself, or undefined for none.
     */
    queryRow: NameComboboxQueryRow | undefined;

    /**
     * Where each note goes: "beside" the name, right-aligned, for short notes ("Genus (Osborn,
     * 1905)"), or "below" it, for long ones such as a reference's title.
     */
    notePlacement: "beside" | "below";
};

/**
 * One field with its list.
 */
type NameCombobox = {
    /**
     * The text field.
     */
    input: HTMLInputElement;

    /**
     * The list under it.
     */
    list: HTMLUListElement;

    /**
     * Where the number of matches is announced to screen readers.
     */
    announcement: HTMLElement;

    /**
     * The rows shown: the names, then any query row.
     */
    options: Array<HTMLLIElement>;

    /**
     * The names shown, in the order of their rows.
     */
    suggestions: Array<SearchSuggestion>;

    /**
     * The highlighted row's index, or -1 for none.
     */
    activeIndex: number;

    /**
     * What the field lists and what choosing does.
     */
    settings: NameComboboxSettings;
};

// The kinds of name set in italic: genera and species, and their synonyms.
const italicKinds: Array<SuggestionKind> = ["genus", "species", "genus-synonym", "species-synonym"];

/**
 * Report whether a suggestion's name is set in italic: genus and species names and their
 * synonyms are; clade names and references are not.
 *
 * @param suggestion - The suggestion.
 * @returns True for an italic name.
 */
function isItalicName(suggestion: SearchSuggestion): boolean
{
    return italicKinds.includes(suggestion.kind);
}

/**
 * Create one row of the list.
 *
 * @param combobox - The combobox.
 * @param index - The row's position.
 * @returns The row.
 */
function createOption(combobox: NameCombobox, index: number): HTMLLIElement
{
    const option = document.createElement("li");

    option.id = combobox.list.id + "-" + index;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.dataset.index = String(index);

    return option;
}

/**
 * Create the row for one name: the name, and the note beside it.
 *
 * @param combobox - The combobox.
 * @param index - The row's position.
 * @param suggestion - The name.
 * @returns The row.
 */
function createNameOption(combobox: NameCombobox, index: number, suggestion: SearchSuggestion): HTMLLIElement
{
    const option = createOption(combobox, index);
    const name = document.createElement(isItalicName(suggestion) ? "i" : "span");
    const note = combobox.settings.createNote(suggestion);

    name.className = "suggestion-name";
    name.textContent = suggestion.name;
    note.classList.add("suggestion-note");
    option.append(name, note);

    return option;
}

/**
 * Highlight one row, or none.
 *
 * @param combobox - The combobox.
 * @param index - The row's index, or -1 for none.
 */
function highlightOption(combobox: NameCombobox, index: number): void
{
    combobox.activeIndex = index;

    for (let position = 0; position < combobox.options.length; position++)
    {
        combobox.options[position].setAttribute("aria-selected", String(position === index));
    }

    if (index === -1)
    {
        combobox.input.removeAttribute("aria-activedescendant");
    }
    else
    {
        combobox.input.setAttribute("aria-activedescendant", combobox.options[index].id);
        combobox.options[index].scrollIntoView({ block: "nearest" });
    }
}

/**
 * Close the list.
 *
 * @param combobox - The combobox.
 */
function closeList(combobox: NameCombobox): void
{
    combobox.list.hidden = true;
    combobox.input.setAttribute("aria-expanded", "false");
    highlightOption(combobox, -1);
}

/**
 * Show the matches for what is in the field.
 *
 * @param combobox - The combobox.
 */
async function showMatches(combobox: NameCombobox): Promise<void>
{
    const query = combobox.input.value.trim();
    const suggestions = findSuggestions(query, await combobox.settings.loadNames(), combobox.settings.limit);
    const queryRow = combobox.settings.queryRow;

    // A slower load can finish after the reader has typed on; only the latest text counts, and
    // the call for it updates the list.
    if (combobox.input.value.trim() !== query)
    {
        return;
    }

    if (query.length < 2 || (suggestions.length === 0 && !queryRow))
    {
        closeList(combobox);

        return;
    }

    combobox.options = [];
    combobox.suggestions = suggestions;

    for (let index = 0; index < suggestions.length; index++)
    {
        combobox.options.push(createNameOption(combobox, index, suggestions[index]));
    }

    if (queryRow)
    {
        const queryOption = createOption(combobox, suggestions.length);

        queryOption.classList.add("suggestion-query");
        queryOption.textContent = queryRow.describe(query);
        combobox.options.push(queryOption);
    }

    combobox.list.replaceChildren(...combobox.options);
    combobox.list.hidden = false;
    combobox.input.setAttribute("aria-expanded", "true");
    combobox.announcement.textContent = suggestions.length === 1 ? "1 name matches." : suggestions.length + " names match.";
    highlightOption(combobox, -1);
}

/**
 * Act on one row: choose its name, or the query row's action.
 *
 * @param combobox - The combobox.
 * @param index - The row's index.
 */
function chooseOption(combobox: NameCombobox, index: number): void
{
    const query = combobox.input.value.trim();

    if (index < combobox.suggestions.length)
    {
        const suggestion = combobox.suggestions[index];

        closeList(combobox);
        combobox.settings.chooseName(suggestion);
    }
    else if (combobox.settings.queryRow)
    {
        closeList(combobox);
        combobox.settings.queryRow.choose(query);
    }
}

/**
 * Handle the keys that move through the list and choose from it.
 *
 * @param combobox - The combobox.
 * @param event - The key press.
 */
function handleKey(combobox: NameCombobox, event: KeyboardEvent): void
{
    const isOpen = !combobox.list.hidden && combobox.options.length > 0;

    if (event.key === "ArrowDown" && isOpen)
    {
        event.preventDefault();
        highlightOption(combobox, (combobox.activeIndex + 1) % combobox.options.length);
    }
    else if (event.key === "ArrowUp" && isOpen)
    {
        event.preventDefault();
        highlightOption(combobox, combobox.activeIndex <= 0 ? combobox.options.length - 1 : combobox.activeIndex - 1);
    }
    else if (event.key === "Enter" && isOpen && combobox.activeIndex !== -1)
    {
        event.preventDefault();
        chooseOption(combobox, combobox.activeIndex);
    }
    else if (event.key === "Escape" && isOpen)
    {
        event.preventDefault();
        closeList(combobox);
    }
}

/**
 * Choose the row that was clicked.
 *
 * @param combobox - The combobox.
 * @param event - The click.
 */
function handleListClick(combobox: NameCombobox, event: MouseEvent): void
{
    const option = (event.target as Element).closest("li");

    if (option)
    {
        chooseOption(combobox, Number(option.dataset.index));
    }
}

/**
 * Turn a text field into a combobox with a list of matching names.
 *
 * @param input - The field.
 * @param settings - What it lists and what choosing does.
 */
export function connectNameCombobox(input: HTMLInputElement, settings: NameComboboxSettings): void
{
    const list = document.createElement("ul");
    const announcement = document.createElement("p");
    const combobox: NameCombobox = { input, list, announcement, options: [], suggestions: [], activeIndex: -1, settings };

    list.id = input.id + "-suggestions";
    list.className = settings.notePlacement === "below" ? "search-suggestions has-notes-below" : "search-suggestions";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", settings.listLabel);
    list.hidden = true;
    announcement.className = "visually-hidden";
    announcement.setAttribute("role", "status");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("aria-expanded", "false");
    input.after(list, announcement);

    input.addEventListener("focus", () => void settings.loadNames());
    input.addEventListener("input", () => void showMatches(combobox));
    input.addEventListener("keydown", (event) => handleKey(combobox, event));
    input.addEventListener("blur", () => closeList(combobox));

    // Pressing a row must not take the focus from the field, or the list would close before the
    // click lands.
    list.addEventListener("mousedown", (event) => event.preventDefault());
    list.addEventListener("click", (event) => handleListClick(combobox, event));
}
