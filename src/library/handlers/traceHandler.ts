// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { RequestOptions } from "http";

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

import { Config } from "../configuration";
import { ResourceManager } from "./resourceManager";
import { AzureExporterConfig, AzureMonitorTraceExporter } from "@azure/monitor-opentelemetry-exporter";


export class TraceHandler {
    public tracerProvider: NodeTracerProvider;
    public tracer: Tracer;
    public httpInstrumentationConfig: HttpInstrumentationConfig;

    private _exporter: AzureMonitorTraceExporter;
    private _spanProcessor: BatchSpanProcessor;
    private _config: Config;
    private resourceManager: ResourceManager;
    private _instrumentations: InstrumentationOption[];
    private _disableInstrumentations: () => void;

    constructor(config: Config, resourceManager: ResourceManager) {
        this._config = config;
        this.resourceManager = resourceManager;
        this._instrumentations = [];
        let tracerConfig: NodeTracerConfig = {
            resource: this.resourceManager.getTraceResource(),
            forceFlushTimeoutMillis: 30000,
        };
        this.tracerProvider = new NodeTracerProvider(tracerConfig);
        // Get connection string for Azure Monitor Exporter
        let ingestionEndpoint = config.endpointUrl.replace("/v2.1/track", "");
        let connectionString = `InstrumentationKey=${config.instrumentationKey};IngestionEndpoint=${ingestionEndpoint}`;
        let exporterConfig: AzureExporterConfig = {
            connectionString: connectionString,
            aadTokenCredential: config.aadTokenCredential
        };
        this._exporter = new AzureMonitorTraceExporter(exporterConfig);

        let bufferConfig: BufferConfig = {
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5000,
            exportTimeoutMillis: 30000,
            maxQueueSize: 2048,
        };
        this._spanProcessor = new BatchSpanProcessor(
            this._exporter,
            bufferConfig
        );
        this.tracerProvider.addSpanProcessor(this._spanProcessor);
        this.tracerProvider.register();
        // TODO: Check for conflicts with multiple handlers available
        this.tracer = this.tracerProvider.getTracer("ApplicationInsightsTracer");

        this.httpInstrumentationConfig = {
            ignoreOutgoingRequestHook: this._ignoreOutgoingRequestHook.bind(this),
            ignoreIncomingRequestHook: this._ignoreIncomingRequestHook.bind(this),
        };
    }

    public start() {
        if (this._config.enableAutoCollectRequests || this._config.enableAutoCollectDependencies) {
            let httpInstrumentation = new HttpInstrumentation(this.httpInstrumentationConfig);
            this.addInstrumentation(httpInstrumentation);
        }
        if (this._instrumentations.length > 0) {
            this.registerInstrumentations();
        }
    }

    public addInstrumentation(instrumentation: Instrumentation) {
        this._instrumentations.push(instrumentation);
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

    public async flush(): Promise<void> {
        return this.tracerProvider.forceFlush();
    }

    public async shutdown(): Promise<void> {
        await this.tracerProvider.shutdown();
    }

    private _ignoreOutgoingRequestHook(request: RequestOptions): boolean {
        if (this._config.enableAutoCollectDependencies) {
            // Check for request made to ingestion endpoint, suppressTracing only avaialble for traces
            // TODO: Remove check when suppress is available for logs/metrics
            if (request.headers && request.headers["user-agent"]) {
                return request.headers["user-agent"].toString().indexOf("azsdk-js-monitor-opentelemetry-exporter") > -1;
            }
            return false;
        }
        return true;
    }

    private _ignoreIncomingRequestHook(request: RequestOptions): boolean {
        return !this._config.enableAutoCollectRequests;
    }
}
