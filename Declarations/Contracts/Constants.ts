import { Domain, EventData, ExceptionData, MessageData, MetricData, PageViewData, RemoteDependencyData, RequestData } from "./Generated";

export class RemoteDependencyDataConstants {
    public static TYPE_HTTP: string = "Http";
    public static TYPE_AI: string = "Http (tracked component)";
}

export interface ISupportProperties extends Domain {
    properties: any;
}

export function domainSupportsProperties(domain: Domain): domain is ISupportProperties {
    return "properties" in domain || // Do extra typechecks in case the type supports it but properties is null/undefined
        domain instanceof EventData ||
        domain instanceof ExceptionData ||
        domain instanceof MessageData ||
        domain instanceof MetricData ||
        domain instanceof PageViewData ||
        domain instanceof RemoteDependencyData ||
        domain instanceof RequestData;
}

/**
 * Subset of Connection String fields which this SDK can parse. Lower-typecased to
 * allow for case-insensitivity across field names
 * @type ConnectionStringKey
 */
export interface ConnectionString {
    authorization?: string;
    appid?: string;
    tenantid?: string;
    certificatesubjectname?: string;
    certificatethumbprint?: string;
    certificatestorelocation?: string;
    appkey?: string;
    instrumentationkey?: string;
    ingestionendpoint?: string;
    liveendpoint?: string;
    location?: string;
    endpointsuffix?: string;

    // Note: this is a node types backcompat equivalent to
    // type ConnectionString = { [key in ConnectionStringKey]?: string }
}

export type ConnectionStringKey = "authorization" | "instrumentationkey" | "ingestionendpoint" | "liveendpoint" | "location"
    | "endpointsuffix" | "appid" | "tenantid" | "certificatesubjectname" | "certificatethumbprint" | "certificatestorelocation" | "appkey";
