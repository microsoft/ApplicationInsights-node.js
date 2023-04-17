export declare type TelemetryTypeKeys = "Event" | "Exception" | "Trace" | "Metric" | "Request" | "Dependency" | "Availability" | "PageView";
export declare type TelemetryTypeValues = "EventData" | "ExceptionData" | "MessageData" | "MetricData" | "RequestData" | "RemoteDependencyData" | "AvailabilityData" | "PageViewData";
/**
 * Converts the user-friendly enumeration TelemetryType to the underlying schema baseType value
 * @param type Type to convert to BaseData string
 */
export declare function telemetryTypeToBaseType(type: TelemetryType): TelemetryTypeValues;
/**
 * Converts the schema baseType value to the user-friendly enumeration TelemetryType
 * @param baseType BaseData string to convert to TelemetryType
 */
export declare function baseTypeToTelemetryType(baseType: TelemetryTypeValues): TelemetryType;
export declare const TelemetryTypeString: {
    [key: string]: TelemetryTypeValues;
};
/**
 * Telemetry types supported by this SDK
 */
export declare enum TelemetryType {
    Event = 0,
    Exception = 1,
    Trace = 2,
    Metric = 3,
    Request = 4,
    Dependency = 5,
    Availability = 6,
    PageView = 7
}
export interface Identified {
    id?: string;
}
