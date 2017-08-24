import Telemetry = require("./Telemetry")
import Contracts = require("../Declarations/Contracts")

interface TraceTelemetry extends Telemetry
{
    /**
     * Trace message
     */
     message: string;
    /**
     * Trace severity level
     */
     severityLevel: Contracts.SeverityLevel;
}

export = TraceTelemetry;