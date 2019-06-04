import assert = require("assert");
import sinon = require("sinon");
import HttpDependencies = require("../../AutoCollection/HttpDependencies")

import AppInsights = require("../../applicationinsights");

describe("AutoCollection/HttpDependencies", () => {
    afterEach(() => {
        AppInsights.dispose();
    });
    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop dependencies autocollection", () => {

            var appInsights = AppInsights.setup("key").setAutoCollectDependencies(true);
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
                headers: <{[key: string]: any} >{},
                getHeader: function (name: string) { return this.headers[name] },
                setHeader: function (name: string, value: any) { this.headers[name] = value },
                clearHeaders: function() { this.headers = {} }
            }
        }

        afterEach(() => {
            AppInsights.dispose();
            telemetry.request.clearHeaders();
        });
        it("should accept string request-context", () => {
            var appInsights = AppInsights.setup("key").setAutoCollectDependencies(true);
            AppInsights.defaultClient.config.correlationId = "abcdefg";
            appInsights.start();

            telemetry.request.setHeader("request-context", "appId=cid-v1:aaaaed48-297a-4ea2-af46-0a5a5d26aaaa");
            assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
        });

        it ("should accept nonstring request-context", () => {
            var appInsights = AppInsights.setup("key").setAutoCollectDependencies(true);
            AppInsights.defaultClient.config.correlationId = "abcdefg";
            appInsights.start();

            telemetry.request.setHeader("request-context", ["appId=cid-v1:aaaaed48-297a-4ea2-af46-0a5a5d26aaaa"]);
            assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
            assert.deepEqual(telemetry.request.getHeader("request-context"), ["appId=cid-v1:aaaaed48-297a-4ea2-af46-0a5a5d26aaaa"], "does not modify valid appId header")

            const myCustomObject = {foo: {bar: "appId=cid-v1:aaaaed48-297a-4ea2-af46-0a5a5d26aaaa"}};
            myCustomObject.toString = () => myCustomObject.foo.bar;
            telemetry.request.setHeader("request-context", myCustomObject);
            assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
            assert.equal(telemetry.request.getHeader("request-context"), myCustomObject.toString(), "does not modify valid appId header");

            telemetry.request.setHeader("request-context", 123);
            assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
            assert.ok(telemetry.request.getHeader("request-context").indexOf("abcdefg") !== -1)

            telemetry.request.setHeader("request-context", {foo: 'bar'});
            assert.doesNotThrow(() => HttpDependencies.trackRequest(AppInsights.defaultClient, telemetry as any));
            assert.ok(telemetry.request.getHeader("request-context").indexOf("abcdefg") !== -1)
        });
    });
});