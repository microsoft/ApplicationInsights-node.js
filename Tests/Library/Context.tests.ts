import assert = require("assert");
import sinon = require("sinon");
import fs = require("fs");
import os = require("os");
import path = require("path");

import Context = require("../../Library/Context");

describe("Library/Context", () => {
    describe("#constructor()", () => {
        var stubs: Array<any> = [];

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
            stubs = [
                sinon.stub(os, "hostname", () => "host"),
                sinon.stub(os, "type", () => "type"),
                sinon.stub(os, "arch", () => "arch"),
                sinon.stub(os, "release", () => "release"),
                sinon.stub(os, "platform", () => "platform")
            ];
        });

        afterEach(() => {
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

        it("should set internalSdkVersion to 'node:<version>'", () => {
            var context = new Context();
            const packageJsonPath = path.resolve(__dirname, "../../../", "./package.json");
            let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
            assert.strictEqual(context.tags[context.keys.internalSdkVersion], "node:" + packageJson.version);
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
