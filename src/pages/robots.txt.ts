import type { APIContext } from "astro";

/**
 * Write robots.txt: every page may be crawled, and the sitemap is listed when the site's
 * address is known.
 *
 * @param context - The build context, which carries the site's address.
 * @returns The file.
 */
export function GET(context: APIContext): Response
{
    const lines = ["User-agent: *", "Allow: /"];

    if (context.site)
    {
        lines.push("", "Sitemap: " + new URL(import.meta.env.BASE_URL + "sitemap-index.xml", context.site).href);
    }

    return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
