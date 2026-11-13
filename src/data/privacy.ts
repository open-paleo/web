// The facts the privacy page states, kept here so the page and the site check read the same
// list. The page states what the site sends each service, which depends on this site's code, and
// links to each service's own policy for what it does with it, which depends on theirs. The site check (scripts/check-site.ts) records every off-site host the sample pages
// contact and fails if a host isn't declared below, so a new outside service can't reach the
// site without an entry here, and so without a place on the privacy page.

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
export const privacyPolicyEffectiveDate = "November 13, 2026";

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
        role: "Serves the map backgrounds",
        whenContacted: "On pages with a map, when the map loads",
        receives: "Your IP address, your browser's description of itself, and which part of the map is shown.",
        policyUrl: "https://openfreemap.org/privacy/",
        policyName: "OpenFreeMap's privacy policy",
        hosts: ["tiles.openfreemap.org"],
    },
];

/**
 * List the off-site hosts the services declare.
 *
 * @returns Every declared host.
 */
export function listDeclaredHosts(): Array<string>
{
    const hosts = new Array<string>();

    for (const service of externalServices)
    {
        hosts.push(...service.hosts);
    }

    return hosts;
}
