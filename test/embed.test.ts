import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEmbedCode, createEmbedResizeCode, createGenusEmbed, embedFrameHeight, embedFrameWidth } from "../src/data/embed.ts";
import { embedHeightMessageType } from "../src/data/embed-message.ts";
import { readFixture } from "./fixture.ts";

const dataset = readFixture();

test("createGenusEmbed summarizes a genus from its record and type species", () =>
{
    assert.deepEqual(createGenusEmbed(dataset.genera.Tyrannosaurus), {
        name: "Tyrannosaurus",
        parent: "Tyrannosaurinae",
        authority: "Osborn, 1905",
        status: "valid",
        ageRange: "72.2–66.0 Ma",
        age: "Maastrichtian, Late Cretaceous",
        summary: "Tyrannosaurus (meaning \"tyrant lizard\") is a genus of tyrannosaurine theropod dinosaur named by Osborn in 1905.",
        facts: [
            { label: "Diet", value: "Carnivore" },
            { label: "Locomotion", value: "Bipedal" },
            { label: "Length", value: "11.9–13 m" },
            { label: "Mass", value: "5,400–9,500 kg" },
            { label: "Found in", value: "Hell Creek Formation, Montana, United States" },
        ],
        sizeNote: "",
    });
});

test("createGenusEmbed leaves out hip height and skull length", () =>
{
    const labels = new Array<string>();

    for (const fact of createGenusEmbed(dataset.genera.Acrocanthosaurus).facts)
    {
        labels.push(fact.label);
    }

    assert.deepEqual(labels, ["Diet", "Locomotion", "Length", "Mass", "Found in"]);
});

test("createGenusEmbed notes when the size and place are the type species' of several", () =>
{
    assert.equal(createGenusEmbed(dataset.genera.Allosaurus).sizeNote, "Size and place are for the type species.");
});

test("createGenusEmbed leaves out what a record doesn't have", () =>
{
    const embed = createGenusEmbed(dataset.genera.Apatodon);

    assert.equal(embed.status, "nomen dubium");
    assert.equal(embed.ageRange, "");
    assert.equal(embed.age, "Early Jurassic–Early Cretaceous");
    assert.deepEqual(embed.facts, [{ label: "Found in", value: "United States" }]);
});

test("createEmbedCode writes one frame with the infobox's address, title and size", () =>
{
    assert.equal(
        createEmbedCode("https://open-paleo.org/embed/genus/tyrannosaurus/", "Tyrannosaurus"),
        "<iframe src=\"https://open-paleo.org/embed/genus/tyrannosaurus/\" title=\"Tyrannosaurus on Open Paleo\""
        + " width=\"" + embedFrameWidth + "\" height=\"" + embedFrameHeight + "\""
        + " style=\"border: 0; max-width: 100%;\" loading=\"lazy\"></iframe>",
    );
});

test("createEmbedCode escapes its attributes", () =>
{
    const code = createEmbedCode("https://example.org/?a=1&b=\"2\"", "<Name>");

    assert.match(code, /src="https:\/\/example\.org\/\?a=1&amp;b=&quot;2&quot;"/);
    assert.match(code, /title="&lt;Name&gt; on Open Paleo"/);
});

test("createEmbedResizeCode accepts the height only from the site's origin", () =>
{
    const code = createEmbedResizeCode("https://open-paleo.org");

    assert.match(code, /^<script>\n/);
    assert.match(code, /event\.origin !== "https:\/\/open-paleo\.org"/);
    assert.ok(code.includes("\"" + embedHeightMessageType + "\""));
    assert.match(code, /<\/script>$/);
});
