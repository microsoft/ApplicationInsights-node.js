/**
 * Breeze response definition.
 */
export interface BreezeResponse {
    itemsReceived: number;
    itemsAccepted: number;
    errors: BreezeError[];
}

/**
 * Breeze errors.
 */
export interface BreezeError {
    index: number;
    statusCode: number;
    message: string;
}

/**
 * Subset of Connection String fields which this SDK can parse. Lower-typecased to
 * allow for case-insensitivity across field names.
 * @internal
 */
export type ConnectionString = { [key in ConnectionStringKey]?: string };

/**
 * ConnectionString keys.
 * @internal
 */
export type ConnectionStringKey =
    | "authorization"
    | "instrumentationkey"
    | "ingestionendpoint"
    | "liveendpoint"
    | "location"
    | "endpointsuffix";

/**
 * SDK info
 * @internal
 */
export const SDK_INFO = {
    NAME: "opentelemetry",
    RUNTIME: "node",
    LANGUAGE: "nodejs",
};
