import { Telemetry } from "./Telemetry";

/**
 * Telemetry type used for availability web test results.
 */
export interface PageViewTelemetry extends Telemetry {
        /** Identifier of a page view instance. Used for correlation between page view and other telemetry items. */
        id: string;
        /** Event name. Keep it low cardinality to allow proper grouping and useful metrics. */
        name: string;
        /** Request URL with all query string parameters */
        url?: string;
        /** Request duration in milliseconds. */
        duration?: number;
        /** Fully qualified page URI or URL of the referring page; if unknown, leave blank */
        referredUri?: string;
        /** Collection of custom measurements. */
        measurements?: { [propertyName: string]: number };
}