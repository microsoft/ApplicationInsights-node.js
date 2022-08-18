import { Meter } from "@opentelemetry/api-metrics";
import { RequestOptions } from "https";
import { ExceptionMetrics } from "../exceptionMetrics";
import { HttpMetricsInstrumentation } from "../httpMetricsInstrumentation";
import { ProcessMetrics } from "../processMetrics";
import { TraceMetrics } from "../traceMetrics";
import { HttpMetricsInstrumentationConfig } from "../types";


export class LiveMetricsHandler {
    private _meter: Meter;
    private _exceptionMetrics: ExceptionMetrics;
    private _httpMetrics: HttpMetricsInstrumentation;
    private _traceMetrics: TraceMetrics;
    private _processMetrics: ProcessMetrics;

    constructor(meter: Meter) {
        this._meter = meter;
        // TODO: Add view to filter unwanted metrics

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
    }

    public enable(isEnabled: boolean) {
        this._processMetrics.enable(isEnabled);
        this._exceptionMetrics.enable(isEnabled);
        this._traceMetrics.enable(isEnabled);
        // TODO: Enable/Disable instrumentation
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
}
