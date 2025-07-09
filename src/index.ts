// Copyright (c) Microsoft Corporation.
export { TelemetryClient } from "./shim/telemetryClient";
export { AzureMonitorOpenTelemetryOptions, InstrumentationOptions } from "./types";
export { KnownSeverityLevel } from "./declarations/generated";
export {
    AvailabilityTelemetry,
    TraceTelemetry,
    ExceptionTelemetry,
    EventTelemetry,
    PageViewTelemetry,
    Telemetry,
} from "./declarations/contracts";
export { useAzureMonitor, shutdownAzureMonitor, flushAzureMonitor, getExtensibleSpanProcessor, getExtensibleLogRecordProcessor } from "./main";
export { ExtensibleSpanProcessor } from "./shared/util/extensibleSpanProcessor";
export { ExtensibleLogRecordProcessor } from "./shared/util/extensibleLogRecordProcessor";

// To support the shim
export * from "./shim/applicationinsights";
