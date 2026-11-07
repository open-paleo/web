// Types for the built dataset, from the data repository's generated bindings. Import dataset
// types from this module rather than from the bindings directly, so a rename in the bindings is
// fixed in one place.

export type {
    Appearance,
    Clade,
    Completeness,
    Dispute,
    FormerId,
    Genus,
    IcznCase,
    Identifier,
    Location,
    Metadata,
    NotableSpecimen,
    OpenPaleoDataset,
    Period,
    Pronunciation,
    Reference,
    Size,
    SizeRange,
    Species,
    Status,
    Synonym,
    Timescale,
    TreeNode,
    TypeSpecimen,
} from "./bindings/open-paleo";

import type { Timescale } from "./bindings/open-paleo";

/**
 * One stage of the timescale: its epoch and boundary ages. The bindings declare this type
 * inline, so it is named here.
 */
export type TimescaleStage = Timescale["stages"][string];
