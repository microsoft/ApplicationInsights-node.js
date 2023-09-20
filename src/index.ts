// Copyright (c) Microsoft Corporation.
export { TelemetryClient } from "./shim/telemetryClient";
export { AzureMonitorOpenTelemetryOptions } from "./types";
export { KnownSeverityLevel } from "./declarations/generated";
export {
    AvailabilityTelemetry,
    TraceTelemetry,
    ExceptionTelemetry,
    EventTelemetry,
    PageViewTelemetry,
    Telemetry,
} from "./declarations/contracts";
export { useAzureMonitor, shutdownAzureMonitor } from "./main";

// To support the shim
export * from "./shim/applicationinsights";
