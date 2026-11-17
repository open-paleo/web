import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { coloredCladeNames, createCladeColorToken, otherCladeColorToken } from "../src/data/clade-colors.ts";

// Checks the clade colors in src/theme/clade-colors.css: one light and one dark color for every
// clade in src/data/clade-colors.ts and for the rest, distinct from one another under normal
// vision and simulated color-vision deficiencies, and readable as lines on the chart's background.

/**
 * A color in linear sRGB, each channel from 0 to 1.
 */
type LinearColor = [number, number, number];

/**
 * A color in OKLab: lightness, then the a and b axes.
 */
type OklabColor = [number, number, number];

/**
 * A 3×3 matrix applied to linear sRGB.
 */
type ColorMatrix = [LinearColor, LinearColor, LinearColor];

// How far apart (OKLab ×100) every pair must stay, and the contrast each needs as a line.
const minimumDifference = 8;
const minimumContrast = 3;

// Machado, Oliveira and Fernandes (2009), full severity, applied in linear sRGB.
const visions: Record<string, ColorMatrix> = {
    normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const themeDirectory = path.join(testDirectory, "..", "src", "theme");
const cladeColors = fs.readFileSync(path.join(themeDirectory, "clade-colors.css"), "utf8");
const tokens = fs.readFileSync(path.join(themeDirectory, "tokens.css"), "utf8");
const tokenNames = getTokenNames();

/**
 * Get the tokens to check: each colored clade's, then the rest's.
 *
 * @returns The token names.
 */
function getTokenNames(): Array<string>
{
    const names = new Array<string>();

    for (const name of coloredCladeNames)
    {
        names.push(createCladeColorToken(name));
    }

    names.push(otherCladeColorToken);

    return names;
}

/**
 * Read every custom property set in a piece of CSS.
 *
 * @param css - The CSS.
 * @returns Each property's value, by name.
 */
function readProperties(css: string): Map<string, string>
{
    const properties = new Map<string, string>();

    for (const match of css.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g))
    {
        properties.set(match[1], match[2].trim());
    }

    return properties;
}

/**
 * Split a theme file into its light block, the dark block inside the color-scheme query, and the
 * dark block for an explicit dark theme.
 *
 * @param css - The file.
 * @returns The three blocks' properties.
 */
function readThemeBlocks(css: string): [Map<string, string>, Map<string, string>, Map<string, string>]
{
    const mediaStart = css.indexOf("@media (prefers-color-scheme: dark)");
    const explicitStart = css.indexOf(":root[data-theme=\"dark\"]");

    return [
        readProperties(css.slice(0, mediaStart)),
        readProperties(css.slice(mediaStart, explicitStart)),
        readProperties(css.slice(explicitStart)),
    ];
}

/**
 * Convert a hex color to linear sRGB.
 *
 * @param hex - The color: "#c1552c".
 * @returns Its linear channels.
 */
function toLinear(hex: string): LinearColor
{
    const channels = new Array<number>();

    for (const start of [1, 3, 5])
    {
        const value = parseInt(hex.slice(start, start + 2), 16) / 255;

        channels.push(value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    }

    return [channels[0], channels[1], channels[2]];
}

/**
 * Show a color as a person with a color-vision deficiency would see it.
 *
 * @param color - The color.
 * @param matrix - The deficiency's matrix.
 * @returns The simulated color.
 */
function simulate(color: LinearColor, matrix: ColorMatrix): LinearColor
{
    const result = new Array<number>();

    for (const row of matrix)
    {
        result.push(Math.min(1, Math.max(0, row[0] * color[0] + row[1] * color[1] + row[2] * color[2])));
    }

    return [result[0], result[1], result[2]];
}

/**
 * Convert linear sRGB to OKLab.
 *
 * @param color - The color.
 * @returns Its OKLab coordinates.
 */
function toOklab(color: LinearColor): OklabColor
{
    const [red, green, blue] = color;
    const long = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
    const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
    const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);

    return [
        0.2104542553 * long + 0.7936177850 * medium - 0.0040720468 * short,
        1.9779984951 * long - 2.4285922050 * medium + 0.4505937099 * short,
        0.0259040371 * long + 0.7827717662 * medium - 0.8086757660 * short,
    ];
}

/**
 * Measure a color's relative luminance, as WCAG defines it.
 *
 * @param color - The color.
 * @returns The luminance, from 0 to 1.
 */
function measureLuminance(color: LinearColor): number
{
    return 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];
}

/**
 * Measure the contrast ratio between two colors, as WCAG defines it.
 *
 * @param first - One color.
 * @param second - The other.
 * @returns The ratio, from 1 to 21.
 */
function measureContrast(first: LinearColor, second: LinearColor): number
{
    const firstLuminance = measureLuminance(first);
    const secondLuminance = measureLuminance(second);

    return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

/**
 * Measure how far apart two colors look under one vision, in OKLab ×100.
 *
 * @param first - One color, as hex.
 * @param second - The other.
 * @param matrix - The vision's matrix.
 * @returns The difference.
 */
function measureDifference(first: string, second: string, matrix: ColorMatrix): number
{
    const [firstLightness, firstA, firstB] = toOklab(simulate(toLinear(first), matrix));
    const [secondLightness, secondA, secondB] = toOklab(simulate(toLinear(second), matrix));

    return Math.hypot(firstLightness - secondLightness, firstA - secondA, firstB - secondB) * 100;
}

/**
 * Find the closest pair of colors under any of the visions.
 *
 * @param colors - The colors, by token.
 * @returns The smallest difference (OKLab ×100) and where it occurs.
 */
function findClosestPair(colors: Map<string, string>): [number, string]
{
    let closest = Infinity;
    let where = "";

    const entries = [...colors.entries()];

    for (const [vision, matrix] of Object.entries(visions))
    {
        for (let first = 0; first < entries.length; first++)
        {
            for (let second = first + 1; second < entries.length; second++)
            {
                const difference = measureDifference(entries[first][1], entries[second][1], matrix);

                if (difference < closest)
                {
                    closest = difference;
                    where = entries[first][0] + " and " + entries[second][0] + " under " + vision;
                }
            }
        }
    }

    return [closest, where];
}

/**
 * Pick the clade colors out of a theme block.
 *
 * @param block - The block's properties.
 * @returns Each clade color, by token.
 */
function pickCladeColors(block: Map<string, string>): Map<string, string>
{
    const colors = new Map<string, string>();

    for (const name of tokenNames)
    {
        const value = block.get(name);

        if (value)
        {
            colors.set(name, value);
        }
    }

    return colors;
}

const [light, darkByPreference, darkByTheme] = readThemeBlocks(cladeColors);
const [lightTokens, , darkTokens] = readThemeBlocks(tokens);
const themes: Array<[string, Map<string, string>, string]> = [
    ["light", pickCladeColors(light), lightTokens.get("--color-surface") ?? ""],
    ["dark", pickCladeColors(darkByTheme), darkTokens.get("--color-surface") ?? ""],
];

test("every colored clade, and the rest, has a light and a dark color", () =>
{
    for (const name of tokenNames)
    {
        assert.match(light.get(name) ?? "", /^#[0-9a-f]{6}$/, name + " (light)");
        assert.match(darkByTheme.get(name) ?? "", /^#[0-9a-f]{6}$/, name + " (dark)");
    }
});

test("both dark blocks set the same colors", () =>
{
    assert.deepEqual(pickCladeColors(darkByPreference), pickCladeColors(darkByTheme));
});

for (const [theme, colors, surface] of themes)
{
    test("the " + theme + " clade colors stay distinct under every vision", () =>
    {
        const [closest, where] = findClosestPair(colors);

        assert.ok(closest >= minimumDifference, "closest pair " + closest.toFixed(1) + ": " + where);
    });

    test("the " + theme + " clade colors read as lines on the chart's background", () =>
    {
        for (const [name, value] of colors)
        {
            const contrast = measureContrast(toLinear(value), toLinear(surface));

            assert.ok(contrast >= minimumContrast, name + " has " + contrast.toFixed(2) + ":1 on " + surface);
        }
    });
}
