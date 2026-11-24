import type { OutlinePlacement, RgbaImage, TraceReport } from "@open-paleo/outline-tracer";

import type { OutlineRecordFields } from "./outline-record.ts";
import { createOutlineRecord, createOutlineRecordPath, defaultThreshold } from "./outline-record.ts";
import type { TraceAnswer, TraceRequest } from "./outline-tracer-worker.ts";
import TracerWorker from "./outline-tracer-worker.ts?worker";

// The outline tracer's page: opens a figure, traces it in a worker when asked, shows the outline
// over the figure, and writes the record for open-paleo/media.

/**
 * The page's elements.
 */
type TracerElements = {
    /**
     * Everything the script shows; hidden until it runs.
     */
    tracer: HTMLElement;

    /**
     * The file input.
     */
    fileInput: HTMLInputElement;

    /**
     * The open figure's name.
     */
    fileName: HTMLElement;

    /**
     * The settings, disabled until a figure is open.
     */
    settings: HTMLFieldSetElement;

    /**
     * The threshold slider.
     */
    threshold: HTMLInputElement;

    /**
     * The threshold's number field.
     */
    thresholdValue: HTMLInputElement;

    /**
     * The list of keep-open points.
     */
    pointList: HTMLUListElement;

    /**
     * The x field for adding a point.
     */
    pointX: HTMLInputElement;

    /**
     * The y field for adding a point.
     */
    pointY: HTMLInputElement;

    /**
     * The button that adds a point.
     */
    pointAdd: HTMLButtonElement;

    /**
     * The button that traces the figure.
     */
    trace: HTMLButtonElement;

    /**
     * The trace's status.
     */
    status: HTMLElement;

    /**
     * Whether the outline is shown over the figure.
     */
    showOutline: HTMLInputElement;

    /**
     * The figure.
     */
    image: HTMLImageElement;

    /**
     * The outline over the figure.
     */
    overlay: HTMLElement;

    /**
     * The keep-open points over the figure.
     */
    markers: HTMLElement;

    /**
     * The outline, large.
     */
    outline: HTMLElement;

    /**
     * The outline, at the size a genus page shows it.
     */
    outlineSmall: HTMLElement;

    /**
     * The record's fields, disabled until a figure is open.
     */
    record: HTMLFieldSetElement;

    /**
     * The record's form fields, in the record's order.
     */
    recordInputs: RecordInputs;

    /**
     * Where to save the record.
     */
    recordPath: HTMLElement;

    /**
     * The record's text.
     */
    recordText: HTMLElement;

    /**
     * The button that copies the record.
     */
    copy: HTMLButtonElement;

    /**
     * Whether the record was copied.
     */
    copyStatus: HTMLElement;
};

/**
 * The record's form fields.
 */
type RecordInputs = {
    /**
     * The genus or clade.
     */
    taxon: HTMLInputElement;

    /**
     * The taxon drawn.
     */
    depicts: HTMLInputElement;

    /**
     * The artist.
     */
    creator: HTMLInputElement;

    /**
     * The source page.
     */
    source: HTMLInputElement;

    /**
     * The image file's address.
     */
    image: HTMLInputElement;

    /**
     * The license.
     */
    license: HTMLSelectElement;
};

/**
 * An open figure.
 */
type Figure = {
    /**
     * Its pixels.
     */
    image: RgbaImage;

    /**
     * Its SHA-1, in hex.
     */
    sha1: string;

    /**
     * The address the page shows it from.
     */
    url: string;
};

/**
 * What the page holds between events.
 */
type TracerState = {
    /**
     * The open figure, if any.
     */
    figure: Figure | undefined;

    /**
     * The trace's threshold.
     */
    threshold: number;

    /**
     * Points, in the figure's pixels, inside spaces the trace keeps open.
     */
    keepOpen: Array<[number, number]>;

    /**
     * The latest trace request; answers to earlier ones are dropped.
     */
    requestId: number;

    /**
     * Whether the figure has been traced since it was opened.
     */
    isTraced: boolean;
};

const worker = new TracerWorker();
const state: TracerState = { figure: undefined, threshold: defaultThreshold, keepOpen: [], requestId: 0, isTraced: false };

/**
 * Find an element by id, or fail: the page's markup and this script go together.
 *
 * @param id - The element's id.
 * @returns The element.
 */
function getElement<ElementType extends HTMLElement>(id: string): ElementType
{
    const element = document.getElementById(id);

    if (!element)
    {
        throw new Error("The outline tracer's page has no #" + id);
    }

    return element as ElementType;
}

/**
 * Find the page's elements.
 *
 * @returns The elements.
 */
function findElements(): TracerElements
{
    return {
        tracer: getElement("outline-tracer"),
        fileInput: getElement("tracer-file"),
        fileName: getElement("tracer-file-name"),
        settings: getElement("tracer-settings"),
        threshold: getElement("tracer-threshold"),
        thresholdValue: getElement("tracer-threshold-value"),
        pointList: getElement("tracer-points"),
        pointX: getElement("tracer-point-x"),
        pointY: getElement("tracer-point-y"),
        pointAdd: getElement("tracer-point-add"),
        trace: getElement("tracer-trace"),
        status: getElement("tracer-status"),
        showOutline: getElement("tracer-show-outline"),
        image: getElement("tracer-image"),
        overlay: getElement("tracer-overlay"),
        markers: getElement("tracer-markers"),
        outline: getElement("tracer-outline"),
        outlineSmall: getElement("tracer-outline-small"),
        record: getElement("tracer-record"),
        recordInputs: {
            taxon: getElement("record-taxon"),
            depicts: getElement("record-depicts"),
            creator: getElement("record-creator"),
            source: getElement("record-source"),
            image: getElement("record-image"),
            license: getElement("record-license"),
        },
        recordPath: getElement("tracer-record-path"),
        recordText: getElement("tracer-record-text"),
        copy: getElement("tracer-copy"),
        copyStatus: getElement("tracer-copy-status"),
    };
}

const elements = findElements();

/**
 * Get a file's SHA-1.
 *
 * @param bytes - The file's contents.
 * @returns The SHA-1, in hex.
 */
async function getSha1(bytes: ArrayBuffer): Promise<string>
{
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", bytes));
    let hex = "";

    for (const byte of digest)
    {
        hex += byte.toString(16).padStart(2, "0");
    }

    return hex;
}

/**
 * Read a figure's pixels as they are in the file, without color management.
 *
 * @param file - The figure's file.
 * @returns The figure.
 */
async function readFigure(file: File): Promise<Figure>
{
    const bitmap = await createImageBitmap(file, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");

    if (!context)
    {
        throw new Error("This browser can't read the figure's pixels.");
    }

    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);

    return {
        image: { width: pixels.width, height: pixels.height, data: pixels.data },
        sha1: await getSha1(await file.arrayBuffer()),
        url: URL.createObjectURL(file),
    };
}

/**
 * Open a figure and trace it.
 *
 * @param file - The figure's file.
 */
async function openFigure(file: File): Promise<void>
{
    elements.status.textContent = "Opening " + file.name + "…";

    try
    {
        const figure = await readFigure(file);

        if (state.figure)
        {
            URL.revokeObjectURL(state.figure.url);
        }

        state.figure = figure;
        state.keepOpen = [];
        state.isTraced = false;
        state.requestId++;
        elements.fileName.textContent = file.name + ", " + figure.image.width + " × " + figure.image.height + " pixels";
        elements.image.src = figure.url;
        elements.image.hidden = false;
        elements.settings.disabled = false;
        elements.record.disabled = false;
        elements.trace.disabled = false;
        elements.outline.replaceChildren();
        elements.outlineSmall.replaceChildren();
        elements.overlay.replaceChildren();
        elements.status.textContent = "Opened. Change the settings if the figure needs it, then trace it.";
        showPoints();
        updateRecord();
    }
    catch (error)
    {
        elements.status.textContent = "Couldn't open " + file.name + ": " + (error instanceof Error ? error.message : String(error));
    }
}

/**
 * Note that the outline no longer matches the settings, once the figure has been traced.
 */
function markOutlineOutdated(): void
{
    if (state.isTraced)
    {
        elements.status.textContent = "The settings have changed; trace again to update the outline.";
    }
}

/**
 * Ask the worker to trace the figure with the current settings.
 */
function sendTraceRequest(): void
{
    if (!state.figure)
    {
        return;
    }

    state.requestId++;
    elements.status.textContent = "Tracing…";

    const request: TraceRequest = { id: state.requestId, image: state.figure.image, options: { threshold: state.threshold, keepOpen: state.keepOpen } };

    worker.postMessage(request);
}

/**
 * Turn the tracer's SVG into an element drawn in the current text color, sized by its container.
 *
 * @param svgText - The SVG, as potrace writes it.
 * @returns The element.
 */
function createOutlineElement(svgText: string): SVGSVGElement
{
    const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;
    const svg = document.importNode(parsed, true) as unknown as SVGSVGElement;

    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("aria-hidden", "true");

    for (const shape of svg.querySelectorAll("[fill]"))
    {
        shape.setAttribute("fill", "currentColor");
    }

    return svg;
}

/**
 * Place the outline over the figure where it was traced from.
 *
 * @param svg - The outline.
 * @param placement - Where it lies on the figure, in the figure's pixels.
 * @param figure - The figure.
 */
function placeOverlay(svg: SVGSVGElement, placement: OutlinePlacement, figure: Figure): void
{
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.left = (placement.left / figure.image.width * 100) + "%";
    svg.style.top = (placement.top / figure.image.height * 100) + "%";
    svg.style.width = (placement.width / figure.image.width * 100) + "%";
    svg.style.height = (placement.height / figure.image.height * 100) + "%";
    elements.overlay.replaceChildren(svg);
}

/**
 * Describe what a trace found and changed, in a sentence or two.
 *
 * @param report - The trace's report.
 * @param milliseconds - How long it took.
 * @returns The description.
 */
function describeReport(report: TraceReport, milliseconds: number): string
{
    const kept = report.shapesKept === 1 ? "1 shape kept" : report.shapesKept + " shapes kept";
    const lines = report.linesErased === 1 ? "1 ground line erased" : report.linesErased + " ground lines erased";
    const cavities = report.cavitiesFilled === 1 ? "1 cavity filled" : report.cavitiesFilled + " cavities filled";
    let description = "Traced in " + (milliseconds / 1000).toFixed(1) + " s: " + kept + " and " + report.shapesDropped + " dropped; " + lines + "; " + cavities + ".";

    for (const [x, y] of report.keepOpenMissed)
    {
        description += " The point (" + x + ", " + y + ") is on the drawing rather than in an open space, so it does nothing.";
    }

    return description;
}

/**
 * Show a trace's outline and report, unless a newer trace has been asked for.
 *
 * @param event - The worker's answer.
 */
function showTraceAnswer(event: MessageEvent<TraceAnswer>): void
{
    const answer = event.data;

    if (answer.id !== state.requestId || !state.figure)
    {
        return;
    }

    if (!answer.report || !answer.placement)
    {
        elements.status.textContent = "Couldn't trace the figure: " + answer.error;
        elements.outline.replaceChildren();
        elements.outlineSmall.replaceChildren();
        elements.overlay.replaceChildren();

        return;
    }

    state.isTraced = true;
    elements.outline.replaceChildren(createOutlineElement(answer.svg));
    elements.outlineSmall.replaceChildren(createOutlineElement(answer.svg));
    placeOverlay(createOutlineElement(answer.svg), answer.placement, state.figure);
    elements.status.textContent = describeReport(answer.report, answer.milliseconds);
}

/**
 * Create the button that marks a keep-open point on the figure, and removes it when clicked.
 *
 * @param point - The point, in the figure's pixels.
 * @param index - Its place in the list.
 * @param figure - The figure.
 * @returns The button.
 */
function createMarker(point: [number, number], index: number, figure: Figure): HTMLButtonElement
{
    const marker = document.createElement("button");

    marker.type = "button";
    marker.dataset.index = String(index);
    marker.style.left = (point[0] / figure.image.width * 100) + "%";
    marker.style.top = (point[1] / figure.image.height * 100) + "%";
    marker.setAttribute("aria-label", "Remove the keep-open point at " + point[0] + ", " + point[1]);

    return marker;
}

/**
 * Create the list item for a keep-open point, with its remove button.
 *
 * @param point - The point, in the figure's pixels.
 * @param index - Its place in the list.
 * @returns The list item.
 */
function createPointItem(point: [number, number], index: number): HTMLLIElement
{
    const item = document.createElement("li");
    const remove = document.createElement("button");

    remove.type = "button";
    remove.dataset.index = String(index);
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", "Remove the keep-open point at " + point[0] + ", " + point[1]);
    item.append(point[0] + ", " + point[1], remove);

    return item;
}

/**
 * Show the keep-open points, on the figure and in the settings.
 */
function showPoints(): void
{
    const markers = new Array<HTMLButtonElement>();
    const items = new Array<HTMLLIElement>();

    for (let index = 0; index < state.keepOpen.length && state.figure; index++)
    {
        markers.push(createMarker(state.keepOpen[index], index, state.figure));
        items.push(createPointItem(state.keepOpen[index], index));
    }

    elements.markers.replaceChildren(...markers);
    elements.pointList.replaceChildren(...items);
}

/**
 * Add a keep-open point, and trace again.
 *
 * @param x - The column, in the figure's pixels.
 * @param y - The row, in the figure's pixels.
 */
function addPoint(x: number, y: number): void
{
    if (!state.figure || x < 0 || y < 0 || x >= state.figure.image.width || y >= state.figure.image.height)
    {
        return;
    }

    state.keepOpen = [...state.keepOpen, [x, y]];
    showPoints();
    updateRecord();
    markOutlineOutdated();
}

/**
 * Remove a keep-open point when its marker or its remove button is clicked, and trace again.
 *
 * @param event - The click.
 */
function removeClickedPoint(event: MouseEvent): void
{
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-index]");

    if (!button)
    {
        return;
    }

    const index = Number(button.dataset.index);

    state.keepOpen = state.keepOpen.filter((_, position) => position !== index);
    showPoints();
    updateRecord();
    markOutlineOutdated();
}

/**
 * Add a keep-open point where the figure was clicked.
 *
 * @param event - The click.
 */
function addClickedPoint(event: MouseEvent): void
{
    if (!state.figure)
    {
        return;
    }

    const bounds = elements.image.getBoundingClientRect();
    const x = Math.round((event.clientX - bounds.left) / bounds.width * state.figure.image.width);
    const y = Math.round((event.clientY - bounds.top) / bounds.height * state.figure.image.height);

    addPoint(x, y);
}

/**
 * Add the keep-open point typed into the settings.
 */
function addTypedPoint(): void
{
    if (elements.pointX.value === "" || elements.pointY.value === "")
    {
        return;
    }

    addPoint(Math.round(Number(elements.pointX.value)), Math.round(Number(elements.pointY.value)));
    elements.pointX.value = "";
    elements.pointY.value = "";
}

/**
 * Set the threshold from either of its fields, and trace again.
 *
 * @param event - The field's input.
 */
function setThreshold(event: Event): void
{
    const value = Math.round(Number((event.target as HTMLInputElement).value));

    if (!Number.isFinite(value) || value < 1 || value > 254)
    {
        return;
    }

    state.threshold = value;
    elements.threshold.value = String(value);
    elements.thresholdValue.value = String(value);
    updateRecord();
    markOutlineOutdated();
}

/**
 * Write the record from the form and the trace's settings.
 */
function updateRecord(): void
{
    const inputs = elements.recordInputs;
    const fields: OutlineRecordFields = {
        taxon: inputs.taxon.value.trim(),
        depicts: inputs.depicts.value.trim(),
        creator: inputs.creator.value.trim(),
        source: inputs.source.value.trim(),
        license: inputs.license.value,
        image: inputs.image.value.trim(),
        sha1: state.figure?.sha1 ?? "",
        threshold: state.threshold,
        keepOpen: state.keepOpen,
    };
    const path = createOutlineRecordPath(fields.taxon);

    elements.recordText.firstElementChild?.replaceChildren(createOutlineRecord(fields));
    elements.recordPath.textContent = path
        ? "Save it as " + path + " in open-paleo/media, then run npm run trace there to write its outline."
        : "Give the genus or clade to see where to save the record.";
    elements.copyStatus.textContent = "";
}

/**
 * Copy the record to the clipboard.
 */
async function copyRecord(): Promise<void>
{
    try
    {
        await navigator.clipboard.writeText(elements.recordText.textContent ?? "");
        elements.copyStatus.textContent = "Record copied.";
    }
    catch
    {
        elements.copyStatus.textContent = "Couldn't copy; select the record and copy it instead.";
    }
}

/**
 * Open the figure chosen in the file input.
 */
function openChosenFigure(): void
{
    const file = elements.fileInput.files?.[0];

    if (file)
    {
        void openFigure(file);
    }
}

/**
 * Let a file be dropped anywhere on the page.
 *
 * @param event - The drag.
 */
function allowDrop(event: DragEvent): void
{
    if (event.dataTransfer?.types.includes("Files"))
    {
        event.preventDefault();
    }
}

/**
 * Open a figure dropped on the page.
 *
 * @param event - The drop.
 */
function openDroppedFigure(event: DragEvent): void
{
    const file = event.dataTransfer?.files[0];

    if (file)
    {
        event.preventDefault();
        void openFigure(file);
    }
}

/**
 * Show or hide the outline over the figure.
 */
function toggleOverlay(): void
{
    elements.overlay.hidden = !elements.showOutline.checked;
}

/**
 * Connect the page's controls, and show the tool.
 */
function initializeOutlineTracer(): void
{
    worker.addEventListener("message", showTraceAnswer);
    elements.fileInput.addEventListener("change", openChosenFigure);
    document.addEventListener("dragover", allowDrop);
    document.addEventListener("drop", openDroppedFigure);
    elements.threshold.addEventListener("input", setThreshold);
    elements.thresholdValue.addEventListener("input", setThreshold);
    elements.image.addEventListener("click", addClickedPoint);
    elements.markers.addEventListener("click", removeClickedPoint);
    elements.pointList.addEventListener("click", removeClickedPoint);
    elements.pointAdd.addEventListener("click", addTypedPoint);
    elements.showOutline.addEventListener("change", toggleOverlay);
    elements.record.addEventListener("input", updateRecord);
    elements.copy.addEventListener("click", () => void copyRecord());
    elements.trace.addEventListener("click", sendTraceRequest);
    updateRecord();
    elements.tracer.hidden = false;
}

initializeOutlineTracer();
