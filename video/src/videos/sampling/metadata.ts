import type { EditorialProps } from "../../editorial/Page";
import { narratedMetadata } from "../../narration/metadata";
import { script } from "./script";

/** Placeholder: the merged video's metadata (duration and props), which
 *  Root.tsx registers as its calculateMetadata. Replace this file. */
export const samplingMetadata = narratedMetadata<EditorialProps>(script);
