///<reference path='\typings\node\node.d.ts' />

import http = require("http");
import AppInsights = require("./ApplicationInsights");

AppInsights.setup("b7040ad8-a016-4057-903f-35edb58a6007")
    .setAutoCollectRequestsEnabled(true)
    .setAutoCollectPerformanceEnabled(true) // needs client metric batching..
    .enableVerboseLogging()
    .start();

AppInsights.trackEvent("test event");
AppInsights.trackException(new Error());
AppInsights.trackMetric("test metric", 3);
AppInsights.trackTrace("test trace");

var count = 0;
var last = 0;
var server = http.createServer((req: http.ServerRequest, res: http.ServerResponse) => {
    count++;
    var now = +new Date;
    if(now - last > 1000) {
        last = now;
        console.log(count + " requests processed");
        AppInsights.trackEvent("Requests Processed", {port: process.env.PORT}, {count: count});
        count = 0;
    }

    if (req.url == "/") {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('server is up');
    }
});

server.listen(process.env.PORT || 3000);
