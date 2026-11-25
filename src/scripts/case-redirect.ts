// On the 404 page: page addresses are all lowercase, and GitHub Pages matches letter case, so
// "/genus/Aardonyx/" lands here. If the address in lowercase is a page, go there instead.

import { findLowercasePath } from "../data/urls.ts";

// How long to wait for the lowercase page before showing "Page not found" anyway.
const checkTimeout = 5000;

/**
 * Show the 404 page's text, which the inline script in 404.astro hides while the lowercase page
 * is looked for.
 */
function showNotFound(): void
{
    document.documentElement.classList.remove("is-finding-page");
}

/**
 * Go to the address in lowercase if it is a page, keeping its query and fragment; otherwise
 * show "Page not found".
 */
async function redirectToLowercase(): Promise<void>
{
    const baseUrl = document.documentElement.dataset.baseUrl ?? "/";
    const lowercasePath = findLowercasePath(window.location.pathname, baseUrl);

    if (lowercasePath === "")
    {
        showNotFound();

        return;
    }

    try
    {
        const response = await fetch(lowercasePath, { method: "HEAD", signal: AbortSignal.timeout(checkTimeout) });

        if (response.ok)
        {
            // The response's address, after any redirect, such as adding the final slash.
            const found = new URL(response.url);

            window.location.replace(found.pathname + window.location.search + window.location.hash);

            return;
        }
    }
    catch
    {
        // Offline, or too slow: say the page wasn't found.
    }

    showNotFound();
}

void redirectToLowercase();
