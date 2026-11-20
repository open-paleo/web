// Writes the open-paleo/media record for a traced outline, from the outline tracer's form.

/**
 * What the outline tracer's form gives for a record.
 */
export type OutlineRecordFields = {
    /**
     * The genus or clade the outline stands for: "Protoceratops".
     */
    taxon: string;

    /**
     * The taxon the figure shows, as its source names it: "Protoceratops andrewsi".
     */
    depicts: string;

    /**
     * The artist, as the source credits them.
     */
    creator: string;

    /**
     * The figure's page, such as its Wikimedia Commons file page.
     */
    source: string;

    /**
     * The license, as an SPDX id: "CC-BY-4.0".
     */
    license: string;

    /**
     * The address of the full-size image file.
     */
    image: string;

    /**
     * The image file's SHA-1, in hex.
     */
    sha1: string;

    /**
     * The trace's threshold.
     */
    threshold: number;

    /**
     * Points, in the figure's pixels, inside spaces the trace keeps open.
     */
    keepOpen: Array<[number, number]>;
};

// The threshold a record leaves out, because the trace uses it unless told otherwise.
export const defaultThreshold = 180;

// Values YAML reads as written: no leading indicator character, no ": " or " #", and no
// surrounding spaces. Anything else is written as a quoted string.
const plainValuePattern = /^[\p{L}\p{N}(][^\n]*$/u;

/**
 * Write a value as YAML, quoting it when YAML would read it as something else.
 *
 * @param value - The value.
 * @returns The value as YAML.
 */
export function formatYamlValue(value: string): string
{
    const isPlain = plainValuePattern.test(value) && value === value.trim() && !value.includes(": ") && !value.includes(" #") && !/^(true|false|null|yes|no|on|off|~|[-+]?[\d.]+)$/i.test(value);

    return isPlain ? value : JSON.stringify(value);
}

/**
 * Create the file name for a taxon's outline: lowercase words joined by hyphens, without
 * accents.
 *
 * @param taxon - The genus or clade.
 * @returns The file name without its extension, or an empty string for an empty taxon.
 */
export function createOutlineName(taxon: string): string
{
    return taxon.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Create the path a taxon's record is saved at: in the folder of its first letter.
 *
 * @param taxon - The genus or clade.
 * @returns The path, such as "outlines/p/protoceratops.yml"; empty for an empty taxon.
 */
export function createOutlineRecordPath(taxon: string): string
{
    const name = createOutlineName(taxon);

    return name ? "outlines/" + name.charAt(0) + "/" + name + ".yml" : "";
}

/**
 * Write the record: the outline's fields and its trace block.
 *
 * @param fields - The form's values.
 * @returns The record, as YAML.
 */
export function createOutlineRecord(fields: OutlineRecordFields): string
{
    const lines = [
        "taxon: " + formatYamlValue(fields.taxon),
        "title: " + formatYamlValue("Outline of " + fields.taxon),
        "depicts: " + formatYamlValue(fields.depicts),
        "creator: " + formatYamlValue(fields.creator),
        "source: " + formatYamlValue(fields.source),
        "license: " + formatYamlValue(fields.license),
        "trace:",
        "  image: " + formatYamlValue(fields.image),
        "  sha1: " + fields.sha1,
    ];

    if (fields.threshold !== defaultThreshold)
    {
        lines.push("  threshold: " + fields.threshold);
    }

    if (fields.keepOpen.length > 0)
    {
        lines.push("  keep_open:");

        for (const [x, y] of fields.keepOpen)
        {
            lines.push("    - [" + x + ", " + y + "]");
        }
    }

    return lines.join("\n") + "\n";
}
