import Contracts = require("./Contracts");
export declare const APPLICATION_INSIGHTS_SDK_VERSION = "2.5.1";
export declare const DEFAULT_BREEZE_ENDPOINT = "https://dc.services.visualstudio.com";
export declare const DEFAULT_LIVEMETRICS_ENDPOINT = "https://rt.services.visualstudio.com";
export declare const DEFAULT_LIVEMETRICS_HOST = "rt.services.visualstudio.com";
export declare enum QuickPulseCounter {
    COMMITTED_BYTES = "\\Memory\\Committed Bytes",
    PROCESSOR_TIME = "\\Processor(_Total)\\% Processor Time",
    REQUEST_RATE = "\\ApplicationInsights\\Requests/Sec",
    REQUEST_FAILURE_RATE = "\\ApplicationInsights\\Requests Failed/Sec",
    REQUEST_DURATION = "\\ApplicationInsights\\Request Duration",
    DEPENDENCY_RATE = "\\ApplicationInsights\\Dependency Calls/Sec",
    DEPENDENCY_FAILURE_RATE = "\\ApplicationInsights\\Dependency Calls Failed/Sec",
    DEPENDENCY_DURATION = "\\ApplicationInsights\\Dependency Call Duration",
    EXCEPTION_RATE = "\\ApplicationInsights\\Exceptions/Sec"
}
export declare enum PerformanceCounter {
    PRIVATE_BYTES = "\\Process(??APP_WIN32_PROC??)\\Private Bytes",
    AVAILABLE_BYTES = "\\Memory\\Available Bytes",
    PROCESSOR_TIME = "\\Processor(_Total)\\% Processor Time",
    PROCESS_TIME = "\\Process(??APP_WIN32_PROC??)\\% Processor Time",
    REQUEST_RATE = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec",
    REQUEST_DURATION = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time"
}
export declare enum MetricId {
    REQUESTS_DURATION = "requests/duration",
    DEPENDENCIES_DURATION = "dependencies/duration",
    EXCEPTIONS_COUNT = "exceptions/count",
    TRACES_COUNT = "traces/count"
}
/**
 * Map a PerformanceCounter/QuickPulseCounter to a QuickPulseCounter. If no mapping exists, mapping is *undefined*
 */
export declare const PerformanceToQuickPulseCounter: {
    [key: string]: QuickPulseCounter;
};
export declare type QuickPulseDocumentType = "Event" | "Exception" | "Trace" | "Metric" | "Request" | "RemoteDependency" | "Availability" | "PageView";
export declare type QuickPulseType = "EventTelemetryDocument" | "ExceptionTelemetryDocument" | "TraceTelemetryDocument" | "MetricTelemetryDocument" | "RequestTelemetryDocument" | "DependencyTelemetryDocument" | "AvailabilityTelemetryDocument" | "PageViewTelemetryDocument";
export declare const QuickPulseDocumentType: {
    [key in Contracts.TelemetryTypeKeys]: QuickPulseDocumentType;
};
export declare const QuickPulseType: {
    [key in Contracts.TelemetryTypeKeys]: QuickPulseType;
};
export declare const TelemetryTypeStringToQuickPulseType: {
    [key in Contracts.TelemetryTypeValues]: QuickPulseType;
};
export declare const TelemetryTypeStringToQuickPulseDocumentType: {
    [key in Contracts.TelemetryTypeValues]: QuickPulseDocumentType;
};
export declare const DependencyTypeName: {
    Grpc: string;
    Http: string;
    InProc: string;
    Sql: string;
    QueueMessage: string;
};
export declare const HeartBeatMetricName = "HeartbeatState";
export declare const StatsbeatTelemetryName = "Statsbeat";
export declare const StatsbeatResourceProvider: {
    appsvc: string;
    functions: string;
    vm: string;
    unknown: string;
};
export declare const StatsbeatAttach: {
    codeless: string;
    sdk: string;
};
export declare const StatsbeatCounter: {
    REQUEST_SUCCESS: string;
    REQUEST_FAILURE: string;
    REQUEST_DURATION: string;
    RETRY_COUNT: string;
    THROTTLE_COUNT: string;
    EXCEPTION_COUNT: string;
    ATTACH: string;
    FEATURE: string;
};
export declare enum StatsbeatFeature {
    NONE = 0,
    DISK_RETRY = 1,
    AAD_HANDLING = 2,
    WEB_SNIPPET = 4
}
export declare enum StatsbeatInstrumentation {
    NONE = 0,
    AZURE_CORE_TRACING = 1,
    MONGODB = 2,
    MYSQL = 4,
    REDIS = 8,
    POSTGRES = 16,
    BUNYAN = 32,
    WINSTON = 64,
    CONSOLE = 128
}
export declare enum StatsbeatFeatureType {
    Feature = 0,
    Instrumentation = 1
}
export declare enum StatsbeatNetworkCategory {
    Breeze = 0,
    Quickpulse = 1
}
export declare const AzNamespace = "az.namespace";
export declare const MicrosoftEventHub = "Microsoft.EventHub";
export declare const MessageBusDestination = "message_bus.destination";
/**
 * AI enqueued time attribute.
 * @internal
 */
export declare const ENQUEUED_TIME = "enqueuedTime";
/**
 * AI time since enqueued attribute.
 * @internal
 */
export declare const TIME_SINCE_ENQUEUED = "timeSinceEnqueued";
export declare const WEB_INSTRUMENTATION_DEFAULT_SOURCE = "https://js.monitor.azure.com/scripts/b/ai";
export declare const WEB_INSTRUMENTATION_DEPRECATED_SOURCE = "https://az416426.vo.msecnd.net/scripts/b/ai";
