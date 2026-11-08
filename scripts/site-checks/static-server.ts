import * as fs from "node:fs";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import * as path from "node:path";

import { getServedFile } from "./links.ts";

/**
 * A local web server for the built site, serving it the way GitHub Pages does.
 */
export type StaticServer = {
    /**
     * The site's address, ending in the base path: "http://127.0.0.1:53211/".
     */
    url: string;

    /**
     * The running server, for closing it.
     */
    server: http.Server;
};

const contentTypes = new Map<string, string>([
    [".html", "text/html; charset=utf-8"],
    [".css", "text/css; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".json", "application/json"],
    [".svg", "image/svg+xml"],
    [".png", "image/png"],
    [".ico", "image/x-icon"],
    [".woff2", "font/woff2"],
    [".wasm", "application/wasm"],
    [".xml", "application/xml"],
    [".txt", "text/plain; charset=utf-8"],
]);

/**
 * Send one file, or the site's 404 page when there is no file at the requested path.
 *
 * @param siteDirectory - The built site, as an absolute path.
 * @param basePath - The path the site is served under, ending in "/".
 * @param request - The request.
 * @param response - The response to write.
 */
function sendFile(siteDirectory: string, basePath: string, request: http.IncomingMessage, response: http.ServerResponse): void
{
    const urlPath = new URL(request.url ?? "/", "http://localhost").pathname;
    const servedFile = getServedFile(urlPath, basePath);
    const filePath = servedFile === undefined ? "" : path.join(siteDirectory, servedFile);
    const isInsideSite = filePath.startsWith(siteDirectory + path.sep);

    if (isInsideSite && fs.existsSync(filePath) && fs.statSync(filePath).isFile())
    {
        response.writeHead(200, { "Content-Type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream" });
        response.end(fs.readFileSync(filePath));

        return;
    }

    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(fs.readFileSync(path.join(siteDirectory, "404.html")));
}

/**
 * Serve the built site on a free local port.
 *
 * @param siteDirectory - The built site: "dist".
 * @param basePath - The path the site is served under, ending in "/".
 * @returns The running server and its address.
 */
export function startStaticServer(siteDirectory: string, basePath: string): Promise<StaticServer>
{
    const absoluteDirectory = path.resolve(siteDirectory);
    const server = http.createServer((request, response) => sendFile(absoluteDirectory, basePath, request, response));

    return new Promise((resolve) =>
    {
        server.listen(0, "127.0.0.1", () =>
        {
            const address = server.address() as AddressInfo;

            resolve({ url: "http://127.0.0.1:" + address.port + basePath, server });
        });
    });
}
