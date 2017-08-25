import Telemetry = require("./Telemetry")

interface EventTelemetry extends Telemetry
{
    /**
     * Name of the event
     */
     name: string;
     
    /**
     * Metrics associated with this event, displayed in Metrics Explorer on the portal. Defaults to empty
     */
    measurements?: { [key: string]: number; };
}
export = EventTelemetry;