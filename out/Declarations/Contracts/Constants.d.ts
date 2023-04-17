import { Domain } from "./Generated";
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
export declare class RemoteDependencyDataConstants {
    static TYPE_HTTP: string;
    static TYPE_AI: string;
}
export interface ISupportProperties extends Domain {
    properties: any;
}
export declare function domainSupportsProperties(domain: Domain): domain is ISupportProperties;
/**
 * Subset of Connection String fields which this SDK can parse. Lower-typecased to
 * allow for case-insensitivity across field names
 * @type ConnectionStringKey
 */
export interface ConnectionString {
    instrumentationkey?: string;
    ingestionendpoint?: string;
    liveendpoint?: string;
    location?: string;
    endpointsuffix?: string;
}
export declare type ConnectionStringKey = "instrumentationkey" | "ingestionendpoint" | "liveendpoint" | "location" | "endpointsuffix";
