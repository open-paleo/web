import type { OutlinePlacement, RgbaImage, TraceOptions, TraceReport } from "@open-paleo/outline-tracer";
import { traceOutline } from "@open-paleo/outline-tracer";
import { traceWithPotrace } from "@open-paleo/outline-tracer/potrace";

// Traces outlines for the outline tracer's page, off the page's main thread.

/**
 * A request to trace a figure.
 */
export type TraceRequest = {
    /**
     * Identifies the request, so the page can drop answers to requests it has replaced.
     */
    id: number;

    /**
     * The figure.
     */
    image: RgbaImage;

    /**
     * The trace's settings.
     */
    options: TraceOptions;
};

/**
 * The answer to a trace request: the outline, or what went wrong.
 */
export type TraceAnswer = {
    /**
     * The request this answers.
     */
    id: number;

    /**
     * The outline's SVG; empty if the trace failed.
     */
    svg: string;

    /**
     * Where the SVG lies on the figure; undefined if the trace failed.
     */
    placement: OutlinePlacement | undefined;

    /**
     * What the trace found and changed; undefined if it failed.
     */
    report: TraceReport | undefined;

    /**
     * How long the trace took, in milliseconds.
     */
    milliseconds: number;

    /**
     * Why the trace failed; empty if it didn't.
     */
    error: string;
};

/**
 * Trace a figure and answer the page.
 *
 * @param event - The page's request.
 */
async function answerTraceRequest(event: MessageEvent<TraceRequest>): Promise<void>
{
    const request = event.data;
    const started = performance.now();
    let answer: TraceAnswer;

    try
    {
        const result = await traceOutline(request.image, request.options, traceWithPotrace);

        answer = { id: request.id, svg: result.svg, placement: result.placement, report: result.report, milliseconds: performance.now() - started, error: "" };
    }
    catch (error)
    {
        answer = { id: request.id, svg: "", placement: undefined, report: undefined, milliseconds: performance.now() - started, error: error instanceof Error ? error.message : String(error) };
    }

    self.postMessage(answer);
}

self.addEventListener("message", answerTraceRequest);
