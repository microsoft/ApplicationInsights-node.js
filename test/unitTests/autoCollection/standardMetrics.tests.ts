import {
    HttpInstrumentation,
    HttpInstrumentationConfig,
} from "@opentelemetry/instrumentation-http";
import * as assert from "assert";
import * as sinon from "sinon";

import { StandardMetricsHandler } from "../../../src/autoCollection/metrics/handlers/standardMetricsHandler";
import {
    IMetricExceptionDimensions,
    StandardMetric,
} from "../../../src/autoCollection/metrics/types";
import { Config } from "../../../src/library/configuration";

describe("#StandardMetricsHandler", () => {
    var sandbox: sinon.SinonSandbox;
    let autoCollect: StandardMetricsHandler;

    before(() => {
        sandbox = sinon.createSandbox();
        let config = new Config();
        config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        autoCollect = new StandardMetricsHandler(config, { collectionInterval: 100 });
        sandbox.stub(autoCollect["_metricReader"]["_exporter"], "export");
    });

    afterEach(() => {
        sandbox.restore();
    });

    after(() => {
        autoCollect.shutdown();
    });

    it("should create instruments", () => {
        assert.ok(
            autoCollect.getExceptionMetrics()["_exceptionsRateGauge"],
            "_exceptionsRateGauge not available"
        );
        assert.ok(
            autoCollect.getTraceMetrics()["_tracesRateGauge"],
            "_tracesRateGauge not available"
        );
    });

    it("should observe instruments during collection", async () => {
        let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
        // autoCollect.start();
        let dimensions: IMetricExceptionDimensions = {
            cloudRoleInstance: "testcloudRoleInstance",
            cloudRoleName: "testcloudRoleName",
        };
        autoCollect.getExceptionMetrics().countException(dimensions);
        autoCollect.getTraceMetrics().countTrace(dimensions);
        dimensions = {
            cloudRoleInstance: "testcloudRoleInstance2",
            cloudRoleName: "testcloudRoleName2",
        };
        for (let i = 0; i < 10; i++) {
            autoCollect.getExceptionMetrics().countException(dimensions);
            autoCollect.getTraceMetrics().countTrace(dimensions);
        }

        await new Promise((resolve) => setTimeout(resolve, 120));
        assert.ok(mockExport.called);
        let resourceMetrics = mockExport.args[0][0];
        const scopeMetrics = resourceMetrics.scopeMetrics;
        assert.strictEqual(scopeMetrics.length, 1, "scopeMetrics count");
        let metrics = scopeMetrics[0].metrics;
        assert.strictEqual(metrics.length, 2, "metrics count");
        assert.equal(metrics[0].descriptor.name, StandardMetric.EXCEPTION_COUNT);
        assert.equal(metrics[1].descriptor.name, StandardMetric.TRACE_COUNT);
        assert.strictEqual(metrics[0].dataPoints.length, 2, "dataPoints count");
        // Exceptions
        assert.strictEqual(metrics[0].dataPoints[0].value, 1, "dataPoint value");
        assert.strictEqual(
            metrics[0].dataPoints[0].attributes["cloudRoleInstance"],
            "testcloudRoleInstance"
        );
        assert.strictEqual(
            metrics[0].dataPoints[0].attributes["cloudRoleName"],
            "testcloudRoleName"
        );
        assert.strictEqual(metrics[0].dataPoints[1].value, 10, "dataPoint value");
        assert.strictEqual(
            metrics[0].dataPoints[1].attributes["cloudRoleInstance"],
            "testcloudRoleInstance2"
        );
        assert.strictEqual(
            metrics[0].dataPoints[1].attributes["cloudRoleName"],
            "testcloudRoleName2"
        );
        // Traces
        assert.strictEqual(metrics[1].dataPoints[0].value, 1, "dataPoint value");
        assert.strictEqual(
            metrics[1].dataPoints[0].attributes["cloudRoleInstance"],
            "testcloudRoleInstance"
        );
        assert.strictEqual(
            metrics[1].dataPoints[0].attributes["cloudRoleName"],
            "testcloudRoleName"
        );
        assert.strictEqual(metrics[1].dataPoints[1].value, 10, "dataPoint value");
        assert.strictEqual(
            metrics[1].dataPoints[1].attributes["cloudRoleInstance"],
            "testcloudRoleInstance2"
        );
        assert.strictEqual(
            metrics[1].dataPoints[1].attributes["cloudRoleName"],
            "testcloudRoleName2"
        );
    });

    it("should not collect when disabled", async () => {
        let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
        autoCollect.shutdown();
        await new Promise((resolve) => setTimeout(resolve, 120));
        assert.ok(mockExport.notCalled);
    });

    describe("#HTTP incoming/outgoing requests duration", () => {
        let http: any = null;
        let mockHttpServer: any;
        let mockHttpServerPort = 0;

        before(() => {
            let config = new Config();
            config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
            autoCollect = new StandardMetricsHandler(config, { collectionInterval: 100 });

            let httpConfig: HttpInstrumentationConfig = {
                enabled: true,
            };
            let instrumentation = new HttpInstrumentation(httpConfig);
            instrumentation.setMeterProvider(autoCollect.getMeterProvider());
            instrumentation.enable();
            // Load Http modules, HTTP instrumentation hook will be created in OpenTelemetry
            http = require("http") as any;
            createMockServers();
        });

        after(() => {
            mockHttpServer.close();
        });

        function createMockServers() {
            mockHttpServer = http.createServer((req: any, res: any) => {
                res.statusCode = 200;
                res.setHeader("content-type", "application/json");
                res.write(
                    JSON.stringify({
                        success: true,
                    })
                );
                res.end();
            });
            mockHttpServer.listen(0, () => {
                const addr = mockHttpServer.address();
                if (addr == null) {
                    new Error("unexpected addr null");
                    return;
                }
                if (typeof addr === "string") {
                    new Error(`unexpected addr ${addr}`);
                    return;
                }
                if (addr.port <= 0) {
                    new Error("Could not get port");
                    return;
                }
                mockHttpServerPort = addr.port;
            });
        }

        async function makeHttpRequest(): Promise<void> {
            const options = {
                hostname: "localhost",
                port: mockHttpServerPort,
                path: "/test",
                method: "GET",
            };
            return new Promise((resolve, reject) => {
                const req = http.request(options, (res: any) => {
                    res.on("data", function () {});
                    res.on("end", () => {
                        resolve();
                    });
                });
                req.on("error", (error: Error) => {
                    reject(error);
                });
                req.end();
            });
        }

        it("http outgoing/incoming requests", async () => {
            let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
            await makeHttpRequest();
            await new Promise((resolve) => setTimeout(resolve, 120));
            assert.ok(mockExport.called);
            let resourceMetrics = mockExport.args[0][0];
            const scopeMetrics = resourceMetrics.scopeMetrics;
            assert.strictEqual(scopeMetrics.length, 2, "scopeMetrics count");
            let metrics = scopeMetrics[0].metrics;
            assert.strictEqual(metrics.length, 2, "metrics count");
            assert.equal(metrics[0].descriptor.name, StandardMetric.EXCEPTION_COUNT);
            assert.equal(metrics[1].descriptor.name, StandardMetric.TRACE_COUNT);
            metrics = scopeMetrics[1].metrics;
            assert.strictEqual(metrics.length, 2, "metrics count");
            assert.equal(metrics[0].descriptor.name, StandardMetric.HTTP_REQUEST_DURATION);
            assert.equal(metrics[1].descriptor.name, StandardMetric.HTTP_DEPENDENCY_DURATION);
        });
    });
});
