import * as assert from "assert";
import * as sinon from "sinon";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { Context } from "../../../src/library";
import { KnownContextTagKeys } from "../../../src/declarations/generated";

describe("library", () => {
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
            var context = new Context();
            const packageJsonPath = path.resolve(__dirname, "../../../../", "./package.json");
            let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
            assert.strictEqual(context.tags[KnownContextTagKeys.AiInternalSdkVersion], "node:" + packageJson.version);
            assert.strictEqual(context.sdkVersion, packageJson.version);
        });

        it("should correctly set device context", () => {
            var context = new Context();
            assert.equal(context.tags[KnownContextTagKeys.AiCloudRoleInstance], "host");
            assert.equal(context.tags[KnownContextTagKeys.AiDeviceOsVersion], "type release");
            assert.equal(context.tags[KnownContextTagKeys.AiCloudRole], context.defaultRoleName);
            assert.equal(context.tags["ai.device.osArchitecture"], "arch");
            assert.equal(context.tags["ai.device.osPlatform"], "linux");
        });

        // TODO: Unreliable test, applicationVersion is being added during build
        // it("should correctly set application version", () => {
        //     var context = new Context();
        //     assert.equal(context.tags[context.keys.applicationVersion], "unknown");
        //     var testFilePath = path.resolve(__dirname, "testpackage.json")
        //     context = new Context(testFilePath);
        //     assert.equal(context.tags[context.keys.applicationVersion], "testVersion");
        // });
    });
});
