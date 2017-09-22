/**
 * Converts the user-friendly enumeration TelemetryType to the underlying schema baseType value
 * @param type Type to convert to BaseData string
 */
export function telemetryTypeToBaseType(type: TelemetryType): string {
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
