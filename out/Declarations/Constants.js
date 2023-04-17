"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEB_INSTRUMENTATION_DEPRECATED_SOURCE = exports.WEB_INSTRUMENTATION_DEFAULT_SOURCE = exports.TIME_SINCE_ENQUEUED = exports.ENQUEUED_TIME = exports.MessageBusDestination = exports.MicrosoftEventHub = exports.AzNamespace = exports.StatsbeatNetworkCategory = exports.StatsbeatFeatureType = exports.StatsbeatInstrumentation = exports.StatsbeatFeature = exports.StatsbeatCounter = exports.StatsbeatAttach = exports.StatsbeatResourceProvider = exports.StatsbeatTelemetryName = exports.HeartBeatMetricName = exports.DependencyTypeName = exports.TelemetryTypeStringToQuickPulseDocumentType = exports.TelemetryTypeStringToQuickPulseType = exports.QuickPulseType = exports.QuickPulseDocumentType = exports.PerformanceToQuickPulseCounter = exports.MetricId = exports.PerformanceCounter = exports.QuickPulseCounter = exports.DEFAULT_LIVEMETRICS_HOST = exports.DEFAULT_LIVEMETRICS_ENDPOINT = exports.DEFAULT_BREEZE_ENDPOINT = exports.APPLICATION_INSIGHTS_SDK_VERSION = void 0;
exports.APPLICATION_INSIGHTS_SDK_VERSION = "2.5.1";
exports.DEFAULT_BREEZE_ENDPOINT = "https://dc.services.visualstudio.com";
exports.DEFAULT_LIVEMETRICS_ENDPOINT = "https://rt.services.visualstudio.com";
exports.DEFAULT_LIVEMETRICS_HOST = "rt.services.visualstudio.com";
var QuickPulseCounter;
(function (QuickPulseCounter) {
    // Memory
    QuickPulseCounter["COMMITTED_BYTES"] = "\\Memory\\Committed Bytes";
    // CPU
    QuickPulseCounter["PROCESSOR_TIME"] = "\\Processor(_Total)\\% Processor Time";
    // Request
    QuickPulseCounter["REQUEST_RATE"] = "\\ApplicationInsights\\Requests/Sec";
    QuickPulseCounter["REQUEST_FAILURE_RATE"] = "\\ApplicationInsights\\Requests Failed/Sec";
    QuickPulseCounter["REQUEST_DURATION"] = "\\ApplicationInsights\\Request Duration";
    // Dependency
    QuickPulseCounter["DEPENDENCY_RATE"] = "\\ApplicationInsights\\Dependency Calls/Sec";
    QuickPulseCounter["DEPENDENCY_FAILURE_RATE"] = "\\ApplicationInsights\\Dependency Calls Failed/Sec";
    QuickPulseCounter["DEPENDENCY_DURATION"] = "\\ApplicationInsights\\Dependency Call Duration";
    // Exception
    QuickPulseCounter["EXCEPTION_RATE"] = "\\ApplicationInsights\\Exceptions/Sec";
})(QuickPulseCounter = exports.QuickPulseCounter || (exports.QuickPulseCounter = {}));
var PerformanceCounter;
(function (PerformanceCounter) {
    // Memory
    PerformanceCounter["PRIVATE_BYTES"] = "\\Process(??APP_WIN32_PROC??)\\Private Bytes";
    PerformanceCounter["AVAILABLE_BYTES"] = "\\Memory\\Available Bytes";
    // CPU
    PerformanceCounter["PROCESSOR_TIME"] = "\\Processor(_Total)\\% Processor Time";
    PerformanceCounter["PROCESS_TIME"] = "\\Process(??APP_WIN32_PROC??)\\% Processor Time";
    // Requests
    PerformanceCounter["REQUEST_RATE"] = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec";
    PerformanceCounter["REQUEST_DURATION"] = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time";
})(PerformanceCounter = exports.PerformanceCounter || (exports.PerformanceCounter = {}));
var MetricId;
(function (MetricId) {
    MetricId["REQUESTS_DURATION"] = "requests/duration";
    MetricId["DEPENDENCIES_DURATION"] = "dependencies/duration";
    MetricId["EXCEPTIONS_COUNT"] = "exceptions/count";
    MetricId["TRACES_COUNT"] = "traces/count";
})(MetricId = exports.MetricId || (exports.MetricId = {}));
/**
 * Map a PerformanceCounter/QuickPulseCounter to a QuickPulseCounter. If no mapping exists, mapping is *undefined*
 */
exports.PerformanceToQuickPulseCounter = (_a = {},
    _a[PerformanceCounter.PROCESSOR_TIME] = QuickPulseCounter.PROCESSOR_TIME,
    _a[PerformanceCounter.REQUEST_RATE] = QuickPulseCounter.REQUEST_RATE,
    _a[PerformanceCounter.REQUEST_DURATION] = QuickPulseCounter.REQUEST_DURATION,
    // Remap quick pulse only counters
    _a[QuickPulseCounter.COMMITTED_BYTES] = QuickPulseCounter.COMMITTED_BYTES,
    _a[QuickPulseCounter.REQUEST_FAILURE_RATE] = QuickPulseCounter.REQUEST_FAILURE_RATE,
    _a[QuickPulseCounter.DEPENDENCY_RATE] = QuickPulseCounter.DEPENDENCY_RATE,
    _a[QuickPulseCounter.DEPENDENCY_FAILURE_RATE] = QuickPulseCounter.DEPENDENCY_FAILURE_RATE,
    _a[QuickPulseCounter.DEPENDENCY_DURATION] = QuickPulseCounter.DEPENDENCY_DURATION,
    _a[QuickPulseCounter.EXCEPTION_RATE] = QuickPulseCounter.EXCEPTION_RATE,
    _a);
exports.QuickPulseDocumentType = {
    Event: "Event",
    Exception: "Exception",
    Trace: "Trace",
    Metric: "Metric",
    Request: "Request",
    Dependency: "RemoteDependency",
    Availability: "Availability",
    PageView: "PageView"
};
exports.QuickPulseType = {
    Event: "EventTelemetryDocument",
    Exception: "ExceptionTelemetryDocument",
    Trace: "TraceTelemetryDocument",
    Metric: "MetricTelemetryDocument",
    Request: "RequestTelemetryDocument",
    Dependency: "DependencyTelemetryDocument",
    Availability: "AvailabilityTelemetryDocument",
    PageView: "PageViewTelemetryDocument"
};
exports.TelemetryTypeStringToQuickPulseType = {
    EventData: exports.QuickPulseType.Event,
    ExceptionData: exports.QuickPulseType.Exception,
    MessageData: exports.QuickPulseType.Trace,
    MetricData: exports.QuickPulseType.Metric,
    RequestData: exports.QuickPulseType.Request,
    RemoteDependencyData: exports.QuickPulseType.Dependency,
    AvailabilityData: exports.QuickPulseType.Availability,
    PageViewData: exports.QuickPulseType.PageView
};
exports.TelemetryTypeStringToQuickPulseDocumentType = {
    EventData: exports.QuickPulseDocumentType.Event,
    ExceptionData: exports.QuickPulseDocumentType.Exception,
    MessageData: exports.QuickPulseDocumentType.Trace,
    MetricData: exports.QuickPulseDocumentType.Metric,
    RequestData: exports.QuickPulseDocumentType.Request,
    RemoteDependencyData: exports.QuickPulseDocumentType.Dependency,
    AvailabilityData: exports.QuickPulseDocumentType.Availability,
    PageViewData: exports.QuickPulseDocumentType.PageView
};
exports.DependencyTypeName = {
    Grpc: "GRPC",
    Http: "HTTP",
    InProc: "InProc",
    Sql: "SQL",
    QueueMessage: "Queue Message"
};
exports.HeartBeatMetricName = "HeartbeatState";
exports.StatsbeatTelemetryName = "Statsbeat";
exports.StatsbeatResourceProvider = {
    appsvc: "appsvc",
    functions: "functions",
    vm: "vm",
    unknown: "unknown"
};
exports.StatsbeatAttach = {
    codeless: "codeless",
    sdk: "sdk"
};
exports.StatsbeatCounter = {
    REQUEST_SUCCESS: "Request Success Count",
    REQUEST_FAILURE: "Request Failure Count",
    REQUEST_DURATION: "Request Duration",
    RETRY_COUNT: "Retry Count",
    THROTTLE_COUNT: "Throttle Count",
    EXCEPTION_COUNT: "Exception Count",
    ATTACH: "Attach",
    FEATURE: "Feature"
};
var StatsbeatFeature;
(function (StatsbeatFeature) {
    StatsbeatFeature[StatsbeatFeature["NONE"] = 0] = "NONE";
    StatsbeatFeature[StatsbeatFeature["DISK_RETRY"] = 1] = "DISK_RETRY";
    StatsbeatFeature[StatsbeatFeature["AAD_HANDLING"] = 2] = "AAD_HANDLING";
    StatsbeatFeature[StatsbeatFeature["WEB_SNIPPET"] = 4] = "WEB_SNIPPET";
})(StatsbeatFeature = exports.StatsbeatFeature || (exports.StatsbeatFeature = {}));
var StatsbeatInstrumentation;
(function (StatsbeatInstrumentation) {
    StatsbeatInstrumentation[StatsbeatInstrumentation["NONE"] = 0] = "NONE";
    StatsbeatInstrumentation[StatsbeatInstrumentation["AZURE_CORE_TRACING"] = 1] = "AZURE_CORE_TRACING";
    StatsbeatInstrumentation[StatsbeatInstrumentation["MONGODB"] = 2] = "MONGODB";
    StatsbeatInstrumentation[StatsbeatInstrumentation["MYSQL"] = 4] = "MYSQL";
    StatsbeatInstrumentation[StatsbeatInstrumentation["REDIS"] = 8] = "REDIS";
    StatsbeatInstrumentation[StatsbeatInstrumentation["POSTGRES"] = 16] = "POSTGRES";
    StatsbeatInstrumentation[StatsbeatInstrumentation["BUNYAN"] = 32] = "BUNYAN";
    StatsbeatInstrumentation[StatsbeatInstrumentation["WINSTON"] = 64] = "WINSTON";
    StatsbeatInstrumentation[StatsbeatInstrumentation["CONSOLE"] = 128] = "CONSOLE";
})(StatsbeatInstrumentation = exports.StatsbeatInstrumentation || (exports.StatsbeatInstrumentation = {}));
var StatsbeatFeatureType;
(function (StatsbeatFeatureType) {
    StatsbeatFeatureType[StatsbeatFeatureType["Feature"] = 0] = "Feature";
    StatsbeatFeatureType[StatsbeatFeatureType["Instrumentation"] = 1] = "Instrumentation";
})(StatsbeatFeatureType = exports.StatsbeatFeatureType || (exports.StatsbeatFeatureType = {}));
var StatsbeatNetworkCategory;
(function (StatsbeatNetworkCategory) {
    StatsbeatNetworkCategory[StatsbeatNetworkCategory["Breeze"] = 0] = "Breeze";
    StatsbeatNetworkCategory[StatsbeatNetworkCategory["Quickpulse"] = 1] = "Quickpulse";
})(StatsbeatNetworkCategory = exports.StatsbeatNetworkCategory || (exports.StatsbeatNetworkCategory = {}));
//Azure SDK Span Attributes
exports.AzNamespace = "az.namespace";
exports.MicrosoftEventHub = "Microsoft.EventHub";
exports.MessageBusDestination = "message_bus.destination";
/**
 * AI enqueued time attribute.
 * @internal
 */
exports.ENQUEUED_TIME = "enqueuedTime";
/**
 * AI time since enqueued attribute.
 * @internal
 */
exports.TIME_SINCE_ENQUEUED = "timeSinceEnqueued";
exports.WEB_INSTRUMENTATION_DEFAULT_SOURCE = "https://js.monitor.azure.com/scripts/b/ai";
exports.WEB_INSTRUMENTATION_DEPRECATED_SOURCE = "https://az416426.vo.msecnd.net/scripts/b/ai";
//# sourceMappingURL=Constants.js.map