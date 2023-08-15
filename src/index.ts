// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export { TelemetryClient } from "./shim/telemetryClient";
export { ApplicationInsightsOptions } from "./types";
export { KnownSeverityLevel } from "./declarations/generated";
export {
    AvailabilityTelemetry,
    TraceTelemetry,
    ExceptionTelemetry,
    EventTelemetry,
    PageViewTelemetry,
    Telemetry,
} from "./declarations/contracts";

export { ApplicationInsightsClient } from "./applicationInsightsClient";

// To support the shim
export * from "..";