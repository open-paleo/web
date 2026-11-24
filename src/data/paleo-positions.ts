import type { GeologicTimeline, TimeUnit } from "./age-figure.ts";
import type { Genus, Paleocoordinates } from "./dataset.ts";
import { abbreviateSpeciesName } from "./genus-map.ts";
import type { MapPosition } from "./map-shapes.ts";
import type { RotationModel } from "./plate-rotation.ts";
import { reconstructPosition } from "./plate-rotation.ts";
import { createSlug } from "./slugs.ts";

// Each species' position at the midpoint of its stage, for the genus page's ancient map. The
// dataset reconstructs species at their own age; rotating them to the stage midpoint lines them
// up with that stage's coastlines (public/paleo-coastlines/).

/**
 * One place on a "when it lived" map: the species found there, at their ancient position.
 */
export type PaleoPlace = {
    /**
     * Where, at the stage's midpoint: longitude, then latitude.
     */
    position: MapPosition;

    /**
     * The species' abbreviated names, for the label: "H. delfsi".
     */
    labels: Array<string>;

    /**
     * One line per species, for the popup: "Haplocanthosaurus delfsi: about 31° N".
     */
    details: Array<string>;

    /**
     * Whether the type species is among them.
     */
    isTypeSpecies: boolean;

    /**
     * Whether the position is a region's or country's center rather than a published site.
     */
    isApproximate: boolean;
};

/**
 * A genus's species in one stage, at that stage's midpoint.
 */
export type PaleoView = {
    /**
     * The stage: "Kimmeridgian".
     */
    stage: string;

    /**
     * Its slug, which names its coastline file: "kimmeridgian".
     */
    stageSlug: string;

    /**
     * The epoch it belongs to: "Late Jurassic".
     */
    epoch: string;

    /**
     * The stage's midpoint, in millions of years, rounded to 0.1.
     */
    ageMa: number;

    /**
     * The places.
     */
    places: Array<PaleoPlace>;
};

/**
 * A stage and the epoch it belongs to.
 */
type StageInEpoch = [TimeUnit, string];

/**
 * Get a stage's midpoint, rounded to 0.1 million years: the age its coastlines are
 * reconstructed at.
 *
 * @param fromMa - The stage's base, in millions of years.
 * @param toMa - Its top.
 * @returns The midpoint.
 */
export function getStageMidpoint(fromMa: number, toMa: number): number
{
    return Math.round((fromMa + toMa) / 2 * 10) / 10;
}

/**
 * Find the stage an age falls in: its base is at or before the age, and its top after it.
 *
 * @param timeline - The arranged timescale.
 * @param ageMa - The age, in millions of years.
 * @returns The stage and its epoch, or undefined if the age falls in no stage.
 */
export function findStageForAge(timeline: GeologicTimeline, ageMa: number): StageInEpoch | undefined
{
    for (const epoch of timeline.epochs)
    {
        for (const stage of epoch.stages)
        {
            if (stage.fromMa >= ageMa && ageMa > stage.toMa)
            {
                return [stage, epoch.name];
            }
        }
    }

    return undefined;
}

/**
 * Format a latitude for a popup: "about 31° N".
 *
 * @param latitude - The latitude, in degrees.
 * @returns The text.
 */
function formatLatitude(latitude: number): string
{
    return "about " + Math.round(Math.abs(latitude)) + "° " + (latitude >= 0 ? "N" : "S");
}

/**
 * Find the place in a view at a position.
 *
 * @param view - The view.
 * @param position - The position, rounded as places are.
 * @returns The place, or undefined if none is there yet.
 */
function findPlaceAt(view: PaleoView, position: MapPosition): PaleoPlace | undefined
{
    for (const place of view.places)
    {
        if (place.position[0] === position[0] && place.position[1] === position[1])
        {
            return place;
        }
    }

    return undefined;
}

/**
 * Add a species to its stage's view, at its position at the stage's midpoint; species at the
 * same position share one place.
 *
 * @param views - The views so far, by stage.
 * @param stageInEpoch - The species' stage and epoch.
 * @param speciesName - The species.
 * @param isTypeSpecies - Whether it is the type species.
 * @param paleo - Its paleocoordinates.
 * @param model - The rotation model.
 */
function addToView(views: Map<string, PaleoView>, stageInEpoch: StageInEpoch, speciesName: string, isTypeSpecies: boolean, paleo: Paleocoordinates, model: RotationModel): void
{
    const [stage, epoch] = stageInEpoch;
    const ageMa = getStageMidpoint(stage.fromMa, stage.toMa);
    const position = reconstructPosition(model, [paleo.longitude_present, paleo.latitude_present], paleo.model_plate_id, ageMa);

    if (!position)
    {
        return;
    }

    if (!views.has(stage.name))
    {
        views.set(stage.name, { stage: stage.name, stageSlug: createSlug(stage.name), epoch, ageMa, places: [] });
    }

    const view = views.get(stage.name) as PaleoView;
    const rounded: MapPosition = [Math.round(position[0] * 1000) / 1000, Math.round(position[1] * 1000) / 1000];
    let place = findPlaceAt(view, rounded);

    if (!place)
    {
        place = { position: rounded, labels: [], details: [], isTypeSpecies: false, isApproximate: paleo.approximate };
        view.places.push(place);
    }

    place.labels.push(abbreviateSpeciesName(speciesName));
    place.details.push(speciesName + ": " + formatLatitude(rounded[1]) + " at the time" + (paleo.approximate ? ", estimated from the center of its region" : ""));
    place.isTypeSpecies ||= isTypeSpecies;
}

/**
 * Create a genus's "when it lived" views: its species grouped by the stage their age falls in,
 * each at the stage's midpoint. The type species' stage comes first.
 *
 * @param genus - The genus.
 * @param timeline - The arranged timescale.
 * @param model - The rotation model the dataset's paleocoordinates use.
 * @returns The views; none if no species has paleocoordinates.
 */
export function createPaleoViews(genus: Genus, timeline: GeologicTimeline | undefined, model: RotationModel): Array<PaleoView>
{
    const views = new Map<string, PaleoView>();
    let typeStage = "";

    if (!timeline)
    {
        return [];
    }

    for (const species of genus.species)
    {
        const paleo = species.location?.paleocoordinates;
        const stageInEpoch = paleo ? findStageForAge(timeline, paleo.age_ma) : undefined;

        if (!paleo || !stageInEpoch)
        {
            continue;
        }

        addToView(views, stageInEpoch, species.name, species.type_species === true, paleo, model);

        if (species.type_species)
        {
            typeStage = stageInEpoch[0].name;
        }
    }

    const ordered = new Array<PaleoView>();
    const typeView = views.get(typeStage);

    if (typeView)
    {
        ordered.push(typeView);
    }

    for (const view of views.values())
    {
        if (view !== typeView)
        {
            ordered.push(view);
        }
    }

    return ordered;
}

/**
 * Name a "when it lived" view for its button: "152 million years ago (Kimmeridgian)".
 *
 * @param view - The view.
 * @returns The label.
 */
export function formatPaleoViewLabel(view: PaleoView): string
{
    return view.ageMa + " million years ago (" + view.stage + ")";
}

/**
 * Describe what a "when it lived" view shows, for the note under the map.
 *
 * @param view - The view.
 * @returns The note.
 */
export function describePaleoView(view: PaleoView): string
{
    let hasApproximate = false;

    for (const place of view.places)
    {
        hasApproximate ||= place.isApproximate;
    }

    return "This globe shows today’s coastlines moved back to where they were about " + view.ageMa + " million years ago, in the "
        + view.stage + " (" + view.epoch + "). It doesn’t show the seas of the time. The plate positions come from Wright et al. (2013)."
        + (hasApproximate ? " A ring is a place we know only by its region, drawn at the region’s center." : "");
}
