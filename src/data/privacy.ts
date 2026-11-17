// The outside services the privacy page lists. The site check fails if a page contacts a host
// that isn't declared here.

/**
 * An outside service that handles visitors' requests: the host serving the site, or a service a
 * page's browser contacts.
 */
export type ExternalService = {
    /**
     * The service's name: "Plausible Analytics".
     */
    name: string;

    /**
     * Who operates it, and where: "Hyperknot Software Kft., Hungary".
     */
    operator: string;

    /**
     * What it does for the site: "Counts visits".
     */
    role: string;

    /**
     * When a visitor's browser contacts it: "On pages with a map, when the map loads".
     */
    whenContacted: string;

    /**
     * What a visitor's browser sends it with each request.
     */
    receives: string;

    /**
     * Its privacy policy, which describes what it does with the data it receives.
     */
    policyUrl: string;

    /**
     * The policy's link text: "Plausible's data policy".
     */
    policyName: string;

    /**
     * The off-site hosts browsers contact for it, without a scheme: "tiles.openfreemap.org".
     * Empty for the site's own host.
     */
    hosts: Array<string>;
};

/**
 * The day the current privacy policy took effect, as the page shows it. Update it whenever the
 * policy changes.
 */
export const privacyPolicyEffectiveDate = "November 14, 2026";

/**
 * The address for privacy questions and requests.
 */
export const privacyContact = "privacy@open-paleo.org";

/**
 * Every outside service that handles visitors' requests.
 */
export const externalServices: Array<ExternalService> = [
    {
        name: "GitHub Pages",
        operator: "GitHub, Inc., United States",
        role: "Hosts the site",
        whenContacted: "On every request to open-paleo.org",
        receives: "Your IP address, your browser's description of itself, and the address of each file requested, as any web host does.",
        policyUrl: "https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement",
        policyName: "GitHub's privacy statement",
        hosts: [],
    },
    {
        name: "Plausible Analytics",
        operator: "Plausible, Estonia",
        role: "Counts visits",
        whenContacted: "On every page of open-paleo.org",
        receives: "The page's address, the site that linked to it, your browser's description of itself, and your IP address.",
        policyUrl: "https://plausible.io/data-policy",
        policyName: "Plausible's data policy",
        hosts: ["plausible.io"],
    },
    {
        name: "OpenFreeMap",
        operator: "Hyperknot Software Kft., Hungary",
        role: "Serves the map backgrounds, and the fonts for labels on maps and the tree chart",
        whenContacted: "On pages with a map or the tree chart, when it loads",
        receives: "Your IP address, your browser's description of itself, and which part of the map is shown or which letters a label needs.",
        policyUrl: "https://openfreemap.org/privacy/",
        policyName: "OpenFreeMap's privacy policy",
        hosts: ["tiles.openfreemap.org"],
    },
];

/**
 * Get the off-site hosts the services declare.
 *
 * @returns Every declared host.
 */
export function getDeclaredHosts(): Array<string>
{
    const hosts = new Array<string>();

    for (const service of externalServices)
    {
        hosts.push(...service.hosts);
    }

    return hosts;
}
