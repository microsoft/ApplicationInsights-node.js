import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import { ApplicationInsightsOptions, ExtendedMetricType } from "../../types";
import * as http from "http";

class ConfigHelper {
    static setAutoCollectPerformance(options: ApplicationInsightsOptions, value: boolean, collectExtendedMetrics?: any) {
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

    static setAutoCollectRequests(options: ApplicationInsightsOptions, value: boolean) {
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

    static setAutoCollectDependencies(options: ApplicationInsightsOptions, value: boolean) {
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

    static setAutoCollectConsole(options: ApplicationInsightsOptions, value: boolean, enableConsole: boolean, collectConsoleLog = false) {
        if (options) {
            options.logInstrumentations = {
                bunyan: { enabled: value },
                winston: { enabled: value },
                console: { enabled: collectConsoleLog },
            }
        }
    }
}

export = ConfigHelper;