///<reference path=".\Declarations\node\node.d.ts" />

import http = require("http");
import AppInsights = require("./applicationinsights");
AppInsights.setup("f75c55f7-a8ef-46f2-80c2-3b02c53d381f")
    .setAutoCollectRequests(true) // default is true
    .setAutoCollectPerformance(true) // default is true
    .setAutoCollectExceptions(true) // default is true
    .enableVerboseLogging()
    .start(); // no telemetry will be sent until .start is called allowing auto-collection initialization to be prevented if necessary

AppInsights.client.trackEvent("test event");
AppInsights.client.trackException(new Error());
AppInsights.client.trackMetric("test metric", 3);
AppInsights.client.trackTrace("test trace");

var count = 0;
var last = 0;
var server = http.createServer((req: http.ServerRequest, res: http.ServerResponse) => {
    count++;
    var now = +new Date;
    if(now - last > 1000) {
        last = now;
        console.log(count + " requests processed");
        AppInsights.client.trackEvent("Requests Processed", {port: process.env.PORT}, {count: count});
        count = 0;
    }

    if (req.url == "/") {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("server is up");
    }
});

server.listen(process.env.PORT || 3000);
