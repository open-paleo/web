import * as assert from "node:assert/strict";
import { test } from "node:test";

import { getHeaderColors, readSchemeColors } from "../src/data/theme-colors.ts";

test("the header's colors come from the theme's tokens, one for each color scheme", () =>
{
    const colors = getHeaderColors();

    assert.match(colors.light, /^#[0-9a-f]{6}$/iu);
    assert.match(colors.dark, /^#[0-9a-f]{6}$/iu);
    assert.notEqual(colors.light, colors.dark);
});

test("a token that dark mode doesn't change keeps its light color, and a missing one fails", () =>
{
    const css = ":root\n{\n    --color-a: #111111;\n    --color-b: #222222;\n}\n\n@media (prefers-color-scheme: dark)\n{\n    :root\n    {\n        --color-a: #eeeeee;\n    }\n}\n";

    assert.deepEqual(readSchemeColors(css, "--color-a"), { light: "#111111", dark: "#eeeeee" });
    assert.deepEqual(readSchemeColors(css, "--color-b"), { light: "#222222", dark: "#222222" });
    assert.throws(() => readSchemeColors(css, "--color-c"));
    assert.throws(() => readSchemeColors(":root { --color-a: var(--color-b); }", "--color-a"));
});
