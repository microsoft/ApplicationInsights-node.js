import * as assert from "assert";
import * as os from "os";
import * as sinon from "sinon";
import { isValidTraceId, isValidSpanId, context, trace } from "@opentelemetry/api";
import { ExportResultCode } from "@opentelemetry/core";

import {
    LogHandler,
    MetricHandler,
    ResourceManager,
    TraceHandler,
} from "../../../src/library/handlers";
import { Config } from "../../../src/library/configuration";
import {
    AvailabilityTelemetry,
    TraceTelemetry,
    ExceptionTelemetry,
    PageViewTelemetry,
    EventTelemetry,
    Telemetry,
} from "../../../src/declarations/contracts";
import { MonitorDomain } from "../../../src/declarations/generated";

describe("Library/LogHandler", () => {
    let sandbox: sinon.SinonSandbox;
    let _config = new Config();
    _config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#autoCollect", () => {
        it("exception enablement during start", () => {
            _config.enableAutoCollectExceptions = true;
            let handler = new LogHandler(_config);
            let stub = sinon.stub(handler["_exceptions"], "enable");
            handler.start();
            assert.ok(stub.calledOnce, "Enable called");
            assert.equal(stub.args[0][0], true);
        });
    });

    describe("#manual track APIs", () => {
        it("_logToEnvelope", () => {
            let handler = new LogHandler(_config);
            let telemetry: Telemetry = {};
            let data: MonitorDomain = {};
            let envelope = handler["_logToEnvelope"](
                telemetry,
                "TestData",
                data,
                "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
            );
            assert.equal(
                envelope.name,
                "Microsoft.ApplicationInsights.1aa11111bbbb1ccc8dddeeeeffff3333.Test"
            );
            assert.equal(envelope.version, "1");
            assert.equal(envelope.instrumentationKey, "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            assert.equal(envelope.sampleRate, "100");
            assert.ok(envelope.time);
            assert.equal(envelope.data.baseType, "TestData");
            assert.ok(isValidTraceId(envelope.tags["ai.operation.id"]), "Valid operation Id");
            assert.equal(envelope.tags["ai.operation.parentId"], undefined);
            assert.equal(envelope.tags["ai.cloud.role"], "Web");
            assert.equal(envelope.tags["ai.cloud.roleInstance"], os.hostname());
            assert.ok(
                envelope.tags["ai.internal.sdkVersion"].indexOf("node") == 0,
                "Incorrect SDK version"
            );
        });

        it("tracing", () => {
            let logHandler = new LogHandler(_config);
            let traceHandler = new TraceHandler(_config);
            traceHandler["_tracer"].startActiveSpan("test", () => {
                let envelope = logHandler["_logToEnvelope"]({}, "", {}, "");
                let spanContext = trace.getSpanContext(context.active());
                assert.ok(isValidTraceId(envelope.tags["ai.operation.id"]), "Valid operation Id");
                assert.ok(
                    isValidSpanId(envelope.tags["ai.operation.parentId"]),
                    "Valid parent operation Id"
                );
                assert.equal(envelope.tags["ai.operation.id"], spanContext.traceId);
                assert.equal(envelope.tags["ai.operation.parentId"], spanContext.spanId);
            });
        });

        it("trackAvailability", (done) => {
            let handler = new LogHandler(_config);
            let stub = sinon
                .stub(handler["_exporter"], "export")
                .callsFake((envelopes: any, resultCallback: any) => {
                    return new Promise((resolve, reject) => {
                        resultCallback({
                            code: ExportResultCode.SUCCESS,
                        });
                        resolve();
                    });
                });
            let telemetry: AvailabilityTelemetry = {
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
                    let envelopes = stub.args[0][0];
                    assert.equal(envelopes.length, 1);
                    assert.equal(
                        envelopes[0].name,
                        "Microsoft.ApplicationInsights.1aa11111bbbb1ccc8dddeeeeffff3333.Availability"
                    );
                    assert.equal(envelopes[0].version, "1");
                    assert.equal(
                        envelopes[0].instrumentationKey,
                        "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
                    );
                    assert.equal(envelopes[0].sampleRate, "100");
                    assert.ok(envelopes[0].time);
                    assert.equal(envelopes[0].data.baseType, "AvailabilityData");
                    assert.equal(envelopes[0].data.baseData["id"], "testId");
                    assert.equal(envelopes[0].data.baseData["duration"], "00:00:02.000");
                    assert.equal(envelopes[0].data.baseData["success"], false);
                    assert.equal(envelopes[0].data.baseData["runLocation"], "testRunLocation");
                    assert.equal(envelopes[0].data.baseData["message"], "testMessage");
                    assert.equal(envelopes[0].data.baseData["version"], "2");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackPageView", (done) => {
            let handler = new LogHandler(_config);
            let stub = sinon
                .stub(handler["_exporter"], "export")
                .callsFake((envelopes: any, resultCallback: any) => {
                    return new Promise((resolve, reject) => {
                        resultCallback({
                            code: ExportResultCode.SUCCESS,
                        });
                        resolve();
                    });
                });
            let telemetry: PageViewTelemetry = {
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
                    let envelopes = stub.args[0][0];
                    assert.equal(envelopes.length, 1);
                    assert.equal(
                        envelopes[0].name,
                        "Microsoft.ApplicationInsights.1aa11111bbbb1ccc8dddeeeeffff3333.PageView"
                    );
                    assert.equal(envelopes[0].version, "1");
                    assert.equal(
                        envelopes[0].instrumentationKey,
                        "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
                    );
                    assert.equal(envelopes[0].sampleRate, "100");
                    assert.ok(envelopes[0].time);
                    assert.equal(envelopes[0].data.baseType, "PageViewData");
                    assert.equal(envelopes[0].data.baseData["id"], "testId");
                    assert.equal(envelopes[0].data.baseData["duration"], "00:00:02.000");
                    assert.equal(envelopes[0].data.baseData["referredUri"], "testReferredUri");
                    assert.equal(envelopes[0].data.baseData["url"], "testUrl");
                    assert.equal(envelopes[0].data.baseData["version"], "2");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackTrace", (done) => {
            let handler = new LogHandler(_config);
            let stub = sinon
                .stub(handler["_exporter"], "export")
                .callsFake((envelopes: any, resultCallback: any) => {
                    return new Promise((resolve, reject) => {
                        resultCallback({
                            code: ExportResultCode.SUCCESS,
                        });
                        resolve();
                    });
                });
            let telemetry: TraceTelemetry = {
                message: "testMessage",
                severity: "Information",
            };
            handler.trackTrace(telemetry);
            handler
                .flush()
                .then(() => {
                    assert.ok(stub.calledOnce, "Export called");
                    let envelopes = stub.args[0][0];
                    assert.equal(envelopes.length, 1);
                    assert.equal(
                        envelopes[0].name,
                        "Microsoft.ApplicationInsights.1aa11111bbbb1ccc8dddeeeeffff3333.Message"
                    );
                    assert.equal(envelopes[0].version, "1");
                    assert.equal(
                        envelopes[0].instrumentationKey,
                        "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
                    );
                    assert.equal(envelopes[0].sampleRate, "100");
                    assert.ok(envelopes[0].time);
                    assert.equal(envelopes[0].data.baseType, "MessageData");
                    assert.equal(envelopes[0].data.baseData["message"], "testMessage");
                    assert.equal(envelopes[0].data.baseData["severityLevel"], "Information");
                    assert.equal(envelopes[0].data.baseData["version"], "2");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackException", (done) => {
            let handler = new LogHandler(_config);
            let stub = sinon
                .stub(handler["_exporter"], "export")
                .callsFake((envelopes: any, resultCallback: any) => {
                    return new Promise((resolve, reject) => {
                        resultCallback({
                            code: ExportResultCode.SUCCESS,
                        });
                        resolve();
                    });
                });
            let measurements: { [key: string]: number } = {};
            measurements["test"] = 123;
            let telemetry: ExceptionTelemetry = {
                exception: new Error("TestError"),
                severity: "Critical",
                measurements: measurements,
            };
            handler.trackException(telemetry);
            handler
                .flush()
                .then(() => {
                    assert.ok(stub.calledOnce, "Export called");
                    let envelopes = stub.args[0][0];
                    assert.equal(envelopes.length, 1);
                    assert.equal(
                        envelopes[0].name,
                        "Microsoft.ApplicationInsights.1aa11111bbbb1ccc8dddeeeeffff3333.Exception"
                    );
                    assert.equal(envelopes[0].version, "1");
                    assert.equal(
                        envelopes[0].instrumentationKey,
                        "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
                    );
                    assert.equal(envelopes[0].sampleRate, "100");
                    assert.ok(envelopes[0].time);
                    assert.equal(envelopes[0].data.baseType, "ExceptionData");
                    assert.equal(envelopes[0].data.baseData["exceptions"].length, 1);
                    assert.equal(envelopes[0].data.baseData["exceptions"][0].message, "TestError");
                    assert.equal(envelopes[0].data.baseData["exceptions"][0]["typeName"], "Error");
                    assert.ok(
                        envelopes[0].data.baseData["exceptions"][0]["parsedStack"],
                        "Parsedstack not available"
                    );
                    assert.equal(envelopes[0].data.baseData["exceptions"][0]["hasFullStack"], true);
                    assert.equal(envelopes[0].data.baseData["severityLevel"], "Critical");
                    assert.equal(envelopes[0].data.baseData["measurements"]["test"], "123");
                    assert.equal(envelopes[0].data.baseData["version"], "2");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackEvent", (done) => {
            let handler = new LogHandler(_config);
            let stub = sinon
                .stub(handler["_exporter"], "export")
                .callsFake((envelopes: any, resultCallback: any) => {
                    return new Promise((resolve, reject) => {
                        resultCallback({
                            code: ExportResultCode.SUCCESS,
                        });
                        resolve();
                    });
                });
            let measurements: { [key: string]: number } = {};
            measurements["test"] = 123;
            let telemetry: EventTelemetry = {
                name: "TestName",
                measurements: measurements,
            };
            handler.trackEvent(telemetry);
            handler
                .flush()
                .then(() => {
                    assert.ok(stub.calledOnce, "Export called");
                    let envelopes = stub.args[0][0];
                    assert.equal(envelopes.length, 1);
                    assert.equal(
                        envelopes[0].name,
                        "Microsoft.ApplicationInsights.1aa11111bbbb1ccc8dddeeeeffff3333.Event"
                    );
                    assert.equal(envelopes[0].version, "1");
                    assert.equal(
                        envelopes[0].instrumentationKey,
                        "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
                    );
                    assert.equal(envelopes[0].sampleRate, "100");
                    assert.ok(envelopes[0].time);
                    assert.equal(envelopes[0].data.baseType, "EventData");
                    assert.equal(envelopes[0].data.baseData["name"], "TestName");
                    assert.equal(envelopes[0].data.baseData["measurements"]["test"], "123");
                    assert.equal(envelopes[0].data.baseData["version"], "2");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("Exception standard metrics processed", (done) => {
            _config.enableAutoCollectStandardMetrics = true;
            let metricHandler = new MetricHandler(_config);
            let handler = new LogHandler(_config, metricHandler);
            let stub = sinon
                .stub(handler["_exporter"], "export")
                .callsFake((envelopes: any, resultCallback: any) => {
                    return new Promise((resolve, reject) => {
                        resultCallback({
                            code: ExportResultCode.SUCCESS,
                        });
                        resolve();
                    });
                });
            let telemetry: ExceptionTelemetry = {
                exception: new Error("TestError"),
                severity: "Critical",
            };
            handler.trackException(telemetry);
            handler
                .flush()
                .then(() => {
                    let envelopes = stub.args[0][0];
                    assert.equal(envelopes.length, 1);
                    assert.equal(
                        envelopes[0].data.baseData["properties"]["_MS.ProcessedByMetricExtractors"],
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
            let metricHandler = new MetricHandler(_config);
            let handler = new LogHandler(_config, metricHandler);
            let stub = sinon
                .stub(handler["_exporter"], "export")
                .callsFake((envelopes: any, resultCallback: any) => {
                    return new Promise((resolve, reject) => {
                        resultCallback({
                            code: ExportResultCode.SUCCESS,
                        });
                        resolve();
                    });
                });
            let telemetry: TraceTelemetry = {
                message: "testMessage",
                severity: "Information",
            };
            handler.trackTrace(telemetry);
            handler
                .flush()
                .then(() => {
                    let envelopes = stub.args[0][0];
                    assert.equal(envelopes.length, 1);
                    assert.equal(
                        envelopes[0].data.baseData["properties"]["_MS.ProcessedByMetricExtractors"],
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
