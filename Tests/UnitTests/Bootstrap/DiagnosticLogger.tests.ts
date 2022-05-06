import * as assert from "assert";
import * as sinon from "sinon";
import { DiagnosticLogger } from "../../../src/bootstrap/diagnosticLogger";
import { NoopLogger } from "../../../src/bootstrap/noopLogger";
import * as DataModel from "../../../src/bootstrap/dataModel";


describe("DiagnosticLogger", () => {
    var sandbox: sinon.SinonSandbox;
    const version = require("../../../../package.json").version;

    before(()=>{
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#DiagnosticLogger.DefaultEnvelope", () => {
        let originalEnv: NodeJS.ProcessEnv;

        beforeEach(() => {
            originalEnv = process.env;
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it("should have the correct fields", () => {
            const env = <{ [id: string]: string }>{};
            env["WEBSITE_SITE_NAME"] = "testSiteName";
            env["APPINSIGHTS_INSTRUMENTATIONKEY"] = "testIkey";
            env["ApplicationInsightsAgent_EXTENSION_VERSION"] = "testExtensionVersion";
            env["WEBSITE_OWNER_NAME"] = "testSubscriptionId";
            process.env = env;

            const testLogger = new DiagnosticLogger(new NoopLogger());
            assert.equal(testLogger["_defaultEnvelope"].properties.sdkVersion, version);
            assert.equal(testLogger["_defaultEnvelope"].properties.siteName, "testSiteName");
            assert.equal(testLogger["_defaultEnvelope"].properties.ikey, "testIkey");
            assert.equal(testLogger["_defaultEnvelope"].properties.extensionVersion, "testExtensionVersion");
            assert.equal(testLogger["_defaultEnvelope"].properties.subscriptionId, "testSubscriptionId");
        });
    });

    describe("#DiagnosticLogger.logMessage", () => {
        it("should log all required fields", () => {
            const expectedDate = new Date();
            const logger = new DiagnosticLogger(new NoopLogger());
            let stub = sandbox.stub(logger["_writer"], "log");
            logger.logMessage("Some message");

            let message = stub.args[0][0];

            assert.equal(message.level, DataModel.SeverityLevel.INFO);
            assert.equal(message.message, "Some message");
            assert.equal(message.logger, "applicationinsights.extension.diagnostics");
            assert.equal(new Date(message.time).toDateString(), expectedDate.toDateString());
            assert.equal(message.properties.language, "nodejs");
            assert.equal(message.properties.operation, "Startup");
            assert.equal(message.level, DataModel.SeverityLevel.INFO);
        });
    });
});
