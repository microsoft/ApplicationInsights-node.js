import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import { ApplicationInsightsOptions, ExtendedMetricType } from "../../types";
import * as http from "http";

export function setAutoCollectPerformance(options: ApplicationInsightsOptions, value: boolean, collectExtendedMetrics?: any) {
    if (options) {
        options.enableAutoCollectPerformance = value;
        if (typeof collectExtendedMetrics === "object") {
            options.extendedMetrics = { ...collectExtendedMetrics }
        }
        if (collectExtendedMetrics === "boolean" || !collectExtendedMetrics) {
            options.extendedMetrics = {
                [ExtendedMetricType.gc]: value,
                [ExtendedMetricType.heap]: value,
                [ExtendedMetricType.loop]: value,
            }
        }
    }
}

export function setAutoCollectRequests(options: ApplicationInsightsOptions, value: boolean) {
    if (options) {
        if (value === false) {
            options.instrumentationOptions = {
                http: {
                    ...options.instrumentationOptions?.http,
                    enabled: true,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ignoreIncomingRequestHook: (request: http.RequestOptions) => true,
                } as HttpInstrumentationConfig
            };
        } else {
            options.instrumentationOptions = {
                http: {
                    ...options.instrumentationOptions?.http,
                    enabled: true,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ignoreIncomingRequestHook: (request: http.RequestOptions) => false,
                } as HttpInstrumentationConfig
            };
        }
    }
}

export function setAutoCollectDependencies(options: ApplicationInsightsOptions, value: boolean) {
    if (options) {
        if (value === false) {
            options.instrumentationOptions = {
                http: {
                    ...options.instrumentationOptions?.http,
                    enabled: true,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ignoreOutgoingRequestHook: (request: http.RequestOptions) => true,
                } as HttpInstrumentationConfig
            };
        } else {
            options.instrumentationOptions = {
                http: {
                    ...options.instrumentationOptions?.http,
                    enabled: true,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ignoreOutgoingRequestHook: (request: http.RequestOptions) => false,
                } as HttpInstrumentationConfig
            };
        }
    }
}

export function setAutoCollectConsole(options: ApplicationInsightsOptions, value: boolean, collectConsoleLog = false) {
    if (options) {
        options.logInstrumentations = {
            bunyan: { enabled: value },
            winston: { enabled: value },
            console: { enabled: collectConsoleLog },
        }
    }
}

export function enableAutoCollectExternalLoggers(options: ApplicationInsightsOptions, value: boolean) {
    options.logInstrumentations = {
        ...options.logInstrumentations,
        winston: { enabled: value },
        bunyan: { enabled: value },
    }
}

export function enableAutoCollectConsole(options: ApplicationInsightsOptions, value: boolean) {
    options.logInstrumentations = {
        ...options.logInstrumentations,
        console: { enabled: value },
    }
}

export function enableAutoCollectExtendedMetrics(options: ApplicationInsightsOptions, value: boolean) {
    options.extendedMetrics = {
        [ExtendedMetricType.gc]: value,
        [ExtendedMetricType.heap]: value,
        [ExtendedMetricType.loop]: value,
    }
}

export function setMaxBatchIntervalMs(options: ApplicationInsightsOptions, value: number) {
    options.otlpTraceExporterConfig = { ...options.otlpTraceExporterConfig, timeoutMillis: value };
    options.otlpMetricExporterConfig = { ...options.otlpMetricExporterConfig, timeoutMillis: value };
    options.otlpLogExporterConfig = { ...options.otlpLogExporterConfig, timeoutMillis: value };
}

export function setProxyUrl(options: ApplicationInsightsOptions, proxyUrlString: string) {
    const proxyUrl = new URL(proxyUrlString);
    options.azureMonitorExporterConfig.proxyOptions = {
        host: proxyUrl.hostname,
        port: Number(proxyUrl.port),
    }
}
