import * as assert from "assert";
import * as sinon from "sinon";
import * as nock from "nock";
import { AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { DataPointType, MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

import { HttpMetricsInstrumentation } from "../../../src/autoCollection/metrics/collection/httpMetricsInstrumentation";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";


nock("https://centralus-0.in.applicationinsights.azure.com").post(
    "/v2.1/track",
    (body: string) => {
        return true;
    }
).reply(200, {}).persist();

const httpMetricsConfig: HttpMetricsInstrumentationConfig = {
    ignoreOutgoingRequestHook: (request: any) => {
        if (request.headers && request.headers["user-agent"]) {
            return request.headers["user-agent"].toString().indexOf("azsdk-js-monitor-opentelemetry-exporter") > -1;
        }
        return false;
    }
};
const instrumentation = new HttpMetricsInstrumentation(httpMetricsConfig);
instrumentation.enable();
instrumentation.disable();

import * as http from 'http';
import { HttpMetricsInstrumentationConfig } from "../../../src/autoCollection/metrics/types";

const meterProvider = new MeterProvider();
const exporter = new AzureMonitorMetricExporter({ connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/" });
const metricReader = new PeriodicExportingMetricReader({ exporter: exporter as any, exportIntervalMillis: 100 });
meterProvider.addMetricReader(metricReader);
instrumentation.setMeterProvider(meterProvider);

describe("AutoCollection/HttpMetricsInstrumentation", () => {
    let sandbox: sinon.SinonSandbox;
    let mockHttpServer: any;
    let mockHttpServerPort = 0;

    before(() => {
        instrumentation.enable();
        sandbox = sinon.createSandbox();
        createMockServer();
    });

    after(() => {
        instrumentation.disable();
        meterProvider.shutdown();
        mockHttpServer.close();
        nock.cleanAll();
    });

    function createMockServer() {
        mockHttpServer = http.createServer((req: any, res: any) => {
            res.statusCode = 200;
            res.setHeader('content-type', 'application/json');
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
                new Error('unexpected addr null');
                return;
            }
            if (typeof addr === 'string') {
                new Error(`unexpected addr ${addr}`);
                return;
            }
            if (addr.port <= 0) {
                new Error('Could not get port');
                return;
            }
            mockHttpServerPort = addr.port;
        });
    }

    async function makeHttpRequest(): Promise<void> {
        const options = {
            hostname: 'localhost',
            port: mockHttpServerPort,
            path: '/test',
            method: 'GET',
        };
        return new Promise((resolve, reject) => {
            const req = http.request(options, (res: any) => {
                res.on('data', function () {
                });
                res.on('end', () => {
                    resolve();
                });
            });
            req.on('error', (error: Error) => {
                reject(error);
            });
            req.end();
        });
    }

    it("Server/Client Metric Duration", async () => {
        let mockExport = sandbox.stub(exporter, "export");
        await makeHttpRequest();
        await new Promise(resolve => setTimeout(resolve, 150));
        assert.ok(mockExport.called);
        let resourceMetrics = mockExport.args[0][0];
        const scopeMetrics = resourceMetrics.scopeMetrics;
        assert.strictEqual(scopeMetrics.length, 1, 'scopeMetrics count');
        const metrics = scopeMetrics[0].metrics;
        assert.strictEqual(metrics.length, 2, 'metrics count');
        assert.strictEqual(metrics[0].dataPointType, DataPointType.HISTOGRAM);
        assert.strictEqual(metrics[0].descriptor.name, 'REQUEST_DURATION');
        assert.strictEqual(metrics[0].dataPoints.length, 1);
        assert.strictEqual((metrics[0].dataPoints[0].value as any).count, 1);
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.HTTP_SCHEME], 'http');
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.HTTP_METHOD], 'GET');
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.HTTP_FLAVOR], '1.1');
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.NET_HOST_NAME], 'localhost');
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.HTTP_TARGET], '/test');
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.HTTP_STATUS_CODE], "200");
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.NET_HOST_PORT], mockHttpServerPort.toString());

        assert.strictEqual(metrics[1].dataPointType, DataPointType.HISTOGRAM);
        assert.strictEqual(metrics[1].descriptor.name, 'DEPENDENCY_DURATION');
        assert.strictEqual(metrics[1].dataPoints.length, 1);
        assert.strictEqual((metrics[1].dataPoints[0].value as any).count, 1);
        assert.strictEqual(metrics[1].dataPoints[0].attributes[SemanticAttributes.HTTP_METHOD], 'GET');
        assert.strictEqual(metrics[1].dataPoints[0].attributes[SemanticAttributes.NET_PEER_NAME], 'localhost');
        assert.strictEqual(metrics[1].dataPoints[0].attributes[SemanticAttributes.NET_PEER_PORT], mockHttpServerPort.toString());
        assert.strictEqual(metrics[1].dataPoints[0].attributes[SemanticAttributes.HTTP_STATUS_CODE], "200");
        assert.strictEqual(metrics[1].dataPoints[0].attributes[SemanticAttributes.HTTP_FLAVOR], '1.1');
    });
});
