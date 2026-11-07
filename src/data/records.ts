import type { Genus, Size, Species } from "./dataset.ts";
import { formatSizeRange } from "./format.ts";

/**
 * One size measurement, ready to display.
 */
export type SizeMeasurement = {
    /**
     * What was measured: "Length", "Mass".
     */
    label: string;

    /**
     * The formatted range with its unit: "11.9–13 m".
     */
    value: string;
};

/**
 * Get a genus's type species, or its first species if none is marked.
 *
 * @param genus - The genus record.
 * @returns The type species.
 */
export function getTypeSpecies(genus: Genus): Species
{
    for (const species of genus.species)
    {
        if (species.type_species)
        {
            return species;
        }
    }

    return genus.species[0];
}

/**
 * List a species' size measurements in a fixed order: length, mass, hip height, skull length.
 *
 * @param size - The species' size block, if any.
 * @returns The measurements that are recorded.
 */
export function listSizeMeasurements(size: Size | undefined): Array<SizeMeasurement>
{
    const measurements = new Array<SizeMeasurement>();

    if (size?.length_m)
    {
        measurements.push({ label: "Length", value: formatSizeRange(size.length_m, "m") });
    }

    if (size?.weight_kg)
    {
        measurements.push({ label: "Mass", value: formatSizeRange(size.weight_kg, "kg") });
    }

    if (size?.hip_height_m)
    {
        measurements.push({ label: "Hip height", value: formatSizeRange(size.hip_height_m, "m") });
    }

    if (size?.skull_length_m)
    {
        measurements.push({ label: "Skull length", value: formatSizeRange(size.skull_length_m, "m") });
    }

    return measurements;
}
