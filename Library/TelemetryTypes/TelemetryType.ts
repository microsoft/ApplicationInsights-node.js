/**
 * Telemetry type enumeration
 */
enum TelemetryType {
    Event = "EventData",
    Exception = "ExceptionData",
    Trace = "MessageData",
    Metric = "MetricData",
    Request = "RequestData",
    Dependency = "RemoteDependencyData"
}

export = TelemetryType;