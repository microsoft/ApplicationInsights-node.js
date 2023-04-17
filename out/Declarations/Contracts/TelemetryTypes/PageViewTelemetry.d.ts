import { Telemetry } from "./Telemetry";
/**
 * Telemetry type used for availability web test results.
 */
export interface PageViewTelemetry extends Telemetry {
    /**
     * Name of the test that these availability results represent.
     */
    name?: string;
    /**
     * URL of the page to track.
     */
    url?: string;
    /**
     * Request duration in ms
     */
    duration?: number;
    /**
     * Metrics associated with this event, displayed in Metrics Explorer on the portal.
     */
    measurements?: {
        [key: string]: number;
    };
}
