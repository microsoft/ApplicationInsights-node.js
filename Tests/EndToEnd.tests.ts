///<reference path="..\Declarations\node\node.d.ts" />
///<reference path="..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\Declarations\sinon\sinon.d.ts" />

import http = require("http");
import assert = require("assert");
import sinon = require("sinon");
import AppInsights = require("../applicationinsights");

describe("EndToEnd", () => {

    describe("Basic usage", () => {
        it("should send telemetry", () => {
            AppInsights
                .setup("ikey")
                .start();

            var client =AppInsights.client;
            client.trackEvent("test event");
            client.trackException(new Error("test error"));
            client.trackMetric("test metric", 3);
            client.trackTrace("test trace");
            client.sendPendingData();

            var server = http.createServer((req: http.ServerRequest, res: http.ServerResponse) => {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.end("server is up");
            });

            server.listen(process.env.PORT || 3000);
            server.close();
        });
    });
});