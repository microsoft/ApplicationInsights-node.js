// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SpanOptions, context, SpanKind, SpanAttributes, SpanStatusCode } from "@opentelemetry/api";
import { Instrumentation, InstrumentationOption, registerInstrumentations } from "@opentelemetry/instrumentation";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor, BufferConfig, Tracer } from "@opentelemetry/sdk-trace-base";
import { AzureMonitorTraceExporter } from "@azure/monitor-opentelemetry-exporter";
import { HttpInstrumentation, HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";

import { Config } from "../Configuration/Config";
import * as  Contracts from "../../Declarations/Contracts";

export class TraceHandler {

    public tracerProvider: NodeTracerProvider;
    public tracer: Tracer;

    private _exporter: AzureMonitorTraceExporter;
    private _config: Config;
    private _instrumentations: InstrumentationOption[];
    private _disableInstrumentations: () => void;

    constructor(config: Config) {
        this._config = config;
        this._instrumentations = [];
        this.tracerProvider = new NodeTracerProvider();
        let ingestionEndpoint = this._config.endpointUrl.replace("/v2.1/track", "");
        let connectionString = `InstrumentationKey=${this._config.instrumentationKey};IngestionEndpoint=${ingestionEndpoint}`;
        this._exporter = new AzureMonitorTraceExporter({
            connectionString: connectionString
        });
        let bufferConfig: BufferConfig = {
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5000,
            exportTimeoutMillis: 30000,
            maxQueueSize: 2048
        };
        let spanProcessor = new BatchSpanProcessor(this._exporter, bufferConfig);
        this.tracerProvider.addSpanProcessor(spanProcessor);
    }

    public start() {
        // TODO: Update config name to enable auto collection of HTTP/HTTPs
        if (this._config.enableAutoCollectRequests || this._config.enableAutoCollectDependencies) {
            // TODO: Add other configurations
            // TODO: Maybe expose HttpInstrumentation so it can be updated before init
            const httpInstrumentationConfig: HttpInstrumentationConfig = {
                ignoreOutgoingUrls: [new RegExp(/dc.services.visualstudio.com/i)]
            };
            let httpInstrumentation = new HttpInstrumentation(httpInstrumentationConfig);
            this.addInstrumentation(httpInstrumentation);
        }

        // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
        this.tracerProvider.register();
        if (this._instrumentations.length > 0) {
            this.registerInstrumentations();
        }
        // TODO: Check for conflicts with multiple handlers available
        this.tracer = this.tracerProvider.getTracer("ApplicationInsightsTracer");
    }

    public addInstrumentation(instrumentation: Instrumentation) {
        this._instrumentations.push(instrumentation);
    }

    public registerInstrumentations() {
        this._disableInstrumentations = registerInstrumentations({
            tracerProvider: this.tracerProvider,
            instrumentations: this._instrumentations
        });
    }

    public disableInstrumentations() {
        if (this._disableInstrumentations) {
            this._disableInstrumentations();
        }
    }

    public trackRequest(telemetry: Contracts.RequestTelemetry & Contracts.Identified) {
        // TODO: Change context if ID is provided?
        const ctx = context.active();
        let attributes: SpanAttributes = {};
        attributes[SemanticAttributes.HTTP_METHOD] = "http";
        try {
            let url = new URL(telemetry.url);
            attributes[SemanticAttributes.HTTP_METHOD] = url.protocol;
        }
        catch (error) {// Ignore error
        }
        attributes[SemanticAttributes.HTTP_URL] = telemetry.url;
        attributes[SemanticAttributes.HTTP_STATUS_CODE] = telemetry.resultCode;
        let options: SpanOptions = {
            kind: SpanKind.SERVER,
            attributes: attributes
        };
        let span: any = this.tracer.startSpan(telemetry.name, options, ctx);
        span.setStatus({
            code: telemetry.success ? SpanStatusCode.OK : SpanStatusCode.ERROR
        })
        span.end();
        span["_duration"] = telemetry.duration;
    }

    public trackDependency(telemetry: Contracts.DependencyTelemetry & Contracts.Identified) {
        // TODO: Change context if ID is provided?
        const ctx = context.active();
        let attributes: SpanAttributes = {};
        if (telemetry.dependencyTypeName.toLowerCase().indexOf("http") > -1) {
            attributes[SemanticAttributes.HTTP_METHOD] = "http";
            try {
                let url = new URL(telemetry.data);
                attributes[SemanticAttributes.HTTP_METHOD] = url.protocol;
            }
            catch (error) {// Ignore error
            }
            attributes[SemanticAttributes.HTTP_URL] = telemetry.data;
            attributes[SemanticAttributes.HTTP_STATUS_CODE] = telemetry.resultCode;
        }
        else if (this._isDbDependency(telemetry.dependencyTypeName)) {
            attributes[SemanticAttributes.DB_SYSTEM] = telemetry.dependencyTypeName;
            attributes[SemanticAttributes.DB_STATEMENT] = telemetry.data;
        }
        if (telemetry.target) {
            attributes[SemanticAttributes.PEER_SERVICE] = telemetry.target;
        }
        let options: SpanOptions = {
            kind: SpanKind.CLIENT,
            attributes: attributes
        };
        let span: any = this.tracer.startSpan(telemetry.name, options, ctx);
        span.setStatus({
            code: telemetry.success ? SpanStatusCode.OK : SpanStatusCode.ERROR
        })
        span.end();
        span["_duration"] = telemetry.duration;
    }

    public dispose() {
        this._exporter.shutdown();
    }

    private _isDbDependency(dependencyType: string) {
        return dependencyType.indexOf("SQL") > -1 ||
            dependencyType == "mysql" ||
            dependencyType == "postgresql" ||
            dependencyType == "mongodb" ||
            dependencyType == "redis";
    }
}