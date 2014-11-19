/*
 * To run this example F5 in visual studio, or:
 *  1) set APPINSIGHTS_INSTRUMENTATION_KEY=<insert_instrumentation_key_here>
 *  2) npm install cookies
 *  3) npm install node-uuid
 *  4) npm pack > package-version
 *  5) set /p package-version=<package-version
 *  6) npm install %package-version%
 *  7) node ExampleUsage.js
 */

import http = require('http');
var port = process.env.port || 1337

// before creating the server, load app-insights so we can wrap the server prototype to track requests
var aiModule = require("applicationInsights");
var appInsights = new aiModule.applicationInsights(
    /* configuration can optionally be passed here instead of the environment variable, example:
    {
        instrumentationKey: "<guid>"
    }*/);

appInsights.filter("favicon"); // this will ignore requests for favicon

// example telemetry
appInsights.trackTrace("example usage trace");
appInsights.trackEvent("example usage event name", { custom: "properties" });
appInsights.trackException(new Error("example usage error message"), "handledHere");
appInsights.trackMetric("example usage metric name", 42);

// start tracking server startup
var exampleUsageServerStartEvent = "example usage server start";
appInsights.startTrackEvent(exampleUsageServerStartEvent);

// create server
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');

    // stop tracking server startup (this will send a timed telemetry event)
    appInsights.stopTrackEvent(exampleUsageServerStartEvent);
}).listen(port);