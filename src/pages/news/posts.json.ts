import { createNewsIndex } from "../../data/news.ts";
import { getNewsPosts } from "../../data/news-collection.ts";

/**
 * Write news/posts.json: every news post's title, page, date and summary, which the News page's
 * find field loads the first time a reader uses it.
 *
 * @returns The posts.
 */
export async function GET(): Promise<Response>
{
    return new Response(JSON.stringify(createNewsIndex(await getNewsPosts())), {
        headers: { "Content-Type": "application/json" },
    });
}
