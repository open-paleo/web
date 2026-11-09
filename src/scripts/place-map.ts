// Shows the maps on a page. The map library is large, so this script only waits until a map is
// near the viewport and then loads place-map-renderer.ts, which brings in MapLibre and draws
// it. Pages without a map never load MapLibre.

/**
 * Draw a map once it is near the viewport, loading the renderer the first time.
 *
 * @param entries - The maps whose visibility changed.
 * @param observer - The observer watching them.
 */
async function drawVisibleMaps(entries: Array<IntersectionObserverEntry>, observer: IntersectionObserver): Promise<void>
{
    for (const entry of entries)
    {
        if (!entry.isIntersecting)
        {
            continue;
        }

        observer.unobserve(entry.target);
        const renderer = await import("./place-map-renderer.ts");

        renderer.renderPlaceMap(entry.target as HTMLElement);
    }
}

/**
 * Reveal each map container and draw it when it comes near the viewport.
 */
function initializePlaceMaps(): void
{
    const containers = document.querySelectorAll<HTMLElement>(".place-map[data-features]");

    if (containers.length === 0)
    {
        return;
    }

    const observer = new IntersectionObserver((entries) => void drawVisibleMaps(entries, observer), { rootMargin: "300px" });

    for (const container of containers)
    {
        container.hidden = false;
        observer.observe(container);
    }
}

initializePlaceMaps();
