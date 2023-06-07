import * as assert from "assert";
import * as sinon from "sinon";
import { trace, context, isValidTraceId, isValidSpanId } from "@opentelemetry/api";
import { LogRecord as APILogRecord } from "@opentelemetry/api-logs";
import { LogRecord } from "@opentelemetry/sdk-logs";
import { ExportResultCode } from "@opentelemetry/core";
import { LogHandler } from "../../../src/logs";
import { MetricHandler } from "../../../src/metrics";
import { TraceHandler } from "../../../src/traces";
import { ApplicationInsightsConfig } from "../../../src/shared";
import {
    AvailabilityTelemetry,
    TraceTelemetry,
    ExceptionTelemetry,
    PageViewTelemetry,
    EventTelemetry,
    Telemetry,
} from "../../../src/declarations/contracts";
import { AvailabilityData, MessageData, MonitorDomain, PageViewData, TelemetryEventData, TelemetryExceptionData } from "../../../src/declarations/generated";


describe("Library/LogHandler", () => {
    let sandbox: sinon.SinonSandbox;
    let handler: LogHandler;
    let traceHandler: TraceHandler;
    let stub: sinon.SinonStub;
    let metricHandler: MetricHandler;
    const _config = new ApplicationInsightsConfig();
    _config.azureMonitorExporterConfig.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://westus.in.applicationinsights.azure.com/;LiveEndpoint=https://west.live.monitor.azure.com/";

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
        handler.shutdown();
        if (traceHandler) {
            traceHandler.shutdown();
        }
        if (metricHandler) {
            metricHandler.shutdown();
        }
    });

    function createLogHandler(config: ApplicationInsightsConfig, metricHandler?: MetricHandler) {
        handler = new LogHandler(config, metricHandler);
        stub = sinon.stub(handler["_exporter"], "export").callsFake(
            (logs: any, resultCallback: any) =>
                new Promise((resolve, reject) => {
                    resultCallback({
                        code: ExportResultCode.SUCCESS,
                    });
                    resolve();
                })
        );
    }

    describe("#logger", () => {
        it("constructor", () => {
            createLogHandler(_config);
            assert.ok(handler.getLoggerProvider(), "LoggerProvider not available");
            assert.ok(handler.getLogger(), "Logger not available");
        });

        it("tracing", (done) => {
            createLogHandler(_config);
            traceHandler = new TraceHandler(_config);
            traceHandler["_tracer"].startActiveSpan("test", () => {
                // Generate Log record
                const logRecord: APILogRecord = {
                    attributes: {}, body: "testRecord"
                };
                handler.getLogger().emit(logRecord);
                handler
                    .flush()
                    .then(() => {
                        assert.ok(stub.calledOnce, "Export called");
                        const logs = stub.args[0][0];
                        assert.equal(logs.length, 1);
                        const spanContext = trace.getSpanContext(context.active());
                        assert.ok(isValidTraceId(logs[0].spanContext.traceId), "Valid trace Id");
                        assert.ok(isValidSpanId(logs[0].spanContext.spanId), "Valid span Id");
                        assert.equal(logs[0].spanContext.traceId, spanContext.traceId);
                        assert.equal(logs[0].spanContext.spanId, spanContext.spanId);
                        done();
                    })
                    .catch((error) => {
                        done(error);
                    });
            });
        });
    });


    describe("#autoCollect", () => {
        it("exception enablement during start", () => {
            _config.enableAutoCollectExceptions = true;
            createLogHandler(_config);
            assert.ok(handler["_exceptions"], "Exceptions not enabled");
        });
    });


    describe("#manual track APIs", () => {
        it("_logToEnvelope", () => {
            createLogHandler(_config);
            const telemetry: Telemetry = {
                properties: { "testAttribute": "testValue" }
            };
            const data: MonitorDomain = {};
            const logRecord = handler["_telemetryToLogRecord"](
                telemetry,
                "TestData",
                data,
            ) as LogRecord;
            assert.equal(logRecord.body, "{}");
            assert.equal(logRecord.attributes["testAttribute"], "testValue");
            assert.equal(logRecord.attributes["_MS.baseType"], "TestData");
        });

        it("trackAvailability", (done) => {
            createLogHandler(_config);
            const telemetry: AvailabilityTelemetry = {
                name: "TestName",
                duration: 2000, //2 seconds
                id: "testId",
                runLocation: "testRunLocation",
                message: "testMessage",
                success: false,
            };
            handler.trackAvailability(telemetry);
            handler
                .flush()
                .then(() => {
                    assert.ok(stub.calledOnce, "Export called");
                    const logs = stub.args[0][0];
                    assert.equal(logs.length, 1);
                    let baseData = JSON.parse(logs[0].body) as AvailabilityData;
                    assert.equal(baseData.version, 2);
                    assert.equal(baseData.id, "testId");
                    assert.equal(baseData.name, "TestName");
                    assert.equal(baseData.duration, "00:00:02.000");
                    assert.equal(baseData.success, false);
                    assert.equal(baseData.runLocation, "testRunLocation");
                    assert.equal(baseData.message, "testMessage");
                    assert.equal(logs[0].attributes["_MS.baseType"], "AvailabilityData");
                    assert.equal(logs[0].instrumentationScope.name, "AzureMonitorLogger");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackPageView", (done) => {
            createLogHandler(_config);
            const telemetry: PageViewTelemetry = {
                name: "TestName",
                duration: 2000, //2 seconds
                id: "testId",
                referredUri: "testReferredUri",
                url: "testUrl",
            };
            handler.trackPageView(telemetry);
            handler
                .flush()
                .then(() => {
                    assert.ok(stub.calledOnce, "Export called");
                    const logs = stub.args[0][0];
                    assert.equal(logs.length, 1);
                    let baseData = JSON.parse(logs[0].body) as PageViewData;
                    assert.equal(baseData.version, 2);
                    assert.equal(baseData.id, "testId");
                    assert.equal(baseData.name, "TestName");
                    assert.equal(baseData.duration, "00:00:02.000");
                    assert.equal(baseData.referredUri, "testReferredUri");
                    assert.equal(baseData.url, "testUrl");
                    assert.equal(logs[0].attributes["_MS.baseType"], "PageViewData");
                    assert.equal(logs[0].instrumentationScope.name, "AzureMonitorLogger");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackTrace", (done) => {
            createLogHandler(_config);
            const telemetry: TraceTelemetry = {
                message: "testMessage",
                severity: "Information",
            };
            handler.trackTrace(telemetry);
            handler
                .flush()
                .then(() => {
                    assert.ok(stub.calledOnce, "Export called");
                    const logs = stub.args[0][0];
                    assert.equal(logs.length, 1);
                    let baseData = JSON.parse(logs[0].body) as MessageData;
                    assert.equal(baseData.version, 2);
                    assert.equal(baseData.message, "testMessage");
                    assert.equal(baseData.severityLevel, "Information");
                    assert.equal(logs[0].attributes["_MS.baseType"], "MessageData");
                    assert.equal(logs[0].instrumentationScope.name, "AzureMonitorLogger");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackException", (done) => {
            createLogHandler(_config);
            const measurements: { [key: string]: number } = {};
            measurements["test"] = 123;
            const telemetry: ExceptionTelemetry = {
                exception: new Error("TestError"),
                severity: "Critical",
                measurements: measurements,
            };
            handler.trackException(telemetry);
            handler
                .flush()
                .then(() => {
                    assert.ok(stub.calledOnce, "Export called");
                    const logs = stub.args[0][0];
                    assert.equal(logs.length, 1);
                    let baseData = JSON.parse(logs[0].body) as TelemetryExceptionData;
                    assert.equal(baseData.version, 2);
                    assert.equal(baseData.severityLevel, "Critical");
                    assert.equal(baseData.exceptions[0].message, "TestError");
                    assert.equal(baseData.exceptions[0].typeName, "Error");
                    assert.equal(baseData.measurements["test"], 123);
                    assert.equal(logs[0].attributes["_MS.baseType"], "ExceptionData");
                    assert.equal(logs[0].instrumentationScope.name, "AzureMonitorLogger");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackEvent", (done) => {
            createLogHandler(_config);
            const measurements: { [key: string]: number } = {};
            measurements["test"] = 123;
            const telemetry: EventTelemetry = {
                name: "TestName",
                measurements: measurements,
            };
            handler.trackEvent(telemetry);
            handler
                .flush()
                .then(() => {
                    assert.ok(stub.calledOnce, "Export called");
                    const logs = stub.args[0][0];
                    assert.equal(logs.length, 1);
                    let baseData = JSON.parse(logs[0].body) as TelemetryEventData;
                    assert.equal(baseData.version, 2);
                    assert.equal(baseData.name, "TestName");
                    assert.equal(baseData.measurements["test"], 123);
                    assert.equal(logs[0].attributes["_MS.baseType"], "EventData");
                    assert.equal(logs[0].instrumentationScope.name, "AzureMonitorLogger");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("Exception standard metrics processed", (done) => {
            _config.enableAutoCollectStandardMetrics = true;
            metricHandler = new MetricHandler(_config);
            createLogHandler(_config, metricHandler);

            const telemetry: ExceptionTelemetry = {
                exception: new Error("TestError"),
                severity: "Critical",
            };
            handler.trackException(telemetry);
            // Generate exception Log record
            const logRecord: APILogRecord = {
                attributes: {
                    "exception.type": "TestError"
                }, body: "testErrorRecord"
            };
            handler.getLogger().emit(logRecord);
            handler
                .flush()
                .then(() => {
                    let result = stub.args;
                    assert.equal(result.length, 2);
                    assert.equal(result[0][0][0].attributes["_MS.ProcessedByMetricExtractors"], "(Name:'Exceptions', Ver:'1.1')");
                    assert.equal(result[1][0][0].attributes["_MS.ProcessedByMetricExtractors"], "(Name:'Exceptions', Ver:'1.1')");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("Trace standard metrics processed", (done) => {
            _config.enableAutoCollectStandardMetrics = true;
            metricHandler = new MetricHandler(_config);
            createLogHandler(_config, metricHandler);
            const telemetry: TraceTelemetry = {
                message: "testMessage",
                severity: "Information",
            };
            handler.trackTrace(telemetry);
            // Generate Log record
            const logRecord: APILogRecord = {
                attributes: {}, body: "testRecord"
            };
            handler.getLogger().emit(logRecord);

            handler
                .flush()
                .then(() => {
                    let result = stub.args;
                    assert.equal(result.length, 2);
                    assert.equal(result[0][0][0].attributes["_MS.ProcessedByMetricExtractors"], "(Name:'Traces', Ver:'1.1')");
                    assert.equal(result[1][0][0].attributes["_MS.ProcessedByMetricExtractors"], "(Name:'Traces', Ver:'1.1')");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });
});
