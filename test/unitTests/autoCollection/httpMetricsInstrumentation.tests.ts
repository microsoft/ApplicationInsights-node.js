import * as assert from "assert";
import * as sinon from "sinon";
import { AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { DataPointType, MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics-base";

import { HttpMetricsInstrumentation } from "../../../src/autoCollection/metrics/httpMetricsInstrumentation";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";


const instrumentation = HttpMetricsInstrumentation.getInstance();
instrumentation.enable();
instrumentation.disable();

const meterProvider = new MeterProvider();
const exporter = new AzureMonitorMetricExporter({ connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/" });
const metricReader = new PeriodicExportingMetricReader({ exporter: exporter, exportIntervalMillis: 100 });
meterProvider.addMetricReader(metricReader);
instrumentation.setMeterProvider(meterProvider);

describe("AutoCollection/HttpMetricsInstrumentation", () => {
    let http: any = null;
    let sandbox: sinon.SinonSandbox;
    let mockHttpServer: any;
    let mockHttpServerPort = 0;

    before(() => {
        sandbox = sinon.createSandbox();
        // Load Http modules
        http = require("http") as any;
        createMockServer();
    });

    after(() => {
        meterProvider.shutdown();
        mockHttpServer.close();
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
        await new Promise(resolve => setTimeout(resolve, 120));
        assert.ok(mockExport.called);
        let resourceMetrics = mockExport.args[0][0];
        const scopeMetrics = resourceMetrics.scopeMetrics;
        assert.strictEqual(scopeMetrics.length, 1, 'scopeMetrics count');
        const metrics = scopeMetrics[0].metrics;
        assert.strictEqual(metrics.length, 2, 'metrics count');
        assert.strictEqual(metrics[0].dataPointType, DataPointType.HISTOGRAM);
        assert.strictEqual(metrics[0].descriptor.name, 'http.server.duration');

        assert.strictEqual(JSON.stringify(metrics), "Wrong PRRRTTT");

        assert.strictEqual(metrics[0].dataPoints.length, 1);
       
        assert.strictEqual((metrics[0].dataPoints[0].value as any).count, 1, "Wrong server duration count");
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.HTTP_SCHEME], 'http');
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.HTTP_METHOD], 'GET');
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.HTTP_FLAVOR], '1.1');
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.NET_HOST_NAME], 'localhost');
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.HTTP_TARGET], '/test');
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.HTTP_STATUS_CODE], 200);
        assert.strictEqual(metrics[0].dataPoints[0].attributes[SemanticAttributes.NET_HOST_PORT], 22346);

        assert.strictEqual(metrics[1].dataPointType, DataPointType.HISTOGRAM);
        assert.strictEqual(metrics[1].descriptor.name, 'http.client.duration');
        assert.strictEqual(metrics[1].dataPoints.length, 1);
        assert.strictEqual((metrics[1].dataPoints[0].value as any).count, 1);
        assert.strictEqual(metrics[1].dataPoints[0].attributes[SemanticAttributes.HTTP_METHOD], 'GET');
        assert.strictEqual(metrics[1].dataPoints[0].attributes[SemanticAttributes.NET_PEER_NAME], 'localhost');
        assert.strictEqual(metrics[1].dataPoints[0].attributes[SemanticAttributes.HTTP_URL], 'http://localhost:22346/test');
        assert.strictEqual(metrics[1].dataPoints[0].attributes[SemanticAttributes.NET_PEER_PORT], 22346);
        assert.strictEqual(metrics[1].dataPoints[0].attributes[SemanticAttributes.HTTP_STATUS_CODE], 200);
        assert.strictEqual(metrics[1].dataPoints[0].attributes[SemanticAttributes.HTTP_FLAVOR], '1.1');
    });
});
