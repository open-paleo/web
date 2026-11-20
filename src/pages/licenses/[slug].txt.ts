import type { APIContext } from "astro";

import type { LicensedWork } from "../../data/licenses.ts";
import { createLicenseText, getLicensedWorks } from "../../data/licenses.ts";

/**
 * One generated license text: its URL parameter and the work it is for.
 */
type LicenseTextPath = {
    /**
     * URL parameters: the work's slug.
     */
    params: LicenseTextParameters;

    /**
     * Properties passed to the endpoint.
     */
    props: LicenseTextProps;
};

/**
 * URL parameters of a license text.
 */
type LicenseTextParameters = {
    /**
     * The work's slug, as in licenses/{slug}.txt.
     */
    slug: string;
};

/**
 * Properties of a license text.
 */
type LicenseTextProps = {
    /**
     * The work.
     */
    work: LicensedWork;
};

/**
 * List one license text per work that has license files.
 *
 * @returns The path and properties of every license text.
 */
export function getStaticPaths(): Array<LicenseTextPath>
{
    const paths = new Array<LicenseTextPath>();

    for (const work of getLicensedWorks())
    {
        if (work.licenseFiles.length > 0)
        {
            paths.push({ params: { slug: work.slug }, props: { work } });
        }
    }

    return paths;
}

/**
 * Write a work's license text.
 *
 * @param context - The build context, which carries the work.
 * @returns The file.
 */
export function GET(context: APIContext<LicenseTextProps>): Response
{
    return new Response(createLicenseText(context.props.work, process.cwd()), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
}
