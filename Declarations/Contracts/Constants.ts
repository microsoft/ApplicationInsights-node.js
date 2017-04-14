import { Domain, EventData, ExceptionData, MessageData, MetricData, PageViewData, RemoteDependencyData, RequestData } from "./Generated";

export class RemoteDependencyDataConstants {
    public static TYPE_HTTP:string = "Http";
    public static TYPE_AI:string = "ApplicationInsights";
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