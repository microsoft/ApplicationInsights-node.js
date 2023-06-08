import { AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { Attributes, Meter, SpanKind } from "@opentelemetry/api";
import { LogRecord } from "@opentelemetry/sdk-logs";
import {
    DropAggregation,
    MeterProvider,
    MeterProviderOptions,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
    View,
} from "@opentelemetry/sdk-metrics";
import { ReadableSpan, Span, TimedEvent } from "@opentelemetry/sdk-trace-base";
import { SemanticAttributes, SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ApplicationInsightsConfig } from "../../shared";
import { DependencyMetrics } from "../collection/dependencyMetrics";
import { ExceptionMetrics } from "../collection/exceptionMetrics";
import { RequestMetrics } from "../collection/requestMetrics";
import { TraceMetrics } from "../collection/traceMetrics";
import { IMetricDependencyDimensions, IMetricRequestDimensions, IStandardMetricBaseDimensions, MetricName, StandardMetric, StandardMetricIds } from "../types";
import { Resource } from "@opentelemetry/resources";


export class StandardMetricsHandler {
    private _config: ApplicationInsightsConfig;
    private _collectionInterval = 60000; // 60 seconds
    private _meterProvider: MeterProvider;
    private _azureMonitorExporter: AzureMonitorMetricExporter;
    private _otlpExporter: OTLPMetricExporter;
    private _meter: Meter;
    private _dependencyMetrics: DependencyMetrics;
    private _requestMetrics: RequestMetrics;
    private _exceptionMetrics: ExceptionMetrics;
    private _traceMetrics: TraceMetrics;

    constructor(config: ApplicationInsightsConfig, options?: { collectionInterval: number }) {
        this._config = config;
        const meterProviderConfig: MeterProviderOptions = {
            resource: this._config.resource,
            views: this._getViews(),
        };
        this._meterProvider = new MeterProvider(meterProviderConfig);
        this._azureMonitorExporter = new AzureMonitorMetricExporter(this._config.azureMonitorExporterConfig);
        const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
            exporter: this._azureMonitorExporter,
            exportIntervalMillis: options?.collectionInterval || this._collectionInterval,
        };
        const azureMonitorMetricReader = new PeriodicExportingMetricReader(metricReaderOptions);
        this._meterProvider.addMetricReader(azureMonitorMetricReader);

        if (config.otlpMetricExporterConfig?.enabled) {
            this._otlpExporter = new OTLPMetricExporter(config.otlpMetricExporterConfig.baseConfig);
            const otlpMetricReader = new PeriodicExportingMetricReader({
                exporter: this._otlpExporter,
                exportIntervalMillis: options?.collectionInterval || this._collectionInterval,
            });
            this._meterProvider.addMetricReader(otlpMetricReader);
        }

        this._meter = this._meterProvider.getMeter("ApplicationInsightsStandardMetricsMeter");
        this._requestMetrics = new RequestMetrics(this._meter);
        this._dependencyMetrics = new DependencyMetrics(this._meter);
        this._exceptionMetrics = new ExceptionMetrics(this._meter);
        this._traceMetrics = new TraceMetrics(this._meter);
    }

    /** 
  * @deprecated This should not be used
  */
    public start() {
        // No Op
    }

    public async flush(): Promise<void> {
        await this._meterProvider.forceFlush();
    }

    public shutdown() {
        this._dependencyMetrics.shutdown();
        this._exceptionMetrics.shutdown();
        this._traceMetrics.shutdown();
        this._meterProvider.shutdown();
    }

    public recordLog(logRecord: LogRecord): void {
        const dimensions = this._getStandardMetricBaseDimensions(logRecord.resource);
        if (logRecord.attributes[SemanticAttributes.EXCEPTION_MESSAGE] || logRecord.attributes[SemanticAttributes.EXCEPTION_TYPE]) {
            dimensions.metricId = StandardMetricIds.EXCEPTION_COUNT;
            this._exceptionMetrics.countException(dimensions);
        }
        else {
            dimensions.metricId = StandardMetricIds.TRACE_COUNT;
            this._traceMetrics.countTrace(dimensions);
        }
    }


    public recordSpan(span: ReadableSpan): void {
        const durationMs = span.duration[0];
        if (span.kind === SpanKind.SERVER) {
            this._requestMetrics.getDurationHistogram().record(durationMs, this._getStandardMetricRequestDimensions(span));
        }
        else {
            this._dependencyMetrics.getDurationHistogram().record(durationMs, this._getStandardMetricDependencyDimensions(span));
        }
    }

    public recordSpanEvents(span: ReadableSpan): void {
        if (span.events) {
            span.events.forEach((event: TimedEvent) => {
                const dimensions = this._getStandardMetricBaseDimensions(span.resource);
                if (event.name === "exception") {
                    dimensions.metricId = StandardMetricIds.EXCEPTION_COUNT;
                    this._exceptionMetrics.countException(dimensions);
                } else {
                    dimensions.metricId = StandardMetricIds.TRACE_COUNT;
                    this._traceMetrics.countTrace(dimensions);
                }
            });
        }
    }

    public markLogsAsProcceseded(logRecord: LogRecord): void {
        if (this._config.enableAutoCollectStandardMetrics) {
            // If Application Insights Legacy logs
            const baseType = logRecord.attributes["_MS.baseType"];
            if (baseType) {
                if (baseType === "ExceptionData") {
                    logRecord.setAttribute("_MS.ProcessedByMetricExtractors", "(Name:'Exceptions', Ver:'1.1')");
                }
                else if (baseType === "MessageData") {
                    logRecord.setAttribute("_MS.ProcessedByMetricExtractors", "(Name:'Traces', Ver:'1.1')");
                }
            }
            else {
                if (logRecord.attributes[SemanticAttributes.EXCEPTION_MESSAGE] || logRecord.attributes[SemanticAttributes.EXCEPTION_TYPE]) {
                    logRecord.setAttribute("_MS.ProcessedByMetricExtractors", "(Name:'Exceptions', Ver:'1.1')");
                } else {
                    logRecord.setAttribute("_MS.ProcessedByMetricExtractors", "(Name:'Traces', Ver:'1.1')");
                }
            }
        }
    }

    public markSpanAsProcceseded(span: Span): void {
        if (this._config.enableAutoCollectStandardMetrics) {
            if (span.kind === SpanKind.CLIENT) {
                span.setAttributes({
                    "_MS.ProcessedByMetricExtractors": "(Name:'Dependencies', Ver:'1.1')",
                });
            } else if (span.kind === SpanKind.SERVER) {
                span.setAttributes({
                    "_MS.ProcessedByMetricExtractors": "(Name:'Requests', Ver:'1.1')",
                });
            }
        }
    }

    private _getStandardMetricRequestDimensions(span: ReadableSpan): Attributes {
        const dimensions: IMetricRequestDimensions = this._getStandardMetricBaseDimensions(span.resource);
        dimensions.metricId = StandardMetricIds.REQUEST_DURATION;
        const statusCode = String(span.attributes["http.status_code"]);
        dimensions.requestResultCode = statusCode;
        dimensions.requestSuccess = statusCode === "200" ? "True" : "False";
        return dimensions as Attributes;
    }

    private _getStandardMetricDependencyDimensions(span: ReadableSpan): Attributes {
        const dimensions: IMetricDependencyDimensions = this._getStandardMetricBaseDimensions(span.resource);
        dimensions.metricId = StandardMetricIds.DEPENDENCY_DURATION;
        const statusCode = String(span.attributes["http.status_code"]);
        dimensions.dependencyTarget = this._getDependencyTarget(span.attributes);
        dimensions.dependencyResultCode = statusCode;
        dimensions.dependencyType = "http";
        dimensions.dependencySuccess = statusCode === "200" ? "True" : "False";
        return dimensions as Attributes;
    }

    private _getStandardMetricBaseDimensions(resource: Resource): IStandardMetricBaseDimensions {
        const dimensions: IStandardMetricBaseDimensions = {};
        dimensions.IsAutocollected = "True";
        if (resource) {
            const resourceAttributes = resource.attributes;
            const serviceName = resourceAttributes[SemanticResourceAttributes.SERVICE_NAME];
            const serviceNamespace = resourceAttributes[SemanticResourceAttributes.SERVICE_NAMESPACE];
            if (serviceName) {
                if (serviceNamespace) {
                    dimensions.cloudRoleName = `${serviceNamespace}.${serviceName}`;
                } else {
                    dimensions.cloudRoleName = String(serviceName);
                }
            }
            const serviceInstanceId = resourceAttributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID];
            dimensions.cloudRoleInstance = String(serviceInstanceId);
        }
        return dimensions;
    }

    private _getDependencyTarget(attributes: Attributes): string {
        if (!attributes) {
            return "";
        }
        const peerService = attributes[SemanticAttributes.PEER_SERVICE];
        const httpHost = attributes[SemanticAttributes.HTTP_HOST];
        const httpUrl = attributes[SemanticAttributes.HTTP_URL];
        const netPeerName = attributes[SemanticAttributes.NET_PEER_NAME];
        const netPeerIp = attributes[SemanticAttributes.NET_PEER_IP];
        if (peerService) {
            return String(peerService);
        } else if (httpHost) {
            return String(httpHost);
        } else if (httpUrl) {
            return String(httpUrl);
        } else if (netPeerName) {
            return String(netPeerName);
        } else if (netPeerIp) {
            return String(netPeerIp);
        }
        return "";
    }

    private _getViews(): View[] {
        const views = [];
        views.push(
            new View({
                name: StandardMetric.HTTP_REQUEST_DURATION,
                instrumentName: MetricName.REQUEST_DURATION
            })
        );
        views.push(
            new View({
                name: StandardMetric.HTTP_DEPENDENCY_DURATION,
                instrumentName: MetricName.DEPENDENCY_DURATION,
            })
        );
        views.push(
            new View({
                name: StandardMetric.EXCEPTION_COUNT,
                instrumentName: MetricName.EXCEPTION_COUNT,
            })
        );
        views.push(
            new View({
                name: StandardMetric.TRACE_COUNT,
                instrumentName: MetricName.TRACE_COUNT,
            })
        );
        // Ignore list
        views.push(
            new View({
                instrumentName: MetricName.REQUEST_RATE,
                aggregation: new DropAggregation(),
            })
        );
        views.push(
            new View({
                instrumentName: MetricName.REQUEST_FAILURE_RATE,
                aggregation: new DropAggregation(),
            })
        );
        views.push(
            new View({
                instrumentName: MetricName.DEPENDENCY_RATE,
                aggregation: new DropAggregation(),
            })
        );
        views.push(
            new View({
                instrumentName: MetricName.DEPENDENCY_FAILURE_RATE,
                aggregation: new DropAggregation(),
            })
        );
        views.push(
            new View({
                instrumentName: MetricName.EXCEPTION_RATE,
                aggregation: new DropAggregation(),
            })
        );
        views.push(
            new View({
                instrumentName: MetricName.TRACE_RATE,
                aggregation: new DropAggregation(),
            })
        );
        return views;
    }
}
