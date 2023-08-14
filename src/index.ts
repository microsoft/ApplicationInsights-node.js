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

// To support previous versions of Beta, will be removed before GA release
export { ApplicationInsightsClient } from "./applicationInsightsClient";
export { ApplicationInsightsConfig } from "./applicationInsightsConfig";

// To support the shim
export * from "../applicationinsights";