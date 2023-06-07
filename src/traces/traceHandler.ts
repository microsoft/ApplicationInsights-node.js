// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { RequestOptions } from "http";
import { AzureMonitorTraceExporter, } from "@azure/monitor-opentelemetry-exporter";
import { Instrumentation } from "@opentelemetry/instrumentation";
import { createAzureSdkInstrumentation } from "@azure/opentelemetry-instrumentation-azure-sdk";
import { MongoDBInstrumentation } from "@opentelemetry/instrumentation-mongodb";
import { MySQLInstrumentation } from "@opentelemetry/instrumentation-mysql";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { RedisInstrumentation } from "@opentelemetry/instrumentation-redis";
import { RedisInstrumentation as Redis4Instrumentation } from "@opentelemetry/instrumentation-redis-4";
import { NodeTracerProvider, NodeTracerConfig } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor, BufferConfig, SpanProcessor, Tracer } from "@opentelemetry/sdk-trace-base";
import { HttpInstrumentation, HttpInstrumentationConfig, IgnoreOutgoingRequestFunction } from "@opentelemetry/instrumentation-http";
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ApplicationInsightsSampler } from "./applicationInsightsSampler";
import { ApplicationInsightsConfig } from "../shared";
import { MetricHandler } from "../metrics/metricHandler";
import { AzureSpanProcessor } from "./azureSpanProcessor";
import { AzureFunctionsHook } from "./azureFunctionsHook";
import { Util } from "../shared/util";


export class TraceHandler {
    private _azureMonitorExporter: AzureMonitorTraceExporter;
    private _otlpExporter: OTLPTraceExporter;
    private _config: ApplicationInsightsConfig;
    private _metricHandler: MetricHandler;
    private _instrumentations: Instrumentation[];
    private _tracerProvider: NodeTracerProvider;
    private _tracer: Tracer;
    private _azureFunctionsHook: AzureFunctionsHook;
    private _httpInstrumentation: Instrumentation;
    private _azureSdkInstrumentation: Instrumentation;
    private _mongoDbInstrumentation: Instrumentation;
    private _mySqlInstrumentation: Instrumentation;
    private _postgressInstrumentation: Instrumentation;
    private _redisInstrumentation: Instrumentation;
    private _redis4Instrumentation: Instrumentation;

    constructor(
        config: ApplicationInsightsConfig,
        metricHandler?: MetricHandler,
    ) {
        this._config = config;
        this._metricHandler = metricHandler;
        this._instrumentations = [];
        const aiSampler = new ApplicationInsightsSampler(this._config.samplingRatio);
        const tracerConfig: NodeTracerConfig = {
            sampler: aiSampler,
            resource: this._config.resource,
            forceFlushTimeoutMillis: 30000,
        };
        this._tracerProvider = new NodeTracerProvider(tracerConfig);
        this._azureMonitorExporter = new AzureMonitorTraceExporter(config.azureMonitorExporterConfig);
        const bufferConfig: BufferConfig = {
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5000,
            exportTimeoutMillis: 30000,
            maxQueueSize: 2048,
        };
        let azureMonitorSpanProcessor = new BatchSpanProcessor(this._azureMonitorExporter, bufferConfig);
        this._tracerProvider.addSpanProcessor(azureMonitorSpanProcessor);
        if (this._metricHandler) {
            const azureSpanProcessor = new AzureSpanProcessor(this._metricHandler);
            this._tracerProvider.addSpanProcessor(azureSpanProcessor);
        }

        if (config.otlpTraceExporterConfig?.enabled) {
            this._otlpExporter = new OTLPTraceExporter(config.otlpTraceExporterConfig.baseConfig);
            let otlpSpanProcessor = new BatchSpanProcessor(this._otlpExporter, bufferConfig);
            this._tracerProvider.addSpanProcessor(otlpSpanProcessor);
        }

        this._tracerProvider.register();
        // TODO: Check for conflicts with multiple handlers available
        this._tracer = this._tracerProvider.getTracer("ApplicationInsightsTracer");
        this._azureFunctionsHook = new AzureFunctionsHook();
        this._initialize();
    }

    /** 
  * @deprecated This should not be used
  */
    public start() {
        // No Op
    }

    public getTracerProvider(): NodeTracerProvider {
        return this._tracerProvider;
    }

    public getTracer(): Tracer {
        return this._tracer;
    }

    private _initialize() {
        if (!this._httpInstrumentation) {
            const httpInstrumentationConfig = (this._config.instrumentations.http as HttpInstrumentationConfig);
            const providedIgnoreOutgoingRequestHook = httpInstrumentationConfig.ignoreOutgoingRequestHook;
            const mergedIgnoreOutgoingRequestHook: IgnoreOutgoingRequestFunction = (request: RequestOptions) => {
                const result = Util.getInstance().ignoreOutgoingRequestHook(request);
                if (!result) { // Not internal call
                    if (providedIgnoreOutgoingRequestHook) { // Provided hook in config
                        return providedIgnoreOutgoingRequestHook(request);
                    }
                }
                return result;
            };
            httpInstrumentationConfig.ignoreOutgoingRequestHook = mergedIgnoreOutgoingRequestHook;
            this._httpInstrumentation = new HttpInstrumentation(this._config.instrumentations.http);
            this.addInstrumentation(this._httpInstrumentation);
        }
        if (!this._azureSdkInstrumentation) {
            this._azureSdkInstrumentation = createAzureSdkInstrumentation(
                this._config.instrumentations.azureSdk
            ) as any;
            this.addInstrumentation(this._azureSdkInstrumentation);
        }
        if (!this._mongoDbInstrumentation) {
            this._mongoDbInstrumentation = new MongoDBInstrumentation(
                this._config.instrumentations.mongoDb
            );
            this.addInstrumentation(this._mongoDbInstrumentation);
        }
        if (!this._mySqlInstrumentation) {
            this._mySqlInstrumentation = new MySQLInstrumentation(
                this._config.instrumentations.mySql
            );
            this.addInstrumentation(this._mySqlInstrumentation);
        }
        if (!this._postgressInstrumentation) {
            this._postgressInstrumentation = new PgInstrumentation(
                this._config.instrumentations.postgreSql
            );
            this.addInstrumentation(this._postgressInstrumentation);
        }
        if (!this._redisInstrumentation) {
            this._redisInstrumentation = new RedisInstrumentation(
                this._config.instrumentations.redis
            );
            this.addInstrumentation(this._redisInstrumentation);
        }
        if (!this._redis4Instrumentation) {
            this._redis4Instrumentation = new Redis4Instrumentation(
                this._config.instrumentations.redis4
            );
            this.addInstrumentation(this._redis4Instrumentation);
        }
        this._instrumentations.forEach((instrumentation) => {
            instrumentation.setTracerProvider(this._tracerProvider);
            if (instrumentation.getConfig().enabled) {
                instrumentation.enable();
            }
        });
    }

    public addSpanProcessor(spanProcessor: SpanProcessor) {
        this._tracerProvider.addSpanProcessor(spanProcessor);
    }

    public addInstrumentation(instrumentation: Instrumentation) {
        this._instrumentations.push(instrumentation);
    }

    public disableInstrumentations() {
        this._instrumentations.forEach((instrumentation) => {
            instrumentation.disable();
        });
    }

    public async flush(): Promise<void> {
        return this._tracerProvider.forceFlush();
    }

    public async shutdown(): Promise<void> {
        await this._tracerProvider.shutdown();
        this._azureFunctionsHook.shutdown();
    }
}
