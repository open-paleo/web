// Search results for the search page, from the Pagefind index the build writes to
// dist/pagefind/. The header's search field drives it: the page reads the query from the
// address, runs it, and runs it again as the field changes.

/**
 * The parts of Pagefind's browser module this script uses.
 */
type PagefindModule = {
    /**
     * Set options before the first search.
     */
    options(options: PagefindOptions): Promise<void>;

    /**
     * Load the index metadata ahead of the first search.
     */
    init(): Promise<void>;

    /**
     * Load the filter index. Searches return filter counts only after this has run.
     */
    filters(): Promise<Record<string, Record<string, number>>>;

    /**
     * Search the index. Resolves to null when a newer search has superseded this one.
     */
    debouncedSearch(term: string, options: PagefindSearchOptions, delay: number): Promise<PagefindResponse | null>;
};

/**
 * Pagefind options this script sets.
 */
type PagefindOptions = {
    /**
     * Base path of the site, so result URLs carry it.
     */
    baseUrl: string;

    /**
     * Length of each result's excerpt, in words.
     */
    excerptLength: number;

    /**
     * How results are ranked.
     */
    ranking: PagefindRanking;
};

/**
 * Pagefind's ranking settings this script changes from the defaults.
 */
type PagefindRanking = {
    /**
     * How much longer pages are ranked down, 0 to 1. The default (0.75) buries long record
     * pages, such as Tyrannosaurus, under short reference pages that mention them.
     */
    pageLength: number;

    /**
     * How much a word's frequency on a page counts, 0 to 1. At 0, where the word appears (the
     * page heading, a specimen's name) decides the ranking instead of how often it is repeated.
     */
    termFrequency: number;
};

/**
 * Options for one search.
 */
type PagefindSearchOptions = {
    /**
     * Filter values the results must have, by filter name.
     */
    filters: Record<string, string>;
};

/**
 * The result of one search.
 */
type PagefindResponse = {
    /**
     * Matching pages, best first. Their data loads on request.
     */
    results: Array<PagefindResult>;

    /**
     * Result counts per filter value, ignoring the active filters.
     */
    totalFilters: Record<string, Record<string, number>>;
};

/**
 * One matching page, whose data loads on request.
 */
type PagefindResult = {
    /**
     * Load the page's URL, title and excerpt.
     */
    data(): Promise<PagefindResultData>;
};

/**
 * A matching page's details.
 */
type PagefindResultData = {
    /**
     * The page's URL, including the site's base path.
     */
    url: string;

    /**
     * The passage that matched, as HTML whose only elements are <mark> around matched words.
     */
    excerpt: string;

    /**
     * The page's metadata; "title" is its first heading.
     */
    meta: Record<string, string>;

    /**
     * The page's filter values; "kind" is Genus, Clade or Reference.
     */
    filters: Record<string, Array<string>>;
};

/**
 * One choice in the kind filter: its value in the index and the word for it.
 */
type KindChoice = {
    /**
     * Value of the kind filter, or an empty string for all kinds.
     */
    value: string;

    /**
     * Button text, before the count: "Genera".
     */
    label: string;
};

/**
 * The page elements the script fills in.
 */
type SearchElements = {
    /**
     * The header's search field.
     */
    field: HTMLInputElement;

    /**
     * The live region announcing how many results there are.
     */
    status: HTMLElement;

    /**
     * The container for the kind filter buttons.
     */
    kinds: HTMLElement;

    /**
     * The results list.
     */
    list: HTMLOListElement;

    /**
     * The button that shows the next page of results.
     */
    more: HTMLButtonElement;
};

const resultsPerPage = 20;
const searchDelayMilliseconds = 150;
const kindChoices: Array<KindChoice> = [
    { value: "", label: "All" },
    { value: "Genus", label: "Genera" },
    { value: "Clade", label: "Clades" },
    { value: "Reference", label: "References" },
];

let pagefind: PagefindModule | undefined;
let activeKind = "";
let currentResults = new Array<PagefindResult>();
let shownCount = 0;

/**
 * Find the elements the script fills in.
 *
 * @returns The elements, or undefined when the page lacks any of them.
 */
function findSearchElements(): SearchElements | undefined
{
    const field = document.querySelector<HTMLInputElement>("#site-search-field");
    const status = document.querySelector<HTMLElement>("#search-status");
    const kinds = document.querySelector<HTMLElement>("#search-kinds");
    const list = document.querySelector<HTMLOListElement>("#search-results");
    const more = document.querySelector<HTMLButtonElement>("#search-more");

    if (!field || !status || !kinds || !list || !more)
    {
        return undefined;
    }

    return { field, status, kinds, list, more };
}

/**
 * Load Pagefind's browser module from the built site.
 *
 * @returns The module, or undefined when the index is missing (as under `astro dev`).
 */
async function loadPagefind(): Promise<PagefindModule | undefined>
{
    const baseUrl = import.meta.env.BASE_URL;

    try
    {
        const module = await import(/* @vite-ignore */ baseUrl + "pagefind/pagefind.js") as PagefindModule;

        // Tuned against queries with a known best page (a genus, clade or specimen name):
        // these settings rank it first for 7 of 12 and in the top three for the rest, where
        // Pagefind's defaults ranked none of them first.
        await module.options({ baseUrl, excerptLength: 24, ranking: { pageLength: 0.1, termFrequency: 0 } });
        await module.init();
        await module.filters();

        return module;
    }
    catch
    {
        return undefined;
    }
}

/**
 * Turn a Pagefind excerpt into text nodes and <mark> elements. The excerpt is HTML, but the
 * only elements kept are the marks around matched words; everything else becomes plain text.
 *
 * @param excerpt - The excerpt HTML.
 * @param target - The element to fill.
 */
function appendExcerpt(excerpt: string, target: HTMLElement): void
{
    const parsed = new DOMParser().parseFromString(excerpt, "text/html");

    for (const node of parsed.body.childNodes)
    {
        if (node.nodeName === "MARK")
        {
            const mark = document.createElement("mark");

            mark.textContent = node.textContent;
            target.append(mark);
        }
        else
        {
            target.append(document.createTextNode(node.textContent ?? ""));
        }
    }
}

/**
 * Build the list item for one result.
 *
 * @param data - The result's details.
 * @returns The list item.
 */
function createResultItem(data: PagefindResultData): HTMLLIElement
{
    const item = document.createElement("li");
    const heading = document.createElement("p");
    const link = document.createElement("a");
    const kind = data.filters.kind?.[0] ?? "";
    const kindLabel = document.createElement("span");
    const excerpt = document.createElement("p");

    link.href = data.url;
    link.textContent = data.meta.title ?? data.url;

    if (kind === "Genus")
    {
        link.className = "taxon";
    }

    kindLabel.className = "result-kind";
    kindLabel.textContent = kind;
    heading.className = "result-heading";
    heading.append(link, kindLabel);
    excerpt.className = "result-excerpt";
    appendExcerpt(data.excerpt, excerpt);
    item.append(heading, excerpt);

    return item;
}

/**
 * Show the next page of results under the ones already shown.
 *
 * @param elements - The page elements.
 */
async function showMoreResults(elements: SearchElements): Promise<void>
{
    const page = currentResults.slice(shownCount, shownCount + resultsPerPage);
    const loads = new Array<Promise<PagefindResultData>>();

    for (const result of page)
    {
        loads.push(result.data());
    }

    for (const data of await Promise.all(loads))
    {
        elements.list.append(createResultItem(data));
    }

    shownCount += page.length;
    elements.more.hidden = shownCount >= currentResults.length;
}

/**
 * Draw the kind filter buttons with their counts for the current query.
 *
 * @param elements - The page elements.
 * @param counts - Result counts per kind, ignoring the active filter.
 * @param total - Result count across all kinds.
 */
function renderKindChoices(elements: SearchElements, counts: Record<string, number>, total: number): void
{
    elements.kinds.replaceChildren();

    for (const choice of kindChoices)
    {
        const button = document.createElement("button");
        const count = choice.value === "" ? total : counts[choice.value] ?? 0;

        button.type = "button";
        button.textContent = choice.label + " (" + count + ")";
        button.setAttribute("aria-pressed", String(choice.value === activeKind));
        button.addEventListener("click", () =>
        {
            activeKind = choice.value;
            runSearch(elements);
        });
        elements.kinds.append(button);
    }

    elements.kinds.hidden = total === 0;
}

/**
 * Add up the counts of a filter's values.
 *
 * @param counts - Count per value.
 * @returns The sum.
 */
function sumCounts(counts: Record<string, number>): number
{
    let total = 0;

    for (const value of Object.keys(counts))
    {
        total += counts[value];
    }

    return total;
}

/**
 * Run the query in the search field and show its results, replacing any shown before.
 *
 * @param elements - The page elements.
 */
async function runSearch(elements: SearchElements): Promise<void>
{
    const term = elements.field.value.trim();
    const address = new URL(window.location.href);

    address.searchParams.set("q", term);
    window.history.replaceState(null, "", address);

    if (!pagefind)
    {
        return;
    }
    else if (term === "")
    {
        elements.status.textContent = "Type a genus, species, clade, author or word to search the dataset.";
        elements.list.replaceChildren();
        elements.kinds.hidden = true;
        elements.more.hidden = true;

        return;
    }

    const filters: Record<string, string> = activeKind === "" ? {} : { kind: activeKind };
    const response = await pagefind.debouncedSearch(term, { filters }, searchDelayMilliseconds);

    if (!response)
    {
        return;
    }

    const kindCounts = response.totalFilters.kind ?? {};
    const total = sumCounts(kindCounts);

    currentResults = response.results;
    shownCount = 0;
    elements.list.replaceChildren();
    renderKindChoices(elements, kindCounts, total);
    elements.status.textContent = currentResults.length === 0
        ? "No results for “" + term + "”."
        : currentResults.length + (currentResults.length === 1 ? " result" : " results") + " for “" + term + "”.";
    await showMoreResults(elements);
}

/**
 * Start the search page: load the index, run the query from the address, and search again as
 * the header's field changes.
 */
async function startSearchPage(): Promise<void>
{
    const elements = findSearchElements();

    if (!elements)
    {
        return;
    }

    elements.field.value = new URLSearchParams(window.location.search).get("q") ?? "";
    pagefind = await loadPagefind();

    if (!pagefind)
    {
        elements.status.textContent = "The search index is missing. It is built by npm run build; try npm run preview.";

        return;
    }

    elements.field.addEventListener("input", () => runSearch(elements));
    elements.field.form?.addEventListener("submit", (event) =>
    {
        event.preventDefault();
        runSearch(elements);
    });
    elements.more.addEventListener("click", () => showMoreResults(elements));
    elements.field.focus();
    await runSearch(elements);
}

startSearchPage();
