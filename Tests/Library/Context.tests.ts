import assert = require("assert");
import sinon = require("sinon");
import http = require("http");
import os = require("os");

import Context = require("../../Library/Context");

describe("Library/Context", () => {
    describe("#constructor()", () => {
        var stubs: Array<any> = [];
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
                context.keys.cloudRole
            ];

            for (var i = 0; i < defaultkeys.length; i++) {
                var key = defaultkeys[i];
                assert.ok(!!context.tags[key], key = " is set");
            }
        });

        it("should set internalSdkVersion to 'node:<version>'", () => {
            var context = new Context();
            // todo: make this less fragile (will need updating on each minor version change)
            assert.equal(context.tags[context.keys.internalSdkVersion].substring(0, 9), "node:1.5.");
        });

        it("should correctly set device context", () => {
            var context = new Context();
            assert.equal(context.tags[context.keys.cloudRoleInstance], "host");
            assert.equal(context.tags[context.keys.deviceOSVersion], "type release");
            assert.equal(context.tags[context.keys.cloudRole], Context.DefaultRoleName);

            assert.equal(context.tags["ai.device.osArchitecture"], "arch");
            assert.equal(context.tags["ai.device.osPlatform"], "platform");
        });
    });
});
