// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { RequestOptions } from "http";
import {
    AzureMonitorExporterOptions,
    AzureMonitorTraceExporter,
} from "@azure/monitor-opentelemetry-exporter";
import { Instrumentation } from "@opentelemetry/instrumentation";
import { createAzureSdkInstrumentation } from "@azure/opentelemetry-instrumentation-azure-sdk";
import { MongoDBInstrumentation } from "@opentelemetry/instrumentation-mongodb";
import { MySQLInstrumentation } from "@opentelemetry/instrumentation-mysql";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { RedisInstrumentation } from "@opentelemetry/instrumentation-redis";
import { RedisInstrumentation as Redis4Instrumentation } from "@opentelemetry/instrumentation-redis-4";
import { NodeTracerProvider, NodeTracerConfig } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor, BufferConfig, Tracer } from "@opentelemetry/sdk-trace-base";
import { HttpInstrumentation, HttpInstrumentationConfig, IgnoreOutgoingRequestFunction } from "@opentelemetry/instrumentation-http";
import { ApplicationInsightsSampler } from "./applicationInsightsSampler";
import { ApplicationInsightsConfig } from "../shared";
import { TracerProvider } from "@opentelemetry/api";
import { MetricHandler } from "../metrics/metricHandler";
import { AzureSpanProcessor } from "./azureSpanProcessor";
import { AzureFunctionsHook } from "./azureFunctionsHook";
import { Util } from "../shared/util";


export class TraceHandler {
    private _exporter: AzureMonitorTraceExporter;
    private _spanProcessor: BatchSpanProcessor;
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
        const aiSampler = new ApplicationInsightsSampler(this._config.samplingRate);
        const tracerConfig: NodeTracerConfig = {
            sampler: aiSampler,
            resource: this._config.resource,
            forceFlushTimeoutMillis: 30000,
        };
        this._tracerProvider = new NodeTracerProvider(tracerConfig);
        const exporterConfig: AzureMonitorExporterOptions = {
            connectionString: this._config.connectionString,
            aadTokenCredential: this._config.aadTokenCredential,
            storageDirectory: this._config.storageDirectory,
            disableOfflineStorage: this._config.disableOfflineStorage,
        };
        this._exporter = new AzureMonitorTraceExporter(exporterConfig);
        const bufferConfig: BufferConfig = {
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5000,
            exportTimeoutMillis: 30000,
            maxQueueSize: 2048,
        };
        this._spanProcessor = new BatchSpanProcessor(this._exporter, bufferConfig);
        this._tracerProvider.addSpanProcessor(this._spanProcessor);
        if (this._metricHandler) {
            const azureSpanProcessor = new AzureSpanProcessor(this._metricHandler);
            this._tracerProvider.addSpanProcessor(azureSpanProcessor);
        }
        this._tracerProvider.register();
        // TODO: Check for conflicts with multiple handlers available
        this._tracer = this._tracerProvider.getTracer("ApplicationInsightsTracer");
        this._azureFunctionsHook = new AzureFunctionsHook();
    }

    public getTracerProvider(): TracerProvider {
        return this._tracerProvider;
    }

    public getTracer(): Tracer {
        return this._tracer;
    }

    public start() {
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
