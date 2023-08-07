import assert = require('assert');
import sinon = require('sinon');
import { TelemetryClient } from '../../../applicationinsights';
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
        /*
        it("should initialize connection string via config", () => {
            console.log("TELCLIENT: ", telemetryClient);
            assert.equal(telemetryClient["_options"].azureMonitorExporterConfig.connectionString, connectionString);
        });
        */
        it("should initialize config values", () => {
            // instrumentationKey
            // endpointUrl
            // proxyHttpUrl
            // proxyHttpsUrl
            // maxBatchSize
            // maxBatchIntervalMs
            // disableAppInsights - separate test
            telemetryClient.config.samplingPercentage = 50;
            // correlationRetryIntervalMs
            // ignoreLegacyHeaders - seperate test
            telemetryClient.start();
            console.log("TELCLIENT: ", telemetryClient);
            assert.equal(telemetryClient["_options"].samplingRatio, 0.5);
        });

        it("should disableAppInsights", () => {
            applicationInsights.setup(connectionString);
            applicationInsights.defaultClient.config.disableAppInsights = true;
            applicationInsights.start();
            assert.equal(applicationInsights.defaultClient, undefined);
        });
    });
});
