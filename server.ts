///<reference path=".\Declarations\node\node.d.ts" />

import http = require("http");
import AppInsights = require("./ApplicationInsights");
AppInsights.setup("b7040ad8-a016-4057-903f-35edb58a6007")
    .setAutoCollectRequestsEnabled(true) // default is true
    .setAutoCollectPerformanceEnabled(true) // default is true
    .setAutoCollectExceptionsEnabled(true) // default is true
    .enableVerboseLogging()
    .start(); // no telemetry will be sent until .start is called allowing auto-collection initialization to be prevented if necessary

AppInsights.instance.trackEvent("test event");
AppInsights.instance.trackException(new Error());
AppInsights.instance.trackMetric("test metric", 3);
AppInsights.instance.trackTrace("test trace");

var count = 0;
var last = 0;
var server = http.createServer((req: http.ServerRequest, res: http.ServerResponse) => {
    count++;
    var now = +new Date;
    if(now - last > 1000) {
        last = now;
        console.log(count + " requests processed");
        AppInsights.instance.trackEvent("Requests Processed", {port: process.env.PORT}, {count: count});
        count = 0;
    }

    if (req.url == "/") {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("server is up");
    }
});

server.listen(process.env.PORT || 3000);
