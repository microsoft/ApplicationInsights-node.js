import Telemetry = require("./Telemetry")
import Contracts = require("../Declarations/Contracts")

interface ExceptionTelemetry extends Telemetry
{
    /**
     * Exception thrown
     */
     exception: Error;

    /**
     * Metrics associated with this exception, displayed in Metrics Explorer on the portal. Defaults to empty
     */
    measurements?: { [key: string]: number; };

    /**
     * 
     */
    type: Contracts.DataTypes.EXCEPTION;
}

export = ExceptionTelemetry;