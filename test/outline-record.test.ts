import assert from "node:assert/strict";
import { test } from "node:test";

import { parse } from "yaml";

import type { OutlineRecordFields } from "../src/scripts/outline-record.ts";
import { createOutlineRecord, createOutlineRecordPath, formatYamlValue } from "../src/scripts/outline-record.ts";

// The form's values for a traced skeletal on Wikimedia Commons.
const fields: OutlineRecordFields = {
    taxon: "Protoceratops",
    depicts: "Protoceratops andrewsi",
    creator: "Scott Hartman",
    source: "https://commons.wikimedia.org/wiki/File:Protoceratops_andrewsi_skeletal.png",
    license: "CC-BY-4.0",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Protoceratops_andrewsi_skeletal.png",
    sha1: "0123456789abcdef0123456789abcdef01234567",
    threshold: 180,
    keepOpen: [[916, 596]],
};

test("the record reads back as the form's values", () =>
{
    const record = parse(createOutlineRecord(fields));

    assert.deepEqual(record, {
        taxon: "Protoceratops",
        title: "Outline of Protoceratops",
        depicts: "Protoceratops andrewsi",
        creator: "Scott Hartman",
        source: fields.source,
        license: "CC-BY-4.0",
        trace: { image: fields.image, sha1: fields.sha1, keep_open: [[916, 596]] },
    });
});

test("a threshold other than the default is recorded, and no points leave keep_open out", () =>
{
    const record = parse(createOutlineRecord({ ...fields, threshold: 150, keepOpen: [] }));

    assert.equal(record.trace.threshold, 150);
    assert.equal("keep_open" in record.trace, false);
});

test("values YAML would misread are quoted", () =>
{
    for (const value of ["Jaime A. Headden (User:Qilong)", "Smith: the elder", "#1 artist", "yes", "1.5", " padded", "Dieudonné"])
    {
        assert.equal(parse("value: " + formatYamlValue(value)).value, value, value);
    }
});

test("the record is saved in the folder of its first letter, without accents", () =>
{
    assert.equal(createOutlineRecordPath("Protoceratops"), "outlines/p/protoceratops.yml");
    assert.equal(createOutlineRecordPath("Ornithomimidae"), "outlines/o/ornithomimidae.yml");
    assert.equal(createOutlineRecordPath("Alcmonavis poeschli"), "outlines/a/alcmonavis-poeschli.yml");
    assert.equal(createOutlineRecordPath("Ñandú"), "outlines/n/nandu.yml");
    assert.equal(createOutlineRecordPath(""), "");
});
