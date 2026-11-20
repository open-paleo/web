/**
 * Find what is wrong with one JSON-LD script's text: it must parse as JSON, and be a schema.org
 * item with a type.
 *
 * @param text - The script's text, as written in the page.
 * @returns What is wrong, or undefined when nothing is.
 */
export function findStructuredDataProblem(text: string): string | undefined
{
    let data: unknown;

    try
    {
        data = JSON.parse(text);
    }
    catch (error)
    {
        return "is not JSON: " + (error instanceof Error ? error.message : String(error));
    }

    if (typeof data !== "object" || data === null || Array.isArray(data))
    {
        return "is not a JSON object";
    }
    else if (!("@context" in data) || data["@context"] !== "https://schema.org")
    {
        return "has no schema.org context";
    }
    else if (!("@type" in data) || typeof data["@type"] !== "string" || data["@type"] === "")
    {
        return "has no type";
    }

    return undefined;
}
