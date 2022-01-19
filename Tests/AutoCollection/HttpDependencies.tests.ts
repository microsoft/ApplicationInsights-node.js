import assert = require("assert");
import sinon = require("sinon");
import HttpDependencies = require("../../AutoCollection/HttpDependencies")
import Traceparent = require("../../Library/Traceparent");
import Tracestate = require("../../Library/Tracestate");

import AppInsights = require("../../applicationinsights");
import { CorrelationContextManager } from "../../AutoCollection/CorrelationContextManager";

describe("AutoCollection/HttpDependencies", () => {
    afterEach(() => {
        AppInsights.dispose();
    });
    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop dependencies autocollection", () => {

            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setAutoCollectDependencies(true);
            var enableHttpDependenciesSpy = sinon.spy(HttpDependencies.INSTANCE, "enable");
            appInsights.start();

            assert.equal(enableHttpDependenciesSpy.callCount, 1, "enable should be called once as part of dependencies autocollection initialization");
            assert.equal(enableHttpDependenciesSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableHttpDependenciesSpy.callCount, 2, "enable(false) should be called once as part of dependencies autocollection shutdown");
            assert.equal(enableHttpDependenciesSpy.getCall(1).args[0], false);
        });
    });
    describe("#trackRequest", () => {
        var telemetry = {
            options: {},
            request: {
                headers: <{ [key: string]: any }>{},
                getHeader: function (name: string) { return this.headers[name] },
                setHeader: function (name: string, value: any) { this.headers[name] = value },
                clearHeaders: function () { this.headers = {} }
            }
        }

        afterEach(() => {
            AppInsights.dispose();
            telemetry.request.clearHeaders();
        });
        it("should accept string request-context", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setAutoCollectDependencies(true);
            AppInsights.defaultClient.config.correlationId = "abcdefg";
            appInsights.start();

            telemetry.request.setHeader("request-context", "appId=cid-v1:aaaaed48-297a-4ea2-af46-0a5a5d26aaaa");
            assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
        });

        it("should accept nonstring request-context", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setAutoCollectDependencies(true);
            AppInsights.defaultClient.config.correlationId = "abcdefg";
            appInsights.start();

            telemetry.request.setHeader("request-context", ["appId=cid-v1:aaaaed48-297a-4ea2-af46-0a5a5d26aaaa"]);
            assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
            assert.deepEqual(telemetry.request.getHeader("request-context"), ["appId=cid-v1:aaaaed48-297a-4ea2-af46-0a5a5d26aaaa"], "does not modify valid appId header")

            const myCustomObject = { foo: { bar: "appId=cid-v1:aaaaed48-297a-4ea2-af46-0a5a5d26aaaa" } };
            myCustomObject.toString = () => myCustomObject.foo.bar;
            telemetry.request.setHeader("request-context", myCustomObject);
            assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
            assert.equal(telemetry.request.getHeader("request-context"), myCustomObject.toString(), "does not modify valid appId header");

            telemetry.request.setHeader("request-context", 123);
            assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
            assert.ok(telemetry.request.getHeader("request-context").indexOf("abcdefg") !== -1)

            telemetry.request.setHeader("request-context", { foo: 'bar' });
            assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
            assert.ok(telemetry.request.getHeader("request-context").indexOf("abcdefg") !== -1)
        });

        it("should add AI correlation headers to request", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
                .setAutoCollectDependencies(true)
                .setAutoDependencyCorrelation(true)
                .setDistributedTracingMode(AppInsights.DistributedTracingModes.AI);
            AppInsights.defaultClient.config.correlationId = "abcdefg";
            appInsights.start();
            let testContext = CorrelationContextManager.generateContextObject("testOperationId", "testParentId", "testOperationName");
            CorrelationContextManager.runWithContext(testContext, () => {
                assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
                assert.deepEqual(telemetry.request.getHeader("request-id"), "testParentId1.");
                // Legacy headers
                assert.deepEqual(telemetry.request.getHeader("x-ms-request-id"), "testOperationId");
                assert.deepEqual(telemetry.request.getHeader("x-ms-request-root-id"), "testParentId1.");
                // W3C headers not present
                assert.deepEqual(telemetry.request.getHeader("traceparent"), undefined);
                assert.deepEqual(telemetry.request.getHeader("tracestate"), undefined);
            });
        });

        it("should add W3C correlation headers to request", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
                .setAutoCollectDependencies(true)
                .setAutoDependencyCorrelation(true)
                .setDistributedTracingMode(AppInsights.DistributedTracingModes.AI_AND_W3C);
            AppInsights.defaultClient.config.correlationId = "abcdefg";
            AppInsights.defaultClient.config.ignoreLegacyHeaders = true;
            appInsights.start();

            const traceparent = new Traceparent("00-5e84aff3af474588a42dcbf3bd1db95f-1fc066fb77fa43a3-00");
            const tracestate = new Tracestate("test=testvalue");
            let testContext = CorrelationContextManager.generateContextObject("testOperationId", "testParentId", "testOperationName", null, traceparent, tracestate);
            CorrelationContextManager.runWithContext(testContext, () => {
                assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
                // AI header
                assert.ok(telemetry.request.getHeader("request-id").match(/^\|[0-z]{32}\.[0-z]{16}\./g));
                // W3C headers
                assert.ok(telemetry.request.getHeader("traceparent").match(/^00-5e84aff3af474588a42dcbf3bd1db95f-[0-z]{16}-00$/));
                assert.notEqual(telemetry.request.getHeader("traceparent"), "00-5e84aff3af474588a42dcbf3bd1db95f-1fc066fb77fa43a3-00");
                assert.equal(telemetry.request.getHeader("tracestate"), "test=testvalue");
                // Legacy headers not present
                assert.deepEqual(telemetry.request.getHeader("x-ms-request-id"), undefined);
                assert.deepEqual(telemetry.request.getHeader("x-ms-request-root-id"), undefined);
            });
        });
    });
});