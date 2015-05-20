///<reference path="..\Declarations\node\node.d.ts" />
///<reference path="..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\Declarations\sinon\sinon.d.ts" />

import http = require("http");
import assert = require("assert");
import sinon = require("sinon");
import AppInsights = require("../applicationinsights");

describe("EndToEnd", () => {

    describe("Basic usage", () => {
        it("should send telemetry", (done) => {
            var client =AppInsights.getClient("iKey");
            client.trackEvent("test event");
            client.trackException(new Error("test error"));
            client.trackMetric("test metric", 3);
            client.trackTrace("test trace");
            client.sendPendingData((response) => {
                assert.ok(response, "response should not be empty");
                done();
            });
        });

        it("should send telemetry", (done) => {
            AppInsights
                .setup("ikey")
                .start();

            var server = http.createServer((req: http.ServerRequest, res: http.ServerResponse) => {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.end("server is up");
                setTimeout(() => {
                    AppInsights.client.sendPendingData((response) => {
                        assert.ok(response, "response should not be empty");
                        done();
                    });
                }, 10);
            });

            server.listen(0, "::"); // "::" causes node to listen on both ipv4 and ipv6
            server.on("listening", () => {
                http.get("http://localhost:" + server.address().port +"/test", (response: http.ServerResponse) => {
                    response.on("end", () => {
                        server.close();
                    });
                });
            });
        });
    });
});