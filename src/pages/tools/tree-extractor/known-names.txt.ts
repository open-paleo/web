import { listKnownTaxonNames } from "../../../data/known-names.ts";
import { getSiteData } from "../../../data/site-data.ts";

/**
 * Write tools/tree-extractor/known-names.txt: every genus, species and synonym in the dataset,
 * one per line, which the tree extractor matches the labels it reads against. Built from the
 * current release, so it never lags the dataset.
 *
 * @returns The list.
 */
export function GET(): Response
{
    return new Response(listKnownTaxonNames(getSiteData()).join("\n") + "\n", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
}
