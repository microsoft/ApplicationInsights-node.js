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
                    ignoreIncomingRequestHook: (request: http.IncomingMessage) => true,
                } as HttpInstrumentationConfig
            };
        } else {
            options.instrumentationOptions = {
                http: {
                    ...options.instrumentationOptions?.http,
                    enabled: true,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ignoreIncomingRequestHook: (request: http.IncomingMessage) => false,
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

export function setAutoCollectConsole(options: ApplicationInsightsOptions, value: boolean, enableConsole: boolean, collectConsoleLog = false) {
    if (options) {
        options.logInstrumentationOptions = {
            bunyan: { enabled: value },
            winston: { enabled: value },
            console: { enabled: collectConsoleLog },
        }
    }
}

export function enableAutoCollectExternalLoggers(options: ApplicationInsightsOptions, value: boolean) {
    options.logInstrumentationOptions = {
        ...options.logInstrumentationOptions,
        winston: { enabled: value },
        bunyan: { enabled: value },
    }
}

export function enableAutoCollectConsole(options: ApplicationInsightsOptions, value: boolean) {
    options.logInstrumentationOptions = {
        ...options.logInstrumentationOptions,
        console: { enabled: value },
    }
}

export function setExtendedMetricDisablers(options: ApplicationInsightsOptions, disablers: string) {
    const extendedMetricDisablers: string[] = disablers.split(",");
    for (const extendedMetricDisabler of extendedMetricDisablers) {
        if (extendedMetricDisabler === "gc") {
            options.extendedMetrics = {
                ...options.extendedMetrics,
                [ExtendedMetricType.gc]: false
            };
        }
        if (extendedMetricDisabler === "heap") {
            options.extendedMetrics = {
                ...options.extendedMetrics,
                [ExtendedMetricType.heap]: false
            };
        }
        if (extendedMetricDisabler === "loop") {
            options.extendedMetrics = {
                ...options.extendedMetrics,
                [ExtendedMetricType.loop]: false
            };
        }
    }
}
