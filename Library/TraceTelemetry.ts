import Telemetry = require("./Telemetry")
import Contracts = require("../Declarations/Contracts")

/**
 * Trace telemetry reports technical, usually detailed information about the environment, 
 * usage of resources, performance, capacity etc
 */
interface TraceTelemetry extends Telemetry {
    /**
     * Trace message
     */
    message: string;
    /**
     * Trace severity level
     */
    severity?: Contracts.SeverityLevel;
}

export = TraceTelemetry;