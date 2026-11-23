// Tells the page an infobox is embedded in how tall the infobox is, whenever that changes, so a
// script there can fit the frame to it (the script the Developers page offers).
// Without that script the frame keeps the height the embed code gives it, and the infobox
// scrolls inside it.

import type { EmbedHeightMessage } from "../data/embed-message.ts";
import { embedHeightMessageType } from "../data/embed-message.ts";

/**
 * Send the infobox's height to the page it is embedded in. The height is no secret, so any page
 * may receive it.
 */
function postInfoboxHeight(): void
{
    const message: EmbedHeightMessage = {
        type: embedHeightMessageType,
        height: Math.ceil(document.documentElement.getBoundingClientRect().height),
    };

    window.parent.postMessage(message, "*");
}

if (window.parent !== window)
{
    new ResizeObserver(() => postInfoboxHeight()).observe(document.documentElement);
}
