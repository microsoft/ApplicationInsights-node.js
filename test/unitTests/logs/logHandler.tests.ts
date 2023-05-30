import * as assert from "assert";
import * as os from "os";
import * as sinon from "sinon";
import { isValidTraceId, isValidSpanId, context, trace } from "@opentelemetry/api";
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
import { MonitorDomain } from "../../../src/declarations/generated";
import { Resource } from "@opentelemetry/resources";


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
            );
            assert.equal(logRecord.body, "{}");
            assert.equal(logRecord.attributes["testAttribute"], "testValue");
            assert.equal(logRecord.attributes["_MS.baseType"], "TestData");
            assert.ok(logRecord.hrTime);
        });

        it("tracing", () => {
            createLogHandler(_config);
            traceHandler = new TraceHandler(_config);
            traceHandler["_tracer"].startActiveSpan("test", () => {
                const logRecord = handler["_telemetryToLogRecord"](
                    {},
                    "TestData",
                    {},
                );
                const spanContext = trace.getSpanContext(context.active());
                assert.ok(isValidTraceId(logRecord.spanContext.traceId), "Valid trace Id");
                assert.ok(isValidSpanId(logRecord.spanContext.spanId), "Valid span Id");
                assert.equal(logRecord.spanContext.traceId, spanContext.traceId);
                assert.equal(logRecord.spanContext.spanId, spanContext.spanId);
            });
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
                    assert.equal(
                        logs[0].name,
                        "Microsoft.ApplicationInsights.Availability"
                    );
                    assert.equal(logs[0].version, "1");
                    assert.equal(
                        logs[0].instrumentationKey,
                        "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
                    );
                    assert.equal(logs[0].sampleRate, "100");
                    assert.ok(logs[0].time);
                    assert.equal(logs[0].data.baseType, "AvailabilityData");
                    assert.equal(logs[0].data.baseData["id"], "testId");
                    assert.equal(logs[0].data.baseData["duration"], "00:00:02.000");
                    assert.equal(logs[0].data.baseData["success"], false);
                    assert.equal(logs[0].data.baseData["runLocation"], "testRunLocation");
                    assert.equal(logs[0].data.baseData["message"], "testMessage");
                    assert.equal(logs[0].data.baseData["version"], "2");
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

                    assert.equal(logs[0].body, "{}");
                    assert.equal(logs[0].attributes["_MS.baseType"], "PageViewData");
                    assert.ok(logs[0].hrTime);
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
                    assert.equal(
                        logs[0].name,
                        "Microsoft.ApplicationInsights.1aa11111bbbb1ccc8dddeeeeffff3333.Message"
                    );
                    assert.equal(logs[0].version, "1");
                    assert.equal(
                        logs[0].instrumentationKey,
                        "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
                    );
                    assert.equal(logs[0].sampleRate, "100");
                    assert.ok(logs[0].time);
                    assert.equal(logs[0].data.baseType, "MessageData");
                    assert.equal(logs[0].data.baseData["message"], "testMessage");
                    assert.equal(logs[0].data.baseData["severityLevel"], "Information");
                    assert.equal(logs[0].data.baseData["version"], "2");
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
                    assert.equal(
                        logs[0].name,
                        "Microsoft.ApplicationInsights.1aa11111bbbb1ccc8dddeeeeffff3333.Exception"
                    );
                    assert.equal(logs[0].version, "1");
                    assert.equal(
                        logs[0].instrumentationKey,
                        "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
                    );
                    assert.equal(logs[0].sampleRate, "100");
                    assert.ok(logs[0].time);
                    assert.equal(logs[0].data.baseType, "ExceptionData");
                    assert.equal(logs[0].data.baseData["exceptions"].length, 1);
                    assert.equal(logs[0].data.baseData["exceptions"][0].message, "TestError");
                    assert.equal(logs[0].data.baseData["exceptions"][0]["typeName"], "Error");
                    assert.ok(
                        logs[0].data.baseData["exceptions"][0]["parsedStack"],
                        "Parsedstack not available"
                    );
                    assert.equal(logs[0].data.baseData["exceptions"][0]["hasFullStack"], true);
                    assert.equal(logs[0].data.baseData["severityLevel"], "Critical");
                    assert.equal(logs[0].data.baseData["measurements"]["test"], "123");
                    assert.equal(logs[0].data.baseData["version"], "2");
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
                    assert.equal(
                        logs[0].name,
                        "Microsoft.ApplicationInsights.1aa11111bbbb1ccc8dddeeeeffff3333.Event"
                    );
                    assert.equal(logs[0].version, "1");
                    assert.equal(
                        logs[0].instrumentationKey,
                        "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
                    );
                    assert.equal(logs[0].sampleRate, "100");
                    assert.ok(logs[0].time);
                    assert.equal(logs[0].data.baseType, "EventData");
                    assert.equal(logs[0].data.baseData["name"], "TestName");
                    assert.equal(logs[0].data.baseData["measurements"]["test"], "123");
                    assert.equal(logs[0].data.baseData["version"], "2");
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
            handler
                .flush()
                .then(() => {
                    const logs = stub.args[0][0];
                    assert.equal(logs.length, 1);
                    assert.equal(
                        logs[0].data.baseData["properties"]["_MS.ProcessedByMetricExtractors"],
                        "(Name:'Exceptions', Ver:'1.1')"
                    );
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
            handler
                .flush()
                .then(() => {
                    const logs = stub.args[0][0];
                    assert.equal(logs.length, 1);
                    assert.equal(
                        logs[0].data.baseData["properties"]["_MS.ProcessedByMetricExtractors"],
                        "(Name:'Traces', Ver:'1.1')"
                    );
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });
});
