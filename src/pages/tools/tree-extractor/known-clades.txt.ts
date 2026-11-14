import { listKnownCladeNames } from "../../../data/known-names.ts";
import { getSiteData } from "../../../data/site-data.ts";

/**
 * Write tools/tree-extractor/known-clades.txt: every clade with a record in the dataset, one per
 * line, which the tree extractor uses to correct the clade names it reads. Built from the
 * current release, so it never lags the dataset.
 *
 * @returns The list.
 */
export function GET(): Response
{
    return new Response(listKnownCladeNames(getSiteData()).join("\n") + "\n", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
}
