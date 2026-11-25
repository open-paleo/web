// The link icons beside headings (HeadingLink.astro) jump to their heading, as any link does; with
// JavaScript, following one also copies its address, to paste wherever the reader is sharing it.

// How long "Link copied." stays shown.
const statusDuration = 2500;

/**
 * Find the link's status, adding it the first time: a live region inside the link, so a screen
 * reader announces the copy and the message hangs from the icon.
 *
 * @param link - The heading's link.
 * @returns The status.
 */
function findStatus(link: HTMLAnchorElement): HTMLElement
{
    let status = link.querySelector<HTMLElement>(".heading-link-status");

    if (!status)
    {
        status = document.createElement("span");
        status.className = "heading-link-status";
        status.setAttribute("role", "status");
        link.append(status);
    }

    return status;
}

/**
 * Copy a heading link's address and say so beside it. The jump to the heading goes ahead as usual.
 *
 * @param link - The link followed.
 */
async function copyHeadingLink(link: HTMLAnchorElement): Promise<void>
{
    const status = findStatus(link);

    try
    {
        await navigator.clipboard.writeText(link.href);
        status.textContent = "Link copied.";
    }
    catch
    {
        // The address bar has the link too, so there's nothing more to say.
        status.textContent = "";

        return;
    }

    window.setTimeout(() =>
    {
        status.textContent = "";
    }, statusDuration);
}

/**
 * Connect every heading link on the page, where the page can use the clipboard.
 */
function initializeHeadingLinks(): void
{
    if (!navigator.clipboard)
    {
        return;
    }

    for (const link of document.querySelectorAll<HTMLAnchorElement>("a.heading-link"))
    {
        link.addEventListener("click", () => void copyHeadingLink(link));
    }
}

initializeHeadingLinks();
