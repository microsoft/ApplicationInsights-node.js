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
import aiModule = require("applicationInsights");

// instantiate an instance of NodeAppInsights
var appInsights = new aiModule.NodeAppInsights(
    /* configuration can optionally be passed here instead of the environment variable, example:
    {
        instrumentationKey: "<guid>"
    }*/    );

// collect all server requests except favicon('monkey patch' http.createServer to inject request tracking)
appInsights.trackHttpServerRequests("favicon");

// send all console.log events as traces
appInsights.trackConsoleLogs();

// log unhandled exceptions by adding a handler to process.on("uncaughtException")
appInsights.trackUncaughtExceptions();

// manually collect telemetry
appInsights.trackTrace("example usage trace");
appInsights.trackEvent("example usage event name", { custom: "properties" });
appInsights.trackException(new Error("example usage error message"), "handledHere");
appInsights.trackMetric("example usage metric name", 42);

// start tracking server startup
var exampleUsageServerStartEvent = "example usage server start";
appInsights.startTrackEvent(exampleUsageServerStartEvent);

// create server
var port = process.env.port || 1337
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');

    // stop tracking server startup (this will send a timed telemetry event)
    appInsights.stopTrackEvent(exampleUsageServerStartEvent);
}).listen(port);