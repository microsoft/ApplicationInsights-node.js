import { Telemetry } from "./Telemetry";
import Contracts = require("../");
/**
 * Telemetry about the exception thrown by the application
 */
export interface ExceptionTelemetry extends Telemetry {
    /**
     * Exception thrown
     */
    exception: Error;
    /**
     * Metrics associated with this exception, displayed in Metrics Explorer on the portal. Defaults to empty
     */
    measurements?: {
        [key: string]: number;
    };
    /**
     * Exception severity level
     */
    severity?: Contracts.SeverityLevel;
}
