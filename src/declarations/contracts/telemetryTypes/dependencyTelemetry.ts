import { Telemetry } from "./telemetry";

/**
 * Telemetry about the call to remote component
 */
export interface DependencyTelemetry extends Telemetry {
    /** Identifier of a dependency call instance. Used for correlation with the request telemetry item corresponding to this dependency call. */
    id?: string;
    /** Name of the command initiated with this dependency call. Low cardinality value. Examples are stored procedure name and URL path template. */
    name: string;
    /** Result code of a dependency call. Examples are SQL error code and HTTP status code. */
    resultCode?: string | number;
    /** Command initiated by this dependency call. Examples are SQL statement and HTTP URL with all query parameters. */
    data?: string;
    /** Dependency type name. Very low cardinality value for logical grouping of dependencies and interpretation of other fields like commandName and resultCode. Examples are SQL, Azure table, and HTTP. */
    dependencyTypeName?: string;
    /** Target site of a dependency call. Examples are server name, host address. */
    target?: string;
    /** Remote call duration in ms. */
    duration: string;
    /** Indication of successful or unsuccessful call. */
    success?: boolean;
    /** Collection of custom measurements. */
    measurements?: { [propertyName: string]: number };
}
