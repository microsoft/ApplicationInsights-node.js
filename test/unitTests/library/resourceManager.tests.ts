import * as assert from "assert";
import * as sinon from "sinon";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { ResourceManager } from "../../../src/library/handlers";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { Config } from "../../../src/library/configuration";

describe("ResourceManager", () => {
    var sandbox: sinon.SinonSandbox;

    describe("#constructor()", () => {
        before(() => {
            sandbox = sinon.createSandbox();
            // Create custom package json
            var jsonContent = JSON.stringify({ "version": "testVersion" });
            var testFilePath = path.resolve(__dirname, "testpackage.json");
            fs.writeFile(testFilePath, jsonContent, () => { });
        });

        after(() => {
            var testFilePath = path.resolve(__dirname, "testpackage.json")
            fs.unlink(testFilePath, (err) => { });
        });

        beforeEach(() => {
            sandbox.stub(os, "hostname").callsFake(() => "host");
            sandbox.stub(os, "type").callsFake(() => "type");
            sandbox.stub(os, "arch").callsFake(() => "arch");
            sandbox.stub(os, "release").callsFake(() => "release");
            sandbox.stub(os, "platform").callsFake(() => "linux");
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("should set internalSdkVersion to 'node:<version>'", () => {
            var resourceManager = new ResourceManager();
            const packageJsonPath = path.resolve(__dirname, "../../../../", "./package.json");
            let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
            assert.strictEqual(resourceManager["_baseResource"].attributes[SemanticResourceAttributes.TELEMETRY_SDK_VERSION], "node:" + packageJson.version);
        });

        it("should correctly set service attributes", () => {
            var resourceManager = new ResourceManager();
            assert.equal(resourceManager["_baseResource"].attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID], "host");
            assert.equal(resourceManager["_baseResource"].attributes[SemanticResourceAttributes.SERVICE_NAME], "Web");
        });

        it("should correctly set Azure attributes", () => {
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;
            env.WEBSITE_SITE_NAME = "testRole";
            env.WEBSITE_INSTANCE_ID = "testRoleInstanceId";
            process.env = env;
            var resourceManager = new ResourceManager();
            process.env = originalEnv;
            assert.equal(resourceManager["_baseResource"].attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID], "testRoleInstanceId");
            assert.equal(resourceManager["_baseResource"].attributes[SemanticResourceAttributes.SERVICE_NAME], "testRole");
        });
    });
});
