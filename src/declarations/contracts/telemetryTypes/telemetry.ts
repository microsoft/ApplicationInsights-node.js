/**
 * Base telemetry interface encapsulating coming properties
 */
export interface Telemetry {
    /**
     * Telemetry time stamp. When it is not specified, current timestamp will be used.
     */
    time?: Date;
    /**
     * Additional data used to filter events and metrics in the portal. Defaults to empty.
     */
    properties?: { [key: string]: any };
}
