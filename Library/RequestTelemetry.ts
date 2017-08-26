import Telemetry = require("./Telemetry")

/**
 * Telemetry about the incoming request processsed by the application
 */
interface RequestTelemetry extends Telemetry
{
    /**
     * Unique identifier of the request. This property is used by auto-collection and auto-correlation logic,
     * leave it unspecified when tracking requests manually
     */
     id?: string;

     /**
      * Request name
      */
     name: string;

     /**
      * Request url
      */
     url: string;

     /**
      * Request source. This encapsulates the information about the component that initiated the request
      */
     source: string;

     /**
      * Request duration in ms
      */
     duration: number;

     /**
      * Result code reported by the application
      */
     resultCode: string;

     /**
      * Whether the request was successful
      */
     success: boolean;
}

export = RequestTelemetry;