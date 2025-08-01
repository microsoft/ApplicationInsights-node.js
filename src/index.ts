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
export { useAzureMonitor, shutdownAzureMonitor, flushAzureMonitor } from "./main";

// To support the shim
export * from "./shim/applicationinsights";
