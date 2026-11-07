import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import astro from "eslint-plugin-astro";

// Formatting rules shared with open-paleo/data and open-paleo/tree-extractor, so all three
// repositories read the same way.
/** @type {import("eslint").Linter.RulesRecord} */
const sharedStylisticRules = {
    // Allman brace style
    "@stylistic/brace-style": ["error", "allman", { allowSingleLine: false }],

    // 4-space indentation, no tabs
    "@stylistic/indent": ["error", 4],
    "@stylistic/no-tabs": "error",

    // Double quotes
    "@stylistic/quotes": ["error", "double", { avoidEscape: true }],

    // Semicolons required
    "@stylistic/semi": ["error", "always"],

    // Trailing commas
    "@stylistic/comma-dangle": ["error", "always-multiline"],

    // Spacing
    "@stylistic/comma-spacing": "error",
    "@stylistic/key-spacing": "error",
    "@stylistic/keyword-spacing": "error",
    "@stylistic/space-before-blocks": "error",
    "@stylistic/space-infix-ops": "error",
    "@stylistic/object-curly-spacing": ["error", "always"],
    "@stylistic/arrow-spacing": "error",
    "@stylistic/block-spacing": "error",
    "@stylistic/semi-spacing": "error",
    "@stylistic/space-before-function-paren": ["error", {
        anonymous: "always",
        named: "never",
        asyncArrow: "always",
    }],

    // No trailing spaces, require final newline
    "@stylistic/no-trailing-spaces": "error",
    "@stylistic/eol-last": ["error", "always"],

    // No multiple empty lines
    "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0, maxBOF: 0 }],

    // Blank line after block-like statements, and before every return
    "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "block-like", next: "*" },
        { blankLine: "always", prev: "*", next: "return" },
    ],

    // Braces on every if/else/for/while body, even a one-line one
    curly: ["error", "all"],

    // Helpers are function declarations, never arrows or function expressions assigned to a
    // variable. Inline callbacks passed to an API are still allowed.
    "func-style": ["error", "declaration"],

    // Prefer const
    "prefer-const": "error",
    "no-var": "error",
};

/** @type {import("eslint").Linter.RulesRecord} */
const typeScriptRules = {
    // Require node: protocol for Node.js built-in modules
    "no-restricted-imports": ["error", {
        paths: [
            { name: "fs", message: "Use 'node:fs' instead." },
            { name: "fs/promises", message: "Use 'node:fs/promises' instead." },
            { name: "path", message: "Use 'node:path' instead." },
            { name: "url", message: "Use 'node:url' instead." },
            { name: "os", message: "Use 'node:os' instead." },
            { name: "crypto", message: "Use 'node:crypto' instead." },
            { name: "util", message: "Use 'node:util' instead." },
            { name: "child_process", message: "Use 'node:child_process' instead." },
            { name: "http", message: "Use 'node:http' instead." },
            { name: "zlib", message: "Use 'node:zlib' instead." },
        ],
    }],

    // Naming conventions
    camelcase: "off",
    "no-underscore-dangle": "off",
    "@typescript-eslint/naming-convention": ["error",
        {
            selector: "default",
            format: ["camelCase"],
            leadingUnderscore: "forbid",
            trailingUnderscore: "forbid",
        },
        {
            selector: "typeLike",
            format: ["PascalCase"],
        },
        {
            // Astro components are imported under PascalCase names (BaseLayout).
            selector: "import",
            format: ["camelCase", "PascalCase"],
        },
        {
            selector: "parameter",
            modifiers: ["unused"],
            format: ["camelCase"],
            leadingUnderscore: "allow",
            filter: { regex: "^_$", match: true },
        },
        {
            // Property names mirror the dataset's snake_case fields (type_specimen, from_ma).
            selector: "objectLiteralProperty",
            format: null,
        },
        {
            selector: "typeProperty",
            format: null,
        },
    ],

    // No unused variables
    "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_$",
    }],

    // No explicit any
    "@typescript-eslint/no-explicit-any": "error",

    // Prefer type over interface
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],

    // Use Array<T> generic syntax, not T[]
    "@typescript-eslint/array-type": ["error", { default: "generic" }],
};

export default defineConfig(
    eslint.configs.recommended,
    {
        // Build tooling, data modules and browser scripts
        files: ["*.ts", "scripts/**/*.ts", "src/**/*.ts", "test/**/*.ts"],
        extends: [...tseslint.configs.recommended],
        plugins: {
            "@stylistic": stylistic,
        },
        rules: {
            ...sharedStylisticRules,
            ...typeScriptRules,
        },
    },
    ...astro.configs["flat/recommended"],
    {
        // The TypeScript at the top of each component (its frontmatter) follows the same rules
        // as any other TypeScript. ESLint does not check the template markup or <style> blocks;
        // CONTRIBUTING.md covers those.
        files: ["**/*.astro"],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: [".astro"],
            },
        },
        plugins: {
            "@stylistic": stylistic,
            "@typescript-eslint": tseslint.plugin,
        },
        rules: {
            ...sharedStylisticRules,
            ...typeScriptRules,
        },
    },
    {
        ignores: ["dist/**", "public/**", "node_modules/**", "scratch/**", ".astro/**"],
    },
);
