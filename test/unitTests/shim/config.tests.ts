import assert = require('assert');
import sinon = require('sinon');
import { TelemetryClient } from '../../../applicationinsights';
import { HttpInstrumentationConfig } from '@opentelemetry/instrumentation-http';
const applicationInsights = require('../../../applicationinsights');

describe("shim/configuration/config", () => {
    const connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";

    let originalEnv: NodeJS.ProcessEnv;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        originalEnv = process.env;
        process.env["APPLICATION_INSIGHTS_SHIM_CONFIGURATION"] = "true";
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        process.env = originalEnv;
        delete process.env.APPLICATION_INSIGHTS_SHIM_CONFIGURATION;
        sandbox.restore();
    })

    describe("#constructor()", () => {
        const telemetryClient = new TelemetryClient(connectionString);
        it("should initialize config values", () => {
            applicationInsights.setup(connectionString);
            telemetryClient.config.instrumentationKey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
            telemetryClient.config.endpointUrl = "https://centralus-0.in.applicationinsights.azure.com/";
            telemetryClient.config.proxyHttpUrl = "http://localhost:8888",
            telemetryClient.config.proxyHttpsUrl = "https://localhost:3000",
            telemetryClient.config.correlationHeaderExcludedDomains = ["https://www.bing.com"],
            telemetryClient.config.samplingPercentage = 50;
            telemetryClient.config.enableAutoCollectExternalLoggers = true;
            telemetryClient.config.enableAutoCollectExceptions = true;
            telemetryClient.config.enableAutoCollectConsole = true;
            telemetryClient.config.enableAutoCollectExceptions = true;
            telemetryClient.config.enableAutoCollectPerformance = true;
            telemetryClient.start();

            assert.equal(telemetryClient["_options"].samplingRatio, 0.5);
            assert.equal(telemetryClient["_options"].azureMonitorExporterConfig.connectionString, connectionString);
            assert.equal(telemetryClient["_options"].azureMonitorExporterConfig.proxyOptions.host, "localhost");
            assert.equal(telemetryClient["_options"].azureMonitorExporterConfig.proxyOptions.port, 3000);
            const ignoreOutgoingUrls = telemetryClient["_options"].instrumentationOptions.http as HttpInstrumentationConfig;
            assert.equal(ignoreOutgoingUrls.ignoreOutgoingUrls, "https://www.bing.com");
            assert.equal(JSON.stringify(telemetryClient["_options"].logInstrumentations), JSON.stringify({ console: { enabled: true }, winston: { enabled: true }, bunyan: { enabled: true } }));
            assert.equal(telemetryClient["_options"].enableAutoCollectExceptions, true);
            assert.equal(telemetryClient["_options"].enableAutoCollectPerformance, true);
            assert.equal(JSON.stringify(telemetryClient["_options"].extendedMetrics), JSON.stringify({ gc: true, heap: true, loop: true }));
        });

        it("should disableAppInsights", () => {
            applicationInsights.setup(connectionString);
            applicationInsights.defaultClient.config.disableAppInsights = true;
            applicationInsights.start();
            assert.equal(applicationInsights.defaultClient, undefined);
        });
    });
});
