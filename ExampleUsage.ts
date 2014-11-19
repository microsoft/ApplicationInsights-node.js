/*
 * To run this example:
 *  1) set APPINSIGHTS_INSTRUMENTATION_KEY=<insert_your_instrumentation_key_here>
 *  2) npm install cookies
 *  3) npm install node-uuid
 *  4) node ExampleUsage.js
 */

import http = require('http');
var port = process.env.port || 1337

// before creating the server, load app-insights so we can wrap the server prototype to track requests
var aiModule = require("applicationInsights");
var appInsights = new aiModule.applicationInsights(/* configuration can be passed here, example: { instrumentationKey: <guid> } */);
appInsights.filter("favicon"); // this will ignore requests for favicon

// example telemetry
appInsights.trackTrace("trace");
appInsights.trackEvent("eventName", { custom: "properties" });
appInsights.trackException(new Error("errorMsg"), "handledHere");
appInsights.trackMetric("metricName", 42);

// track server startup
appInsights.startTrackEvent("server start");
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');
    appInsights.stopTrackEvent("server start");
}).listen(port);