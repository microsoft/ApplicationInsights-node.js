// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SpanOptions, context, SpanKind, SpanStatusCode, SpanAttributes } from "@opentelemetry/api";
import {
    Instrumentation,
    InstrumentationOption,
    registerInstrumentations,
} from "@opentelemetry/instrumentation";
import { NodeTracerProvider, NodeTracerConfig } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor, BufferConfig, Tracer } from "@opentelemetry/sdk-trace-base";
import {
    HttpInstrumentation,
    HttpInstrumentationConfig,
} from "@opentelemetry/instrumentation-http";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";

import { Config } from "../configuration";
import * as Contracts from "../../declarations/contracts";
import { TraceExporter } from "../exporters";
import { FlushOptions } from "../../declarations/flushOptions";
import { Logger } from "../logging";
import { Context } from "../context";

export class TraceHandler {
    public config: Config;
    public tracerProvider: NodeTracerProvider;
    public tracer: Tracer;
    public httpInstrumentationConfig: HttpInstrumentationConfig;

    private _exporter: TraceExporter;
    private _config: Config;
    private _context: Context;
    private _instrumentations: InstrumentationOption[];
    private _disableInstrumentations: () => void;

    constructor(config: Config, context: Context) {
        this._config = config;
        this._context = context;
        this._instrumentations = [];
        let tracerConfig: NodeTracerConfig = {
            sampler: null,
            resource: this._context.getResource(),
            generalLimits: null,
            idGenerator: null,
            forceFlushTimeoutMillis: 30000,
        };
        this.tracerProvider = new NodeTracerProvider(tracerConfig);
        this._exporter = new TraceExporter(this._config);
        let bufferConfig: BufferConfig = {
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5000,
            exportTimeoutMillis: 30000,
            maxQueueSize: 2048,
        };
        let spanProcessor = new BatchSpanProcessor(
            this._exporter.azureMonitorExporter,
            bufferConfig
        );
        this.tracerProvider.addSpanProcessor(spanProcessor);
        this.httpInstrumentationConfig = {
            ignoreOutgoingUrls: [new RegExp(this._config.endpointUrl)],
        };
    }

    public start() {
        // TODO: Update config name to enable auto collection of HTTP/HTTPs
        if (this._config.enableAutoCollectRequests || this._config.enableAutoCollectDependencies) {
            let httpInstrumentation = new HttpInstrumentation(this.httpInstrumentationConfig);
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
        //this._instrumentations.push(instrumentation);
    }

    public registerInstrumentations() {
        this._disableInstrumentations = registerInstrumentations({
            tracerProvider: this.tracerProvider,
            instrumentations: this._instrumentations,
        });
    }

    public disableInstrumentations() {
        if (this._disableInstrumentations) {
            this._disableInstrumentations();
        }
    }

    public flush(options?: FlushOptions) {
        // TODO: Flush OpenTelemetry
    }

    // Support Legacy APIs
    public trackRequest(telemetry: Contracts.RequestTelemetry) {
        // TODO: Change context if ID is provided?
        const ctx = context.active();
        let attributes: SpanAttributes = {
            ...telemetry.properties,
        };
        attributes[SemanticAttributes.HTTP_METHOD] = "http";
        try {
            let url = new URL(telemetry.url);
            attributes[SemanticAttributes.HTTP_METHOD] = url.protocol;
        } catch (error) {
            // Ignore error
        }
        attributes[SemanticAttributes.HTTP_URL] = telemetry.url;
        attributes[SemanticAttributes.HTTP_STATUS_CODE] = telemetry.resultCode;
        let options: SpanOptions = {
            kind: SpanKind.SERVER,
            attributes: attributes,
        };
        let span: any = this.tracer.startSpan(telemetry.name, options, ctx);
        span.setStatus({
            code: telemetry.success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        });
        span.end();
        span["_duration"] = telemetry.duration;
    }

    // Support Legacy APIs
    public trackDependency(telemetry: Contracts.DependencyTelemetry) {
        // TODO: Change context if ID is provided?

        if (telemetry && !telemetry.target && telemetry.data) {
            // url.parse().host returns null for non-urls,
            // making this essentially a no-op in those cases
            // If this logic is moved, update jsdoc in DependencyTelemetry.target
            // url.parse() is deprecated, update to use WHATWG URL API instead
            try {
                telemetry.target = new URL(telemetry.data).host;
            } catch (error) {
                // set target as null to be compliant with previous behavior
                telemetry.target = null;
                Logger.getInstance().warn(this.constructor.name, "Failed to create URL.", error);
            }
        }
        const ctx = context.active();
        let attributes: SpanAttributes = {
            ...telemetry.properties,
        };
        if (telemetry.dependencyTypeName.toLowerCase().indexOf("http") > -1) {
            attributes[SemanticAttributes.HTTP_METHOD] = "http";
            try {
                let url = new URL(telemetry.data);
                attributes[SemanticAttributes.HTTP_METHOD] = url.protocol;
            } catch (error) {
                // Ignore error
            }
            attributes[SemanticAttributes.HTTP_URL] = telemetry.data;
            attributes[SemanticAttributes.HTTP_STATUS_CODE] = telemetry.resultCode;
        } else if (this._isDbDependency(telemetry.dependencyTypeName)) {
            attributes[SemanticAttributes.DB_SYSTEM] = telemetry.dependencyTypeName;
            attributes[SemanticAttributes.DB_STATEMENT] = telemetry.data;
        }
        if (telemetry.target) {
            attributes[SemanticAttributes.PEER_SERVICE] = telemetry.target;
        }
        let options: SpanOptions = {
            kind: SpanKind.CLIENT,
            attributes: attributes,
        };
        let span: any = this.tracer.startSpan(telemetry.name, options, ctx);
        span.setStatus({
            code: telemetry.success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        });
        span.end();
        span["_duration"] = telemetry.duration;
    }

    public dispose() {
        this._exporter.azureMonitorExporter.shutdown();
    }

    private _isDbDependency(dependencyType: string) {
        return (
            dependencyType.indexOf("SQL") > -1 ||
            dependencyType == "mysql" ||
            dependencyType == "postgresql" ||
            dependencyType == "mongodb" ||
            dependencyType == "redis"
        );
    }
}
