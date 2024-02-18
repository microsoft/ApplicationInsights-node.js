import assert = require("assert");
import sinon = require("sinon");
import fs = require("fs");
import os = require("os");
import path = require("path");

import Context = require("../../Library/Context");
import Constants = require("../../Declarations/Constants");
import * as PrefixHelpers from "../../Library/PrefixHelper";

describe("Library/Context", () => {
    describe("#constructor()", () => {
        var stubs: Array<any> = [];
        let originalEnv: NodeJS.ProcessEnv;

        before(() => {
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
            originalEnv = process.env;
            stubs = [
                sinon.stub(os, "hostname", () => "host"),
                sinon.stub(os, "type", () => "type"),
                sinon.stub(os, "arch", () => "arch"),
                sinon.stub(os, "release", () => "release"),
                sinon.stub(os, "platform", () => "platform")
            ];
        });

        afterEach(() => {
            process.env = originalEnv;
            stubs.forEach((s, i, arr) => s.restore());
        });

        it("should initialize default context", () => {
            var context = new Context();
            var defaultkeys = [
                context.keys.cloudRoleInstance,
                context.keys.deviceOSVersion,
                context.keys.internalSdkVersion,
                context.keys.cloudRole,
                context.keys.applicationVersion
            ];

            for (var i = 0; i < defaultkeys.length; i++) {
                var key = defaultkeys[i];
                assert.ok(!!context.tags[key], key = " is set");
            }
        });

        it("should set internalSdkVersion to 'prefix_node:<version>' in manual SDK scenarios", () => {
            var context = new Context();
            const packageJsonPath = path.resolve(__dirname, "../../../", "./package.json");
            let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
            assert.strictEqual(context.tags[context.keys.internalSdkVersion], `${PrefixHelpers.getResourceProvider()}${PrefixHelpers.getOsPrefix()}${Constants.AttachTypePrefix.MANUAL}_node:${packageJson.version}`)
            assert.strictEqual(Context.sdkVersion, packageJson.version);
        });

        it("should correctly set device context", () => {
            var context = new Context();
            assert.equal(context.tags[context.keys.cloudRoleInstance], "host");
            assert.equal(context.tags[context.keys.deviceOSVersion], "type release");
            assert.equal(context.tags[context.keys.cloudRole], Context.DefaultRoleName);

            assert.equal(context.tags["ai.device.osArchitecture"], "arch");
            assert.equal(context.tags["ai.device.osPlatform"], "platform");
        });

        it("should correctly set Azure properties", () => {
            const env = <{ [id: string]: string }>{};
            env.WEBSITE_SITE_NAME = "testRole";
            env.WEBSITE_INSTANCE_ID = "627cc493-f310-47de-96bd-71410b7dec09";
            process.env = env;
            var context = new Context();
            assert.equal(context.tags[context.keys.cloudRole], "testRole");
            assert.equal(context.tags[context.keys.cloudRoleInstance], "627cc493-f310-47de-96bd-71410b7dec09");
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
