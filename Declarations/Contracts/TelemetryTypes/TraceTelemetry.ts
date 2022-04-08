import { Telemetry } from "./Telemetry";
import { SeverityLevel } from "../../Generated";

/**
 * Trace telemetry reports technical, usually detailed information about the environment,
 * usage of resources, performance, capacity etc
 */
export interface TraceTelemetry extends Telemetry {
    /** Trace message */
    message: string;
    /** Trace severity level. */
    severity?: SeverityLevel;
    /** Collection of custom measurements. */
    measurements?: { [propertyName: string]: number };
}