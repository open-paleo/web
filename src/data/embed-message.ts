// The message an embedded infobox sends the page it is shown on, with its height, so a script
// there can fit the frame to it. Shared by the infobox's script (src/scripts/embed-height.ts) and
// the script the Developers page offers for listening to it (src/data/embed.ts).

/**
 * The value of the message's `type` field, which tells it apart from other messages a page
 * receives.
 */
export const embedHeightMessageType = "open-paleo-embed-height";

/**
 * The message an infobox sends to the page it is embedded in.
 */
export type EmbedHeightMessage = {
    /**
     * Always `embedHeightMessageType`.
     */
    type: string;

    /**
     * The infobox's height in CSS pixels, rounded up.
     */
    height: number;
};
