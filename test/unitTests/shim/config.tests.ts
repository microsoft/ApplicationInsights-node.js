import assert = require('assert');
import sinon = require('sinon');
import azureCoreAuth = require("@azure/core-auth");
import { DiagLogLevel } from '@opentelemetry/api';
import { HttpInstrumentationConfig } from '@opentelemetry/instrumentation-http';
import { Logger } from "../../../src/shared/logging"
import Config = require('../../../src/shim/config');
import { TelemetryClient } from "../../../src/shim/telemetryClient";
import applicationInsights = require("../../../src/index");


class TestTokenCredential implements azureCoreAuth.TokenCredential {
    private _expiresOn: Date;
    private _numberOfRefreshs = 0;

    constructor(expiresOn?: Date) {
        this._expiresOn = expiresOn || new Date();
    }

    async getToken(scopes: string | string[], options?: any): Promise<any> {
        this._numberOfRefreshs++;
        return {
            token: "testToken" + this._numberOfRefreshs,
            expiresOnTimestamp: this._expiresOn
        };
    }
}

describe("shim/configuration/config", () => {
    const connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";

    let originalEnv: NodeJS.ProcessEnv;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        originalEnv = process.env;
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    })

    describe("#Shim config()", () => {
        it("should initialize config values", () => {
            const config = new Config(connectionString);
            config.endpointUrl = "https://centralus-0.in.applicationinsights.azure.com/";
            config.proxyHttpUrl = "http://localhost:8888";
            config.proxyHttpsUrl = "https://localhost:3000";
            config.correlationHeaderExcludedDomains = ["https://www.bing.com"];
            config.samplingPercentage = 50;
            config.enableAutoCollectExternalLoggers = true;
            config.enableAutoCollectExceptions = true;
            config.enableAutoCollectConsole = true;
            config.enableAutoCollectExceptions = true;
            config.enableAutoCollectPerformance = true;
            config.enableAutoCollectExtendedMetrics = true;
            config.enableAutoCollectRequests = true;
            config.enableAutoCollectDependencies = true;
            config.aadTokenCredential = new TestTokenCredential();
            config.maxBatchIntervalMs = 1000;

            let options = config.parseConfig();

            assert.equal(options.samplingRatio, 0.5, "wrong samplingRatio");
            assert.equal(options.azureMonitorExporterConfig.connectionString, connectionString), "wrong connectionString";
            assert.equal(options.azureMonitorExporterConfig.proxyOptions.host, "localhost", "wrong host");
            assert.equal(options.azureMonitorExporterConfig.proxyOptions.port, 3000, "wrong port");
            assert.equal((options.instrumentationOptions.http as HttpInstrumentationConfig).ignoreOutgoingUrls[0], "https://www.bing.com", "wrong ignoreOutgoingUrls");
            assert.equal(JSON.stringify(options.logInstrumentationOptions), JSON.stringify({ console: { enabled: true }, winston: { enabled: true }, bunyan: { enabled: true } }), "wrong logInstrumentationOptions");
            assert.equal(options.enableAutoCollectExceptions, true, "wrong enableAutoCollectExceptions");
            assert.equal(options.enableAutoCollectPerformance, true, "wrong enableAutoCollectPerformance");
            assert.equal(JSON.stringify(options.extendedMetrics), JSON.stringify({ gc: true, heap: true, loop: true }), "wrong extendedMetrics");
            assert.equal(options.azureMonitorExporterConfig.credential, config.aadTokenCredential, "wrong credential");
            assert.equal(
                JSON.stringify(options.otlpTraceExporterConfig),
                JSON.stringify({ timeoutMillis: 1000 }), "wrong otlpTraceExporterConfig"
            );
            assert.equal(
                JSON.stringify(options.otlpMetricExporterConfig),
                JSON.stringify({ timeoutMillis: 1000 }), "wrong otlpMetricExporterConfig"
            );
            assert.equal(
                JSON.stringify(options.otlpLogExporterConfig),
                JSON.stringify({ timeoutMillis: 1000 }), "wrong otlpLogExporterConfig"
            );
            // TODO: Validate all Config properties
        });

        it("should activate internal loggers", () => {
            const config = new Config(connectionString);
            assert.equal(Logger.getInstance()["_diagLevel"], DiagLogLevel.WARN);
            config.enableInternalDebugLogging = true;
            config.parseConfig();
            assert.equal(Logger.getInstance()["_diagLevel"], DiagLogLevel.DEBUG);
        });

        it("should disableAllExtendedMetrics", () => {
            const config = new Config(connectionString);
            config.disableAllExtendedMetrics = true;
            let options = config.parseConfig();
            assert.equal(JSON.stringify(options.extendedMetrics), JSON.stringify({ gc: false, heap: false, loop: false }));
        });

        it("should set context tags on logs and spans", () => {
            const telemetryClient = new TelemetryClient(connectionString);
            telemetryClient.context.tags = { "ai.cloud.role": "testRole", "ai.cloud.roleInstance": "testRoleInstance" };
            telemetryClient.initialize();
            telemetryClient["_attributeSpanProcessor"]["_attributes"] = { "ai.cloud.role": "testRole", "ai.cloud.roleInstance": "testRoleInstance" };
            telemetryClient["_attributeLogProcessor"]["_attributes"] = { "ai.cloud.role": "testRole", "ai.cloud.roleInstance": "testRoleInstance" };
        });
        // TODO: Add test for warning messages
    });
});
