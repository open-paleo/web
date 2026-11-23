import type { Genus, Status } from "./dataset.ts";
import { embedHeightMessageType } from "./embed-message.ts";
import {
    capitalizeFirstLetter,
    formatAgeNumbers,
    formatAuthority,
    formatGeologicAge,
    formatPlace,
    formatSizeRange,
    formatStratigraphicUnits,
    getFirstSentence,
    joinNonEmpty,
} from "./format.ts";
import { getTypeSpecies } from "./records.ts";

/**
 * One labeled fact in a genus's infobox: "Diet", "Carnivore".
 */
export type EmbedFact = {
    /**
     * What the fact is: "Diet", "Length".
     */
    label: string;

    /**
     * Its value, ready to display.
     */
    value: string;
};

/**
 * What a genus's infobox shows, ready to display.
 */
export type GenusEmbed = {
    /**
     * The genus name.
     */
    name: string;

    /**
     * The clade the genus sits directly in.
     */
    parent: string;

    /**
     * Who named the genus and when: "Osborn, 1905". Empty when neither is recorded.
     */
    authority: string;

    /**
     * The type species' status, which the infobox shows as a badge unless it is "valid".
     */
    status: Status;

    /**
     * The type species' age in millions of years, short enough to share a line with the stage
     * names: "72.2–66.0 Ma". Empty when no numeric age is recorded.
     */
    ageRange: string;

    /**
     * The type species' stages and periods: "Maastrichtian, Late Cretaceous".
     */
    age: string;

    /**
     * The first sentence of the genus's description.
     */
    summary: string;

    /**
     * Diet, locomotion, length, mass and where the type species was found, in that order,
     * leaving out what isn't recorded. Hip height and skull length are left to the genus page.
     */
    facts: Array<EmbedFact>;

    /**
     * A note that the size and place are the type species', when the genus has other species.
     * Empty otherwise.
     */
    sizeNote: string;
};

/**
 * The width of the frame in the embed code, in CSS pixels. The infobox fits any width down to
 * 280 pixels, so sites may change it.
 */
export const embedFrameWidth = 400;

/**
 * The height of the frame in the embed code, in CSS pixels. At `embedFrameWidth`, nine in ten
 * infoboxes fit it (measured on 2026-11-23: from 380 to 696 pixels, half under 536). Longer ones
 * scroll inside the frame unless the page fits the frame to them with the code from
 * `createEmbedResizeCode`.
 */
export const embedFrameHeight = 570;

/**
 * Create what a genus's infobox shows.
 *
 * @param genus - The genus record.
 * @returns The infobox's contents.
 */
export function createGenusEmbed(genus: Genus): GenusEmbed
{
    const typeSpecies = getTypeSpecies(genus);
    const period = typeSpecies.period;
    const facts = new Array<EmbedFact>();

    if (genus.diet)
    {
        facts.push({ label: "Diet", value: capitalizeFirstLetter(genus.diet) });
    }

    if (genus.locomotion)
    {
        facts.push({ label: "Locomotion", value: capitalizeFirstLetter(genus.locomotion) });
    }

    if (typeSpecies.size?.length_m)
    {
        facts.push({ label: "Length", value: formatSizeRange(typeSpecies.size.length_m, "m") });
    }

    if (typeSpecies.size?.weight_kg)
    {
        facts.push({ label: "Mass", value: formatSizeRange(typeSpecies.size.weight_kg, "kg") });
    }

    const foundIn = typeSpecies.location
        ? joinNonEmpty([formatStratigraphicUnits(typeSpecies.location), formatPlace(typeSpecies.location)])
        : "";

    if (foundIn)
    {
        facts.push({ label: "Found in", value: foundIn });
    }

    return {
        name: genus.genus,
        parent: genus.parent,
        authority: formatAuthority(genus.authors, genus.described, false),
        status: typeSpecies.status,
        ageRange: period.from_ma !== undefined && period.to_ma !== undefined ? formatAgeNumbers(period.from_ma, period.to_ma) + " Ma" : "",
        age: formatGeologicAge(period),
        summary: getFirstSentence(genus.description),
        facts,
        sizeNote: genus.species.length > 1 ? "Size and place are those of the type species." : "",
    };
}

/**
 * Escape text for a double-quoted HTML attribute.
 *
 * @param text - The text.
 * @returns The text with `&`, `"`, `<` and `>` escaped.
 */
function escapeAttribute(text: string): string
{
    return text.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * Create the HTML another site adds to a page to show a genus's infobox.
 *
 * @param embedUrl - The infobox's absolute address.
 * @param genusName - The genus name, for the frame's title.
 * @returns One `iframe` element.
 */
export function createEmbedCode(embedUrl: string, genusName: string): string
{
    return "<iframe src=\"" + escapeAttribute(embedUrl) + "\""
        + " title=\"" + escapeAttribute(genusName + " on Open Paleo") + "\""
        + " width=\"" + embedFrameWidth + "\" height=\"" + embedFrameHeight + "\""
        + " style=\"border: 0; max-width: 100%;\" loading=\"lazy\"></iframe>";
}

/**
 * Create the script another site adds once to a page with infoboxes, which fits each infobox's
 * frame to its height. It accepts the height only from the given origin, and only for the frame
 * that sent it.
 *
 * @param siteOrigin - The origin the infoboxes are served from: "https://open-paleo.org".
 * @returns One `script` element.
 */
export function createEmbedResizeCode(siteOrigin: string): string
{
    return [
        "<script>",
        "    window.addEventListener(\"message\", function (event)",
        "    {",
        "        if (event.origin !== " + JSON.stringify(siteOrigin) + " || !event.data || event.data.type !== " + JSON.stringify(embedHeightMessageType) + " || typeof event.data.height !== \"number\")",
        "        {",
        "            return;",
        "        }",
        "",
        "        for (const frame of document.querySelectorAll(\"iframe\"))",
        "        {",
        "            if (frame.contentWindow === event.source)",
        "            {",
        "                frame.style.height = event.data.height + \"px\";",
        "            }",
        "        }",
        "    });",
        "</script>",
    ].join("\n");
}
