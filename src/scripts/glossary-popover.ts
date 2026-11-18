// Shows a glossary term's definition in a popover beside it, instead of following its link to the
// Glossary page.

// The popover's distance from the term and from the window's edges, in pixels.
const gap = 6;
const edgeMargin = 16;

let popover: HTMLElement | undefined;
let termHeading: HTMLElement | undefined;
let definitionText: HTMLElement | undefined;
let entryLink: HTMLAnchorElement | undefined;
let currentTerm: HTMLAnchorElement | undefined;

// Pressing on the open term closes the popover before the click arrives; this keeps that click
// from opening it again.
let dismissingTerm: HTMLAnchorElement | undefined;

/**
 * Create the popover, once per page.
 *
 * @returns The popover.
 */
function createPopover(): HTMLElement
{
    const element = document.createElement("div");

    element.id = "glossary-popover";
    element.className = "glossary-popover";
    element.popover = "auto";
    element.tabIndex = -1;
    element.setAttribute("role", "dialog");
    element.setAttribute("aria-labelledby", "glossary-popover-term");

    termHeading = document.createElement("p");
    termHeading.id = "glossary-popover-term";
    termHeading.className = "glossary-popover-term";

    definitionText = document.createElement("p");

    entryLink = document.createElement("a");
    entryLink.textContent = "In the glossary";

    element.append(termHeading, definitionText, entryLink);
    element.addEventListener("toggle", handleToggle);
    document.body.append(element);

    return element;
}

/**
 * When the popover closes, mark its term closed and return focus to it if focus was inside.
 *
 * @param event - The toggle event.
 */
function handleToggle(event: Event): void
{
    const toggle = event as ToggleEvent;

    if (toggle.newState !== "closed" || !currentTerm)
    {
        return;
    }

    const term = currentTerm;

    term.setAttribute("aria-expanded", "false");
    currentTerm = undefined;

    if (popover?.contains(document.activeElement) || document.activeElement === document.body)
    {
        term.focus();
    }
}

/**
 * Place the popover below the term, or above it when there is no room below, kept inside the
 * window.
 *
 * @param element - The popover.
 * @param term - The term.
 */
function placePopover(element: HTMLElement, term: HTMLAnchorElement): void
{
    const termBox = term.getBoundingClientRect();
    const popoverBox = element.getBoundingClientRect();
    const maximumLeft = window.innerWidth - popoverBox.width - edgeMargin;
    const left = Math.max(edgeMargin, Math.min(termBox.left, maximumLeft));
    const fitsBelow = termBox.bottom + gap + popoverBox.height <= window.innerHeight - edgeMargin;
    const top = fitsBelow ? termBox.bottom + gap : Math.max(edgeMargin, termBox.top - gap - popoverBox.height);

    element.style.left = left + "px";
    element.style.top = top + "px";
}

/**
 * Note a press on the open popover's own term, which closes it.
 *
 * @param event - The press.
 */
function handlePointerDown(event: PointerEvent): void
{
    const term = (event.target as Element | null)?.closest<HTMLAnchorElement>("a.glossary-term");

    dismissingTerm = term && term === currentTerm ? term : undefined;
}

/**
 * Keep the open popover beside its term as the page scrolls or resizes.
 */
function handleViewportChange(): void
{
    if (popover && currentTerm)
    {
        placePopover(popover, currentTerm);
    }
}

/**
 * Show a term's definition, or hide it if it is already showing.
 *
 * @param event - The click on a term.
 */
function handleTermClick(event: MouseEvent): void
{
    const term = (event.target as Element | null)?.closest<HTMLAnchorElement>("a.glossary-term");

    // A modified click opens the Glossary page as usual, in a new tab or window.
    if (!term || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    {
        return;
    }

    event.preventDefault();
    popover ??= createPopover();

    if (dismissingTerm === term)
    {
        dismissingTerm = undefined;

        return;
    }

    if (currentTerm === term)
    {
        popover.hidePopover();

        return;
    }

    if (popover.matches(":popover-open"))
    {
        popover.hidePopover();
    }

    if (termHeading && definitionText && entryLink)
    {
        termHeading.textContent = term.dataset.term ?? term.textContent;
        definitionText.textContent = term.dataset.definition ?? "";
        entryLink.href = term.href;
    }

    currentTerm = term;
    term.setAttribute("aria-expanded", "true");
    term.setAttribute("aria-controls", popover.id);
    popover.showPopover();
    placePopover(popover, term);
    popover.focus();
}

/**
 * Connect the glossary terms on the page to the popover, once however many components ask.
 */
export function connectGlossaryPopover(): void
{
    if (document.documentElement.dataset.glossaryPopover || !("showPopover" in HTMLElement.prototype))
    {
        return;
    }

    document.documentElement.dataset.glossaryPopover = "connected";
    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    document.addEventListener("click", handleTermClick);
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange);

    for (const term of document.querySelectorAll<HTMLAnchorElement>("a.glossary-term"))
    {
        term.setAttribute("aria-expanded", "false");
    }
}
