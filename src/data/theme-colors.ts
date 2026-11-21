import * as fs from "node:fs";
import * as path from "node:path";

// Reads theme colors that must appear outside a stylesheet, such as the theme-color meta tags,
// from the theme's tokens, so tokens.css stays the only place a color is written.

/**
 * A token's color in each color scheme.
 */
export type SchemeColors = {
    /**
     * The color in light mode: "#1f2d29".
     */
    light: string;

    /**
     * The color in dark mode, the light one when dark mode doesn't change it.
     */
    dark: string;
};

const tokensPath = path.join(process.cwd(), "src", "theme", "tokens.css");
const darkSchemeQuery = "@media (prefers-color-scheme: dark)";
const hexColorPattern = /^#[0-9a-f]{3,8}$/iu;

let cachedHeaderColors: SchemeColors | undefined;

/**
 * Find a custom property's value in a piece of CSS.
 *
 * @param css - The CSS.
 * @param name - The property: "--color-header-background".
 * @returns Its value, or undefined when the CSS doesn't set it.
 */
function findPropertyValue(css: string, name: string): string | undefined
{
    for (const match of css.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/gu))
    {
        if (match[1] === name)
        {
            return match[2].trim();
        }
    }

    return undefined;
}

/**
 * Read a color token's light and dark values from the theme's tokens: the light one from the
 * bare :root block, the dark one from the prefers-color-scheme block.
 *
 * @param css - The text of tokens.css.
 * @param name - The token: "--color-header-background".
 * @returns The token's colors.
 */
export function readSchemeColors(css: string, name: string): SchemeColors
{
    const darkStart = css.indexOf(darkSchemeQuery);
    const light = findPropertyValue(darkStart >= 0 ? css.slice(0, darkStart) : css, name);
    const dark = darkStart >= 0 ? findPropertyValue(css.slice(darkStart), name) ?? light : light;

    if (!light || !dark || !hexColorPattern.test(light) || !hexColorPattern.test(dark))
    {
        throw new Error("tokens.css doesn't give " + name + " as a hex color in light and dark mode.");
    }

    return { light, dark };
}

/**
 * Get the header's background in each color scheme, which browsers on phones color their
 * toolbars with (the theme-color meta tags).
 *
 * @returns The colors.
 */
export function getHeaderColors(): SchemeColors
{
    cachedHeaderColors ??= readSchemeColors(fs.readFileSync(tokensPath, "utf8"), "--color-header-background");

    return cachedHeaderColors;
}
