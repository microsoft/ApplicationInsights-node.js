// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { RequestOptions } from "https";
import { Meter } from "@opentelemetry/api-metrics";
import { HttpMetricsInstrumentationConfig } from "../types";
import { HttpMetricsInstrumentation } from "../httpMetricsInstrumentation";
import { ProcessMetrics } from "../processMetrics";
import { ExceptionMetrics } from "../exceptionMetrics";
import { TraceMetrics } from "../traceMetrics";
import { DependencyMetrics } from "../dependencyMetrics";
import { RequestMetrics } from "../requestMetrics";


export class PerformanceCounterMetricsHandler {
    private _meter: Meter;
    private _exceptionMetrics: ExceptionMetrics;
    private _httpMetrics: HttpMetricsInstrumentation;
    private _traceMetrics: TraceMetrics;
    private _processMetrics: ProcessMetrics;
    private _dependencyMetrics: DependencyMetrics;
    private _requestMetrics: RequestMetrics;

    constructor(meter: Meter) {
        this._meter = meter;
        // Add view to filter unwanted metrics
        this._processMetrics = new ProcessMetrics(this._meter);
        this._exceptionMetrics = new ExceptionMetrics(this._meter);
        this._traceMetrics = new TraceMetrics(this._meter);
        const httpMetricsConfig: HttpMetricsInstrumentationConfig = {
            ignoreOutgoingRequestHook: (request: RequestOptions) => {
                if (request.headers && request.headers["user-agent"]) {
                    return request.headers["user-agent"].toString().indexOf("azsdk-js-monitor-opentelemetry-exporter") > -1;
                }
                return false;
            }
        };
        this._httpMetrics = new HttpMetricsInstrumentation(httpMetricsConfig);
        this._dependencyMetrics = new DependencyMetrics(this._meter, this._httpMetrics);
        this._requestMetrics = new RequestMetrics(this._meter, this._httpMetrics);
    }

    public enable(isEnabled: boolean) {
        this._processMetrics.enable(isEnabled);
        this._traceMetrics.enable(isEnabled);
        this._exceptionMetrics.enable(isEnabled);
        this._dependencyMetrics.enable(isEnabled);
        this._requestMetrics.enable(isEnabled);
    }

    public getHttpMetricsInstrumentation(): HttpMetricsInstrumentation {
        return this._httpMetrics;
    }

    public getExceptionMetrics(): ExceptionMetrics {
        return this._exceptionMetrics;
    }

    public getTraceMetrics(): TraceMetrics {
        return this._traceMetrics;
    }

    public getProcessMetrics(): ProcessMetrics {
        return this._processMetrics;
    }

    public getRequestMetrics(): RequestMetrics {
        return this._requestMetrics;
    }

    public getDependencyMetrics(): DependencyMetrics {
        return this._dependencyMetrics;
    }
}
