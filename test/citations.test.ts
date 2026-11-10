import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import * as url from "node:url";

import { createDatasetCitation, createRecordCitation } from "../src/data/citations.ts";
import { readDataset } from "../src/data/load-dataset.ts";

const testDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const metadata = readDataset(path.join(testDirectory, "fixtures"), "3.3.0")._metadata;
const year = metadata.version.split(".")[0];

test("a genus citation names the record, the release and the page, with the genus in italic", () =>
{
    const citation = createRecordCitation("Genus", "Tyrannosaurus", "tyrannosaurus", "https://open-paleo.org/genus/tyrannosaurus/", metadata);

    assert.equal(citation.text, "Open Paleo contributors. (" + year + "). Tyrannosaurus [Genus record]. In Open Paleo (Version " + metadata.version + ") [Dataset]. https://open-paleo.org/genus/tyrannosaurus/");
    assert.equal(citation.before + citation.italic + citation.after, citation.text);
    assert.equal(citation.italic, "Tyrannosaurus");
    assert.match(citation.bibtex, /^@misc\{openpaleo-tyrannosaurus,\n/);
    assert.match(citation.bibtex, /title {8}= \{\\textit\{Tyrannosaurus\}\},/);
    assert.match(citation.bibtex, /note {9}= \{Genus record\}\n\}$/);
});

test("a clade citation has no italic part", () =>
{
    const citation = createRecordCitation("Clade", "Tyrannosaurinae", "tyrannosaurinae", "https://open-paleo.org/clade/tyrannosaurinae/", metadata);

    assert.equal(citation.italic, "");
    assert.equal(citation.before + citation.after, citation.text);
    assert.match(citation.bibtex, /title {8}= \{Tyrannosaurinae\},/);
});

test("the dataset citation is the one the data repository recommends", () =>
{
    const citation = createDatasetCitation(metadata);

    assert.equal(citation.text, "Open Paleo contributors. (" + year + "). Open Paleo (Version " + metadata.version + ") [Dataset]. https://github.com/open-paleo/data");
    assert.match(citation.bibtex, /^@misc\{openpaleo,/);
});
