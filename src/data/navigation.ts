import type { PeriodPage } from "./time-pages.ts";

// The site's navigation: groups in the header's top row, and each group's pages in a second row.

/**
 * A page in the navigation.
 */
export type NavigationItem = {
    /**
     * The id pages pass to the layout to mark themselves: "genera", "period-jurassic".
     */
    id: string;

    /**
     * The link's text.
     */
    label: string;

    /**
     * The page's path, relative to the site's base.
     */
    path: string;
};

/**
 * A group of pages, shown in the header's top row.
 */
export type NavigationGroup = {
    /**
     * The group's name.
     */
    label: string;

    /**
     * Its pages, in order; the group links to the first.
     */
    items: Array<NavigationItem>;
};

/**
 * Create the navigation's groups and their pages.
 *
 * @param periods - The periods with pages, oldest first.
 * @returns The groups, in order.
 */
export function createNavigationGroups(periods: Array<PeriodPage>): Array<NavigationGroup>
{
    const periodItems = new Array<NavigationItem>();

    for (const period of periods)
    {
        periodItems.push({ id: "period-" + period.slug, label: period.name, path: "period/" + period.slug + "/" });
    }

    return [
        { label: "Taxa", items: [{ id: "genera", label: "Genera", path: "genera/" }, { id: "clades", label: "Clades", path: "clades/" }, { id: "tree", label: "Tree", path: "tree/" }] },
        { label: "Time", items: [{ id: "time", label: "Time scale", path: "time/" }, ...periodItems] },
        { label: "Places", items: [{ id: "map", label: "Map", path: "map/" }, { id: "stratigraphy", label: "Stratigraphy", path: "stratigraphy/" }] },
        { label: "Learn", items: [{ id: "glossary", label: "Glossary", path: "glossary/" }, { id: "references", label: "References", path: "references/" }] },
        { label: "Data", items: [{ id: "data", label: "Download and cite", path: "data/" }, { id: "tools", label: "Tools", path: "tools/" }] },
    ];
}

/**
 * Find the group a page belongs to.
 *
 * @param groups - The groups.
 * @param id - The page's navigation id, if it has one.
 * @returns The group, or undefined for a page outside them, such as the home page.
 */
export function findNavigationGroup(groups: Array<NavigationGroup>, id: string | undefined): NavigationGroup | undefined
{
    for (const group of groups)
    {
        for (const item of group.items)
        {
            if (item.id === id)
            {
                return group;
            }
        }
    }

    return undefined;
}
