/**
 * Telemetry type enumeration
 */
enum TelemetryType {
    EventData = 1,
    ExceptionData = 2,
    MessageData = 3,
    MetricData = 4,
    RequestData = 5,
    RemoteDependencyData = 6
}

export = TelemetryType;