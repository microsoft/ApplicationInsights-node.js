///<reference path="..\..\Declarations\node\node.d.ts" />
///<reference path="..\..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\..\Declarations\sinon\sinon.d.ts" />

import assert = require("assert");
import sinon = require("sinon");
import http = require("http");

import Context = require("../../Library/Context");

describe("Library/Context", () => {
    describe("#constructor()", () => {
        it("should initialize default context", () => {
            var context = new Context();
            var defaultkeys = [
                context.keys.deviceId,
                context.keys.deviceMachineName,
                context.keys.deviceOS,
                context.keys.deviceOSVersion,
                context.keys.deviceType,
                context.keys.internalSdkVersion
            ];

            for (var i = 0; i < defaultkeys.length; i++) {
                var key = defaultkeys[i];
                assert.ok(!!context.tags[key], key = " is set");
            }
        });

        it("should set internalSdkVersion to 'node:<version>'", () => {
            var context = new Context();
            assert.equal(context.tags[context.keys.internalSdkVersion].substring(0, 5), "node:");
        });
    });
});