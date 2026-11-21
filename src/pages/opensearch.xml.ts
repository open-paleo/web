import type { APIContext } from "astro";

/**
 * Write the OpenSearch description, which lets browsers offer the site's search from their
 * address bar. Its search address must be absolute, so local builds without SITE_URL use the
 * preview server's; only builds with SITE_URL link to it from the pages.
 *
 * @param context - The build context, which carries the site's address.
 * @returns The file.
 */
export function GET(context: APIContext): Response
{
    const searchPageUrl = new URL(import.meta.env.BASE_URL + "search/", context.site ?? "http://localhost:4321").href;
    const lines = [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<OpenSearchDescription xmlns=\"http://a9.com/-/spec/opensearch/1.1/\" xmlns:moz=\"http://www.mozilla.org/2006/browser/search/\">",
        "    <ShortName>Open Paleo</ShortName>",
        "    <Description>Search Open Paleo’s genera, clades, rock units, references and geologic time.</Description>",
        "    <InputEncoding>UTF-8</InputEncoding>",
        "    <Url type=\"text/html\" method=\"get\" template=\"" + searchPageUrl + "?q={searchTerms}\"/>",
        "    <moz:SearchForm>" + searchPageUrl + "</moz:SearchForm>",
        "</OpenSearchDescription>",
    ];

    return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "application/opensearchdescription+xml; charset=utf-8" } });
}
