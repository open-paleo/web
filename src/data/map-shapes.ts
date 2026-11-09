// Types for src/data/map-shapes.json, the region and country outlines the maps shade when a
// species' place is known only to its region or country. The file is written by
// scripts/create-map-shapes.ts from Natural Earth.

/**
 * A point as [longitude, latitude], the GeoJSON order.
 */
export type MapPosition = [number, number];

/**
 * A polygon: its outer ring, then any holes. Each ring's first and last points are the same.
 */
export type MapPolygon = Array<Array<MapPosition>>;

/**
 * The outlines file.
 */
export type MapShapes = {
    /**
     * Where the outlines come from, for the record.
     */
    source: string;

    /**
     * Region outlines by ISO 3166-2 code: "US-MT".
     */
    regions: Record<string, Array<MapPolygon>>;

    /**
     * Country outlines by ISO 3166-1 alpha-2 code: "US".
     */
    countries: Record<string, Array<MapPolygon>>;

    /**
     * Region codes the dataset used when the file was made that Natural Earth has no outline
     * for. Their species are drawn at country level, and the build does not warn about them.
     */
    regionsWithoutOutline: Array<string>;
};
