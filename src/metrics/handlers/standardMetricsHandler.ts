import { AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { Attributes, Meter, SpanKind } from "@opentelemetry/api";
import {
    DropAggregation,
    MeterProvider,
    MeterProviderOptions,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
    View,
} from "@opentelemetry/sdk-metrics";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { SemanticAttributes, SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ApplicationInsightsConfig } from "../../shared";
import { DependencyMetrics } from "../collection/dependencyMetrics";
import { ExceptionMetrics } from "../collection/exceptionMetrics";
import { RequestMetrics } from "../collection/requestMetrics";
import { TraceMetrics } from "../collection/traceMetrics";
import { IMetricDependencyDimensions, IMetricRequestDimensions, IMetricTraceDimensions, IStandardMetricBaseDimensions, MetricName, StandardMetric, StandardMetricIds } from "../types";


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

    public recordException(dimensions: IMetricTraceDimensions): void {
        dimensions.metricId = StandardMetricIds.EXCEPTION_COUNT;
        this._exceptionMetrics.countException(dimensions);
    }

    public recordTrace(dimensions: IMetricTraceDimensions): void {
        dimensions.metricId = StandardMetricIds.TRACE_COUNT;
        this._traceMetrics.countTrace(dimensions);
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

    private _getStandardMetricRequestDimensions(span: ReadableSpan): Attributes {
        const dimensions: IMetricRequestDimensions = this._getStandardMetricBaseDimensions(span);
        dimensions.metricId = StandardMetricIds.REQUEST_DURATION;
        const statusCode = String(span.attributes["http.status_code"]);
        dimensions.requestResultCode = statusCode;
        dimensions.requestSuccess = statusCode === "200" ? "True" : "False";
        return dimensions as Attributes;
    }

    private _getStandardMetricDependencyDimensions(span: ReadableSpan): Attributes {
        const dimensions: IMetricDependencyDimensions = this._getStandardMetricBaseDimensions(span);
        dimensions.metricId = StandardMetricIds.DEPENDENCY_DURATION;
        const statusCode = String(span.attributes["http.status_code"]);
        dimensions.dependencyTarget = this._getDependencyTarget(span.attributes);
        dimensions.dependencyResultCode = statusCode;
        dimensions.dependencyType = "http";
        dimensions.dependencySuccess = statusCode === "200" ? "True" : "False";
        return dimensions as Attributes;
    }

    private _getStandardMetricBaseDimensions(span: ReadableSpan): IStandardMetricBaseDimensions {
        const dimensions: IStandardMetricBaseDimensions = {};
        dimensions.IsAutocollected = "True";
        if (span.resource) {
            const spanResourceAttributes = span.resource.attributes;
            const serviceName = spanResourceAttributes[SemanticResourceAttributes.SERVICE_NAME];
            const serviceNamespace = spanResourceAttributes[SemanticResourceAttributes.SERVICE_NAMESPACE];
            if (serviceName) {
                if (serviceNamespace) {
                    dimensions.cloudRoleName = `${serviceNamespace}.${serviceName}`;
                } else {
                    dimensions.cloudRoleName = String(serviceName);
                }
            }
            const serviceInstanceId = spanResourceAttributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID];
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
