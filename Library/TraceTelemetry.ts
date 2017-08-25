import Telemetry = require("./Telemetry")
import Contracts = require("../Declarations/Contracts")

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