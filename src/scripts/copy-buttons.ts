// Shows the copy buttons beside citations (HowToCite.astro) and embed code (EmbedCode.astro), and
// copies a button's text when it is pressed. Each button names its confirmation in
// data-copied-message. The buttons stay hidden where the page cannot use the clipboard.

/**
 * Copy a button's text and confirm the copy beside the button.
 *
 * @param button - The button pressed.
 * @param status - Where the confirmation appears.
 */
async function copyButtonText(button: HTMLButtonElement, status: HTMLElement): Promise<void>
{
    try
    {
        await navigator.clipboard.writeText(button.dataset.copyText ?? "");
        status.textContent = button.dataset.copiedMessage ?? "Copied.";
    }
    catch
    {
        status.textContent = "Could not copy; select the text instead.";
    }
}

/**
 * Show the copy buttons and connect them.
 */
function initializeCopyButtons(): void
{
    if (!navigator.clipboard)
    {
        return;
    }

    for (const actions of document.querySelectorAll<HTMLElement>(".copy-actions"))
    {
        const status = actions.querySelector<HTMLElement>(".copy-status");

        if (!status)
        {
            continue;
        }

        for (const button of actions.querySelectorAll<HTMLButtonElement>("button[data-copy-text]"))
        {
            button.addEventListener("click", () => void copyButtonText(button, status));
        }

        actions.hidden = false;
    }
}

initializeCopyButtons();
