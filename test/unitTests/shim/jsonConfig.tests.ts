import assert = require("assert");
import sinon = require("sinon");
import path = require("path");
import { ShimJsonConfig } from "../../../src/shim/shim-jsonConfig";
import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
const applicationInsights = require('../../../applicationinsights');

describe("Json Config", () => {
    let sandbox: sinon.SinonSandbox;
    const connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        ShimJsonConfig["_instance"] = undefined;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("configuration values", () => {
        it("should take configurations from the JSON config file", () => {
            const cutstomConfigJsonPath = path.resolve(__dirname, "../../../../test/unitTests/shim/config.json");
            process.env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = cutstomConfigJsonPath;

            applicationInsights.setup(connectionString);
            applicationInsights.start();

            // cassert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].logInstrumentations), JSON.stringify({ console: { enabled: false }, winston: { enabled: false }, bunyan: { enabled: false } }), JSON.stringify(applicationInsights["defaultClient"]["_options"]));
            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.proxyOptions.host, "test");
            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.proxyOptions.port, 3000);
            assert.equal(applicationInsights["defaultClient"]["_options"].samplingRatio, 0.3, JSON.stringify(ShimJsonConfig["_instance"]));
            const ignoreOutgoingUrls = applicationInsights["defaultClient"]["_options"].instrumentationOptions.http as HttpInstrumentationConfig;
            assert.equal(ignoreOutgoingUrls.ignoreOutgoingUrls, "bing.com");
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].logInstrumentations), JSON.stringify({ winston: { enabled: true }, bunyan: { enabled: true }, console: { enabled: true } }));
            assert.equal(applicationInsights["defaultClient"]["_options"].enableAutoCollectExceptions, true);
            assert.equal(applicationInsights["defaultClient"]["_options"].enableAutoCollectPerformance, true);
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].extendedMetrics), JSON.stringify({ gc: true, heap: true, loop: true }));
            assert.equal(applicationInsights["defaultClient"]["_options"].instrumentationOptions.http.hasOwnProperty("ignoreIncomingRequestHook"), true);
            assert.equal(applicationInsights["defaultClient"]["_options"].instrumentationOptions.http.hasOwnProperty("ignoreOutgoingRequestHook"), true);
            assert.equal(
                JSON.stringify(applicationInsights["defaultClient"]["_options"].otlpTraceExporterConfig),
                JSON.stringify({timeoutMillis: 1000})
            );
            assert.equal(
                JSON.stringify(applicationInsights["defaultClient"]["_options"].otlpMetricExporterConfig),
                JSON.stringify({timeoutMillis: 1000})
            );
            assert.equal(
                JSON.stringify(applicationInsights["defaultClient"]["_options"].otlpLogExporterConfig),
                JSON.stringify({timeoutMillis: 1000})
            );
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].instrumentationOptions.redis), JSON.stringify({ enabled: false }));
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].instrumentationOptions.azureSdk), JSON.stringify({ enabled: false }));

            applicationInsights.dispose();
            ShimJsonConfig["_instance"] = undefined;
            delete process.env.APPLICATIONINSIGHTS_CONFIGURATION_FILE;
        });
    });
});