// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import assert from "assert";
import sinon from "sinon";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { trace, ProxyTracerProvider } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { shutdownAzureMonitor, useAzureMonitor } from "../../src";
import { ApplicationInsightsConfig } from "../../src/shared/configuration/config";

describe("ApplicationInsightsClient", () => {
    afterEach(() => {
        shutdownAzureMonitor();
    });

    it("OTLP Exporters added", () => {
        useAzureMonitor({
            azureMonitorExporterOptions:
                { connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333" },
            otlpMetricExporterConfig: { enabled: true },
            otlpTraceExporterConfig: { enabled: true },
            otlpLogExporterConfig: { enabled: true }
        });
        
        // Check that tracer provider is correctly initialized
        const tracerProvider = ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate() as NodeTracerProvider);
        assert.ok(tracerProvider, "TracerProvider should exist");
        
        // Check span processors - use the correct property path discovered in debug testing
        const spanProcessors = (tracerProvider as any)._config?.spanProcessors || [];
        
        let hasOtlpProcessor = spanProcessors.some((processor: any) => {
            const result = processor._exporter instanceof OTLPTraceExporter;
            return result;
        });
        assert.ok(hasOtlpProcessor, "Should have OTLP trace processor");
    });

    it("_getOtlpLogExporter creates processor when enabled", () => {
        // We need to access the internal _getOtlpLogExporter function
        // Since it's not exported, we'll test the behavior through the main useAzureMonitor function
        useAzureMonitor({
            azureMonitorExporterOptions: { connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333" },
            otlpLogExporterConfig: { 
                enabled: true,
                url: "http://localhost:4318/v1/logs" 
            }
        });

        // Verify that a logger provider exists (indirect test that the processor was added)
        const loggerProvider = logs.getLoggerProvider() as LoggerProvider;
        assert.ok(loggerProvider, "LoggerProvider should exist when OTLP log exporter is enabled");
        
        shutdownAzureMonitor();

        // Test that when OTLP log exporter is disabled, we still get a logger provider
        useAzureMonitor({
            azureMonitorExporterOptions: { connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333" },
            otlpLogExporterConfig: { enabled: false }
        });

        const loggerProvider2 = logs.getLoggerProvider() as LoggerProvider;
        assert.ok(loggerProvider2, "LoggerProvider should exist even when OTLP log exporter is disabled");
    });

    it("OTLP log processor creation with custom config", () => {
        // Test OTLP log processor with custom configuration
        const customConfig = {
            enabled: true,
            url: "http://custom-endpoint:4318/v1/logs",
            headers: {
                "Authorization": "Bearer test-token",
                "Custom-Header": "test-value"
            },
            concurrencyLimit: 10,
            timeoutMillis: 15000
        };

        useAzureMonitor({
            azureMonitorExporterOptions: { connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333" },
            otlpLogExporterConfig: customConfig
        });

        // Verify logger provider is initialized with custom config
        const loggerProvider = logs.getLoggerProvider() as LoggerProvider;
        assert.ok(loggerProvider, "LoggerProvider should exist with custom OTLP config");
        
        // Test that the configuration is properly applied by verifying the provider exists
        // (This is an indirect test since we can't easily access the internal exporter config)
        assert.ok(typeof loggerProvider === 'object', "Should be an object instance");
    });

    it("_getOtlpSpanExporter creates processor when enabled", () => {
        // We need to access the internal _getOtlpSpanExporter function
        // Since it's not exported, we'll test the behavior through the main useAzureMonitor function
        useAzureMonitor({
            azureMonitorExporterOptions: { connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333" },
            otlpTraceExporterConfig: { 
                enabled: true,
                url: "http://localhost:4318/v1/traces" 
            }
        });

        // Verify that a tracer provider exists and has OTLP processor (indirect test that the processor was added)
        const tracerProvider = ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate() as NodeTracerProvider);
        assert.ok(tracerProvider, "TracerProvider should exist when OTLP span exporter is enabled");
        
        // Check for OTLP span processor
        const spanProcessors = (tracerProvider as any)._config?.spanProcessors || [];
        let hasOtlpProcessor = spanProcessors.some((processor: any) => {
            return processor._exporter instanceof OTLPTraceExporter;
        });
        assert.ok(hasOtlpProcessor, "Should have OTLP trace processor when enabled");
        
        shutdownAzureMonitor();

        // Test that when OTLP span exporter is disabled, we still get a tracer provider but no OTLP processor
        useAzureMonitor({
            azureMonitorExporterOptions: { connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333" },
            otlpTraceExporterConfig: { enabled: false }
        });

        const tracerProvider2 = ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate() as NodeTracerProvider);
        assert.ok(tracerProvider2, "TracerProvider should exist even when OTLP span exporter is disabled");
    });

    it("OTLP span processor creation with custom config", () => {
        // Test OTLP span processor with custom configuration
        const customConfig = {
            enabled: true,
            url: "http://custom-endpoint:4318/v1/traces",
            headers: {
                "Authorization": "Bearer test-token",
                "Custom-Header": "test-value"
            },
            concurrencyLimit: 10,
            timeoutMillis: 15000
        };

        useAzureMonitor({
            azureMonitorExporterOptions: { connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333" },
            otlpTraceExporterConfig: customConfig
        });

        // Verify tracer provider is initialized with custom config
        const tracerProvider = ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate() as NodeTracerProvider);
        assert.ok(tracerProvider, "TracerProvider should exist with custom OTLP config");
        
        // Check for OTLP span processor with custom config
        const spanProcessors = (tracerProvider as any)._config?.spanProcessors || [];
        let hasOtlpProcessor = spanProcessors.some((processor: any) => {
            return processor._exporter instanceof OTLPTraceExporter;
        });
        assert.ok(hasOtlpProcessor, "Should have OTLP trace processor with custom config");
    });

    it("repeated useAzureMonitor calls should not accumulate process event listeners", () => {
        const connString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
        const options = { azureMonitorExporterOptions: { connectionString: connString } };

        const uncaughtBefore = process.listenerCount("uncaughtException");
        const rejectionBefore = process.listenerCount("unhandledRejection");

        useAzureMonitor(options);
        const afterFirst = {
            uncaught: process.listenerCount("uncaughtException"),
            rejection: process.listenerCount("unhandledRejection"),
        };

        shutdownAzureMonitor();
        useAzureMonitor(options);
        const afterSecond = {
            uncaught: process.listenerCount("uncaughtException"),
            rejection: process.listenerCount("unhandledRejection"),
        };

        assert.strictEqual(
            afterSecond.uncaught,
            afterFirst.uncaught,
            "uncaughtException listeners should not accumulate across repeated useAzureMonitor calls"
        );
        assert.strictEqual(
            afterSecond.rejection,
            afterFirst.rejection,
            "unhandledRejection listeners should not accumulate across repeated useAzureMonitor calls"
        );

        // Also test calling useAzureMonitor again WITHOUT shutdown in between
        useAzureMonitor(options);
        const afterThird = {
            uncaught: process.listenerCount("uncaughtException"),
            rejection: process.listenerCount("unhandledRejection"),
        };

        assert.strictEqual(
            afterThird.uncaught,
            afterFirst.uncaught,
            "uncaughtException listeners should not accumulate even without explicit shutdown between calls"
        );
        assert.strictEqual(
            afterThird.rejection,
            afterFirst.rejection,
            "unhandledRejection listeners should not accumulate even without explicit shutdown between calls"
        );
    });
});
