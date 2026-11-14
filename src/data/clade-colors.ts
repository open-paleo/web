// The clades that get their own color, which the Tree page's chart gives each one's branches.
// Their colors are tokens in src/theme/clade-colors.css; test/clade-colors.test.ts checks that
// every clade here has a light and a dark color there and that the colors stay distinct. When the
// tree grows beyond Dinosauria, this list and that file change together.

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
