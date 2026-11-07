import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createSlug } from "../src/data/slugs.ts";

test("createSlug lowercases names", () =>
{
    assert.equal(createSlug("Tyrannosaurus"), "tyrannosaurus");
    assert.equal(createSlug("Tyrannosauridae"), "tyrannosauridae");
});

test("createSlug joins binomials with a hyphen", () =>
{
    assert.equal(createSlug("Tyrannosaurus rex"), "tyrannosaurus-rex");
    assert.equal(createSlug("Nanotyrannus  lancensis"), "nanotyrannus-lancensis");
});

test("createSlug removes accents from reference keys", () =>
{
    assert.equal(createSlug("martínez2011a"), "martinez2011a");
    assert.equal(createSlug("lü2014a"), "lu2014a");
});

test("createSlug replaces letters that normalization does not split", () =>
{
    assert.equal(createSlug("słowiak2020a"), "slowiak2020a");
    assert.equal(createSlug("Østergaard"), "ostergaard");
    assert.equal(createSlug("Weiß"), "weiss");
});

test("createSlug drops apostrophes and other punctuation", () =>
{
    assert.equal(createSlug("d'emic2012a"), "demic2012a");
    assert.equal(createSlug("o'connor2025b"), "oconnor2025b");
});

test("createSlug keeps hyphens and digits", () =>
{
    assert.equal(createSlug("molina-pérez2019a"), "molina-perez2019a");
});
