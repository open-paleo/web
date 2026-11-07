/**
 * Letters that Unicode normalization does not split into a base letter and an accent, with the
 * plain letters that stand in for them in a slug. Without this, "słowiak2020a" would lose its
 * "ł" entirely and become "sowiak2020a".
 */
const plainLetters = new Map<string, string>([
    ["ł", "l"],
    ["Ł", "l"],
    ["ø", "o"],
    ["Ø", "o"],
    ["đ", "d"],
    ["Đ", "d"],
    ["ı", "i"],
    ["æ", "ae"],
    ["Æ", "ae"],
    ["œ", "oe"],
    ["Œ", "oe"],
    ["ß", "ss"],
    ["þ", "th"],
    ["Þ", "th"],
]);

/**
 * Create the URL path segment or fragment for a name or reference key.
 *
 * Accents are removed (martínez2011a becomes martinez2011a, słowiak2020a becomes
 * slowiak2020a), letters are lowercased, runs of spaces become a hyphen, and anything else
 * outside a-z, 0-9 and the hyphen is dropped (d'emic2012a becomes demic2012a).
 *
 * @param text - A genus, clade or species name, or a reference key.
 * @returns The slug.
 */
export function createSlug(text: string): string
{
    // NFD splits an accented letter into its base letter and a combining mark (í becomes i
    // followed by U+0301); dropping every combining mark (\p{Mark}) leaves the base letter.
    const unaccented = text.normalize("NFD").replace(/\p{Mark}/gu, "");
    let plain = "";

    for (const character of unaccented)
    {
        plain += plainLetters.get(character) ?? character;
    }

    return plain
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}
