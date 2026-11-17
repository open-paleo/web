import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createPaleoViews, findStageForAge } from "../src/data/paleo-positions.ts";
import { getWright2013Model } from "../src/data/plate-rotation.ts";
import { createSiteData } from "../src/data/site-data.ts";
import { readFixture } from "./fixture.ts";

const siteData = createSiteData(readFixture());
const model = getWright2013Model();

test("each species with paleocoordinates appears once, in the view of its stage", () =>
{
    let checked = 0;

    for (const genus of siteData.genera)
    {
        const views = createPaleoViews(genus.record, siteData.timeline, model);
        let placed = 0;

        for (const view of views)
        {
            for (const place of view.places)
            {
                placed += place.details.length;
            }
        }

        let expected = 0;

        for (const species of genus.record.species)
        {
            const paleo = species.location?.paleocoordinates;

            if (paleo && siteData.timeline && findStageForAge(siteData.timeline, paleo.age_ma))
            {
                expected++;
            }
        }

        assert.equal(placed, expected, genus.name);
        checked += expected;
    }

    assert.ok(checked > 0, "the fixture has species with paleocoordinates");
});

test("the type species' stage comes first, and its position matches the dataset at that age", () =>
{
    const genus = siteData.genusByName.get("Tyrannosaurus");

    assert.ok(genus);

    const views = createPaleoViews(genus.record, siteData.timeline, model);
    const rex = genus.record.species.find((species) => species.name === "Tyrannosaurus rex");
    const paleo = rex?.location?.paleocoordinates;

    assert.ok(paleo);
    assert.equal(views[0].stage, "Maastrichtian");
    assert.equal(views[0].ageMa, 69.1);

    // T. rex's own age is the Maastrichtian's midpoint, so rotating it there reproduces the dataset.
    const place = views[0].places.find((candidate) => candidate.labels.includes("T. rex"));

    assert.ok(place);
    assert.ok(Math.abs(place.position[0] - paleo.longitude) < 0.002 && Math.abs(place.position[1] - paleo.latitude) < 0.002);
});
