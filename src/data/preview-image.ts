import type { GeologicTimeline, TimeUnit } from "./age-figure.ts";
import { hasDarkChartColor } from "./age-figure.ts";
import type { Genus, Period } from "./dataset.ts";
import { formatAgeRange } from "./format.ts";
import { getTypeSpecies } from "./records.ts";
import { createSlug } from "./slugs.ts";
import { createGenusPreviewImagePath } from "./urls.ts";

// The link preview image of a genus page (its Open Graph image): the genus's name, who named it,
// its age on the geologic time scale, and its outline with the outline's credit line. Astro
// builds each image as a page at preview/genus/{slug}/, and scripts/create-preview-images.ts
// draws it in Chromium as preview/genus/{slug}.png after the build, then removes the page.

/**
 * The image's width in pixels, the size link previews show at.
 */
export const previewImageWidth = 1200;

/**
 * The image's height in pixels.
 */
export const previewImageHeight = 630;

/**
 * The periods the image's time scale shows, oldest first: those of the dataset's genera.
 */
const previewPeriodNames = ["Triassic", "Jurassic", "Cretaceous"];

/**
 * A page's link preview image, for its Open Graph tags.
 */
export type PreviewImage = {
    /**
     * The image's path, from the site's root: "/preview/genus/tyrannosaurus.png".
     */
    path: string;

    /**
     * What the image shows, for those who can't see it.
     */
    description: string;
};

/**
 * One period or stage on the image's time scale.
 */
export type PreviewBand = {
    /**
     * The period or stage name.
     */
    name: string;

    /**
     * The color token of its chart color: "--period-jurassic", "--stage-bathonian".
     */
    colorToken: string;

    /**
     * Its width, as a percentage of the time scale.
     */
    widthPercent: number;

    /**
     * Whether its color needs light text.
     */
    hasDarkColor: boolean;
};

/**
 * Where a genus's age falls on the image's time scale.
 */
export type PreviewMarker = {
    /**
     * Where the age starts, as a percentage of the time scale from its older end.
     */
    leftPercent: number;

    /**
     * How long the age lasts, as a percentage of the time scale.
     */
    widthPercent: number;
};

/**
 * The time scale at the foot of the image: the Triassic to the Cretaceous, each period and stage
 * as wide as it lasted, with the genus's age marked.
 */
export type PreviewTimeScale = {
    /**
     * The periods, oldest first.
     */
    periods: Array<PreviewBand>;

    /**
     * The stages, oldest first.
     */
    stages: Array<PreviewBand>;

    /**
     * The genus's age, or undefined when no numeric age is recorded or it falls outside the
     * scale.
     */
    marker: PreviewMarker | undefined;
};

/**
 * Lay out time units as bands, each as wide as it lasted.
 *
 * @param units - The units, oldest first.
 * @param prefix - The color token prefix: "--period-" or "--stage-".
 * @param span - The scale's length in millions of years.
 * @returns The bands.
 */
function createBands(units: Array<TimeUnit>, prefix: string, span: number): Array<PreviewBand>
{
    const bands = new Array<PreviewBand>();

    for (const unit of units)
    {
        bands.push({
            name: unit.name,
            colorToken: prefix + createSlug(unit.name),
            widthPercent: (unit.fromMa - unit.toMa) / span * 100,
            hasDarkColor: hasDarkChartColor(unit.name),
        });
    }

    return bands;
}

/**
 * Create the image's time scale with a genus's age marked on it.
 *
 * @param period - The type species' period block.
 * @param timeline - The dataset's timescale.
 * @returns The time scale.
 */
export function createPreviewTimeScale(period: Period, timeline: GeologicTimeline): PreviewTimeScale
{
    const periods = new Array<TimeUnit>();
    const stages = new Array<TimeUnit>();

    for (const unit of timeline.periods)
    {
        if (previewPeriodNames.includes(unit.name))
        {
            periods.push(unit);
        }
    }

    for (const epoch of timeline.epochs)
    {
        if (previewPeriodNames.includes(epoch.periodName))
        {
            stages.push(...epoch.stages);
        }
    }

    const fromMa = periods[0].fromMa;
    const toMa = periods[periods.length - 1].toMa;
    const span = fromMa - toMa;
    let marker: PreviewMarker | undefined;

    if (period.from_ma !== undefined && period.to_ma !== undefined && period.from_ma <= fromMa && period.to_ma >= toMa)
    {
        marker = {
            leftPercent: (fromMa - period.from_ma) / span * 100,
            widthPercent: (period.from_ma - period.to_ma) / span * 100,
        };
    }

    return {
        periods: createBands(periods, "--period-", span),
        stages: createBands(stages, "--stage-", span),
        marker,
    };
}

/**
 * Describe a genus's preview image for those who can't see it, as its Open Graph alternative
 * text: "Tyrannosaurus, 72.2–66.0 million years ago, marked on the geologic time scale. Outline of
 * a tyrannosaur."
 *
 * @param genusName - The genus name.
 * @param ageRange - The age in millions of years, or an empty string.
 * @param outlineTitle - The outline's caption, "Outline of a tyrannosaur", or an empty string
 * when the image has no outline.
 * @returns The description.
 */
export function describePreviewImage(genusName: string, ageRange: string, outlineTitle: string): string
{
    const age = ageRange ? ", " + ageRange + ", marked on the geologic time scale" : "";

    return genusName + age + "." + (outlineTitle ? " " + outlineTitle + "." : "");
}

/**
 * Get a genus page's link preview image: its path and description.
 *
 * @param genus - The genus record.
 * @param slug - The genus slug.
 * @param outlineTitle - The caption of the outline its page shows, or an empty string.
 * @param baseUrl - The site's base path, from import.meta.env.BASE_URL.
 * @returns The image.
 */
export function getGenusPreviewImage(genus: Genus, slug: string, outlineTitle: string, baseUrl: string): PreviewImage
{
    const period = getTypeSpecies(genus).period;
    const ageRange = period.from_ma !== undefined && period.to_ma !== undefined ? formatAgeRange(period.from_ma, period.to_ma) : "";

    return {
        path: createGenusPreviewImagePath(baseUrl, slug),
        description: describePreviewImage(genus.genus, ageRange, outlineTitle),
    };
}
