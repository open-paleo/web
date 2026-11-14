import type { CladeEntry, SiteData } from "./site-data.ts";

/**
 * A name the Tree page's find field offers, with the outline row it reveals.
 */
export type TreeFindName = {
    /**
     * The clade or genus name: "Tyrannosaurinae", "Tyrannosaurus".
     */
    name: string;

    /**
     * Whether it names a clade or a genus.
     */
    kind: "clade" | "genus";

    /**
     * The slug of the clade whose outline row it reveals: the clade itself, or for a genus, the
     * clade it is placed in directly.
     */
    cladeSlug: string;

    /**
     * That clade's name, for the note beside a genus: "in Tyrannosaurinae".
     */
    cladeName: string;
};

/**
 * Add a clade, the genera placed directly in it, and everything below it to the find list.
 *
 * @param clade - The clade.
 * @param siteData - The lookup tables.
 * @param names - The list to add to.
 */
function addCladeNames(clade: CladeEntry, siteData: SiteData, names: Array<TreeFindName>): void
{
    names.push({ name: clade.name, kind: "clade", cladeSlug: clade.slug, cladeName: clade.name });

    for (const genusName of clade.genusNames)
    {
        names.push({ name: genusName, kind: "genus", cladeSlug: clade.slug, cladeName: clade.name });
    }

    for (const childName of clade.childCladeNames)
    {
        const child = siteData.cladeByName.get(childName);

        if (child)
        {
            addCladeNames(child, siteData, names);
        }
    }
}

/**
 * List the names the Tree page's find field offers: every clade in the outline below and
 * including its top clade, and every genus placed in one of them.
 *
 * @param top - The outline's top clade (Dinosauria).
 * @param siteData - The lookup tables.
 * @returns The names, in outline order.
 */
export function createTreeFindNames(top: CladeEntry, siteData: SiteData): Array<TreeFindName>
{
    const names = new Array<TreeFindName>();

    addCladeNames(top, siteData, names);

    return names;
}
