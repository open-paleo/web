import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { test } from "node:test";

import { createDirectoryLicenseText, createLicenseEntries, createLicenseText, findLicensedWork, getLicensedDirectories, getLicensedWorks } from "../src/data/licenses.ts";

const rootDirectory = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));

// Dependencies that run only while building and ship nothing to browsers.
const buildOnlyDependencies = new Set(["@astrojs/sitemap"]);

test("every dependency the site ships is listed with its license", () =>
{
    const manifest = JSON.parse(fs.readFileSync(path.join(rootDirectory, "package.json"), "utf8")) as Record<string, Record<string, string>>;
    const listed = new Set<string>();

    for (const work of getLicensedWorks())
    {
        if (work.packageName)
        {
            listed.add(work.packageName);
        }
    }

    for (const name of Object.keys(manifest.dependencies))
    {
        if (!buildOnlyDependencies.has(name))
        {
            assert.ok(listed.has(name), name + " is in package.json's dependencies but not in src/data/licenses.ts");
        }
    }
});

test("every license file exists, and every served folder's works have one", () =>
{
    const slugs = new Set<string>();

    for (const work of getLicensedWorks())
    {
        assert.ok(!slugs.has(work.slug), work.slug + " is used twice");
        slugs.add(work.slug);

        for (const file of work.licenseFiles)
        {
            assert.ok(fs.statSync(path.join(rootDirectory, file)).size > 0, file + " is empty");
        }

        if (work.siteDirectories.length > 0)
        {
            assert.ok(work.licenseFiles.length > 0, work.name + " is served without a license text");
        }
    }
});

test("a license text names the work, its version and copyright, then gives the license", () =>
{
    const text = createLicenseText(findLicensedWork("maplibre-gl-js"), rootDirectory);
    const version = (JSON.parse(fs.readFileSync(path.join(rootDirectory, "node_modules", "maplibre-gl", "package.json"), "utf8")) as Record<string, string>).version;

    assert.ok(text.startsWith("MapLibre GL JS " + version + "\nCopyright: MapLibre contributors; Mapbox\n"));
    assert.ok(text.includes("Redistributions of source code must retain the above copyright notice"));
});

test("each folder's LICENSE.txt holds the works served from it", () =>
{
    assert.ok(getLicensedDirectories().includes("_astro"));

    const text = createDirectoryLicenseText("tools/tree-extractor/onnxruntime", rootDirectory);

    assert.ok(text.includes("ONNX Runtime Web"));
    assert.ok(text.includes("Copyright (c) Microsoft Corporation"));
    assert.ok(!text.includes("MapLibre"));
});

test("the Licenses page links a work's text, or its license's page when it has none", () =>
{
    for (const entry of createLicenseEntries("data", rootDirectory))
    {
        assert.equal(entry.textPath, entry.work.licenseFiles.length > 0 ? "licenses/" + entry.work.slug + ".txt" : undefined);
    }

    const fonts = createLicenseEntries("fonts", rootDirectory);

    assert.equal(fonts[0].textPath, "licenses/alegreya.txt");
    assert.equal(fonts[0].version, "Fontsource 5.3.0");
});
