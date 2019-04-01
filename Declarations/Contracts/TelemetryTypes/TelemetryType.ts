export type TelemetryTypeKeys = "Event" | "Exception" | "Trace" | "Metric" | "Request" | "Dependency";
export type TelemetryTypeValues = "EventData" | "ExceptionData" | "MessageData" | "MetricData" | "RequestData" | "RemoteDependencyData";

/**
 * Converts the user-friendly enumeration TelemetryType to the underlying schema baseType value
 * @param type Type to convert to BaseData string
 */
export function telemetryTypeToBaseType(type: TelemetryType): TelemetryTypeValues {
    switch(type) {
        case TelemetryType.Event:
            return "EventData";
        case TelemetryType.Exception:
            return "ExceptionData";
        case TelemetryType.Trace:
            return "MessageData";
        case TelemetryType.Metric:
            return "MetricData";
        case TelemetryType.Request:
            return "RequestData";
        case TelemetryType.Dependency:
            return "RemoteDependencyData";
    }
    return undefined;
}

/**
 * Converts the schema baseType value to the user-friendly enumeration TelemetryType
 * @param baseType BaseData string to convert to TelemetryType
 */
export function baseTypeToTelemetryType(baseType: TelemetryTypeValues): TelemetryType {
    switch(baseType) {
        case "EventData":
            return TelemetryType.Event;
        case "ExceptionData":
            return TelemetryType.Exception;
        case "MessageData":
            return TelemetryType.Trace;
        case "MetricData":
            return TelemetryType.Metric;
        case "RequestData":
            return TelemetryType.Request;
        case "RemoteDependencyData":
            return TelemetryType.Dependency;
    }
    return undefined;
}

export const TelemetryTypeString: {[key: string]: TelemetryTypeValues} = {
    Event: "EventData",
    Exception: "ExceptionData",
    Trace: "MessageData",
    Metric: "MetricData",
    Request: "RequestData",
    Dependency: "RemoteDependencyData"
}

/**
 * Telemetry types supported by this SDK
 */
export enum TelemetryType {
    Event,
    Exception,
    Trace,
    Metric,
    Request,
    Dependency
}

export interface Identified {
    id?: string;
}
