// The clades that get their own color on the Tree page's chart. Their colors are in
// src/theme/clade-colors.css; change the two together.

/**
 * The colored clades, in the order the legend lists them.
 */
export const coloredCladeNames = ["Theropoda", "Sauropodomorpha", "Thyreophora", "Ornithopoda", "Ceratopsia", "Pachycephalosauria"];

/**
 * The token for branches in none of the colored clades.
 */
export const otherCladeColorToken = "--color-clade-other";

/**
 * Name a colored clade's color token.
 *
 * @param name - The clade: "Theropoda".
 * @returns Its token: "--color-clade-theropoda".
 */
export function createCladeColorToken(name: string): string
{
    return "--color-clade-" + name.toLowerCase();
}
