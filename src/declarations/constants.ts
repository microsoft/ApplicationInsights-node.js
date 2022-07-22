import * as Contracts from "./contracts";

/**
 * Azure service API version.
 */
export enum ServiceApiVersion {
    /**
     * V2 Version
     */
    V2 = "2020-09-15_Preview",
}

export const APPLICATION_INSIGHTS_SDK_VERSION = "3.0.0-preview.0";
export const DEFAULT_BREEZE_ENDPOINT = "https://dc.services.visualstudio.com";
export const DEFAULT_LIVEMETRICS_ENDPOINT = "https://rt.services.visualstudio.com";
export const DEFAULT_LIVEMETRICS_HOST = "rt.services.visualstudio.com";
export const DEFAULT_BREEZE_API_VERSION = ServiceApiVersion.V2;

/**
 * Application Insights Environment variable.
 */
export const ENV_AZURE_PREFIX = "APPSETTING_"; // Azure adds this prefix to all environment variables
export const ENV_IKEY = "APPINSIGHTS_INSTRUMENTATIONKEY"; // This key is provided in the readme
export const LEGACY_ENV_IKEY = "APPINSIGHTS_INSTRUMENTATION_KEY";
export const ENV_QUCKPULSE_HOST = "APPINSIGHTS_QUICKPULSE_HOST";





/**
 * Map a PerformanceCounter/QuickPulseCounter to a QuickPulseCounter. If no mapping exists, mapping is *undefined*
 */
export const PerformanceToQuickPulseCounter: { [key: string]: QuickPulseCounter } = {
    [PerformanceCounter.PROCESSOR_TIME]: QuickPulseCounter.PROCESSOR_TIME,
    [PerformanceCounter.REQUEST_RATE]: QuickPulseCounter.REQUEST_RATE,
    [PerformanceCounter.REQUEST_DURATION]: QuickPulseCounter.REQUEST_DURATION,

    // Remap quick pulse only counters
    [QuickPulseCounter.COMMITTED_BYTES]: QuickPulseCounter.COMMITTED_BYTES,
    [QuickPulseCounter.REQUEST_FAILURE_RATE]: QuickPulseCounter.REQUEST_FAILURE_RATE,
    [QuickPulseCounter.DEPENDENCY_RATE]: QuickPulseCounter.DEPENDENCY_RATE,
    [QuickPulseCounter.DEPENDENCY_FAILURE_RATE]: QuickPulseCounter.DEPENDENCY_FAILURE_RATE,
    [QuickPulseCounter.DEPENDENCY_DURATION]: QuickPulseCounter.DEPENDENCY_DURATION,
    [QuickPulseCounter.EXCEPTION_RATE]: QuickPulseCounter.EXCEPTION_RATE,
};

// Note: Explicitly define these types instead of using enum due to
// potential 'export enum' issues with typescript < 2.0.
export type QuickPulseDocumentType =
    | "Event"
    | "Exception"
    | "Trace"
    | "Metric"
    | "Request"
    | "RemoteDependency"
    | "Availability"
    | "PageView";
export type QuickPulseType =
    | "EventTelemetryDocument"
    | "ExceptionTelemetryDocument"
    | "TraceTelemetryDocument"
    | "MetricTelemetryDocument"
    | "RequestTelemetryDocument"
    | "DependencyTelemetryDocument"
    | "AvailabilityTelemetryDocument"
    | "PageViewTelemetryDocument";

export const QuickPulseDocumentType: {
    [key in Contracts.TelemetryTypeKeys]: QuickPulseDocumentType;
} = {
    Event: "Event",
    Exception: "Exception",
    Trace: "Trace",
    Metric: "Metric",
    Request: "Request",
    Dependency: "RemoteDependency",
    Availability: "Availability",
    PageView: "PageView",
};

export const QuickPulseType: { [key in Contracts.TelemetryTypeKeys]: QuickPulseType } = {
    Event: "EventTelemetryDocument",
    Exception: "ExceptionTelemetryDocument",
    Trace: "TraceTelemetryDocument",
    Metric: "MetricTelemetryDocument",
    Request: "RequestTelemetryDocument",
    Dependency: "DependencyTelemetryDocument",
    Availability: "AvailabilityTelemetryDocument",
    PageView: "PageViewTelemetryDocument",
};

export const TelemetryTypeStringToQuickPulseType: {
    [key in Contracts.TelemetryTypeValues]: QuickPulseType;
} = {
    EventData: QuickPulseType.Event,
    ExceptionData: QuickPulseType.Exception,
    MessageData: QuickPulseType.Trace,
    MetricData: QuickPulseType.Metric,
    RequestData: QuickPulseType.Request,
    RemoteDependencyData: QuickPulseType.Dependency,
    AvailabilityData: QuickPulseType.Availability,
    PageViewData: QuickPulseType.PageView,
};

export const TelemetryTypeStringToQuickPulseDocumentType: {
    [key in Contracts.TelemetryTypeValues]: QuickPulseDocumentType;
} = {
    EventData: QuickPulseDocumentType.Event,
    ExceptionData: QuickPulseDocumentType.Exception,
    MessageData: QuickPulseDocumentType.Trace,
    MetricData: QuickPulseDocumentType.Metric,
    RequestData: QuickPulseDocumentType.Request,
    RemoteDependencyData: QuickPulseDocumentType.Dependency,
    AvailabilityData: QuickPulseDocumentType.Availability,
    PageViewData: QuickPulseDocumentType.PageView,
};

export const DependencyTypeName = {
    Grpc: "GRPC",
    Http: "HTTP",
    InProc: "InProc",
    Sql: "SQL",
    QueueMessage: "Queue Message",
};

export const HeartBeatMetricName = "HeartBeat";

export const StatsbeatTelemetryName = "Statsbeat";

export const StatsbeatResourceProvider = {
    appsvc: "appsvc",
    functions: "functions",
    vm: "vm",
    unknown: "unknown",
};

export const StatsbeatAttach = {
    codeless: "codeless",
    sdk: "sdk",
};

export const StatsbeatCounter = {
    REQUEST_SUCCESS: "Request Success Count",
    REQUEST_FAILURE: "Request Failure Count",
    REQUEST_DURATION: "Request Duration",
    RETRY_COUNT: "Retry Count",
    THROTTLE_COUNT: "Throttle Count",
    EXCEPTION_COUNT: "Exception Count",
    ATTACH: "Attach",
    FEATURE: "Feature",
};

export enum StatsbeatFeature {
    NONE = 0,
    DISK_RETRY = 1,
    AAD_HANDLING = 2,
}

export enum StatsbeatInstrumentation {
    NONE = 0,
    AZURE_CORE_TRACING = 1,
    MONGODB = 2,
    MYSQL = 4,
    REDIS = 8,
    POSTGRES = 16,
    BUNYAN = 32,
    WINSTON = 64,
    CONSOLE = 128,
}

export enum StatsbeatFeatureType {
    Feature,
    Instrumentation,
}

export enum StatsbeatNetworkCategory {
    Breeze,
    Quickpulse,
}

//Azure SDK Span Attributes
export const AzNamespace = "az.namespace";
export const MicrosoftEventHub = "Microsoft.EventHub";
export const MessageBusDestination = "message_bus.destination";

/**
 * AI enqueued time attribute.
 * @internal
 */
export const ENQUEUED_TIME = "enqueuedTime";
/**
 * AI time since enqueued attribute.
 * @internal
 */
export const TIME_SINCE_ENQUEUED = "timeSinceEnqueued";
