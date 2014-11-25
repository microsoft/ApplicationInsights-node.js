/*
 * To run this example F5 in visual studio, or:
 *  - set APPINSIGHTS_INSTRUMENTATION_KEY=<insert_instrumentation_key_here>
 *  - npm pack > package-version
 *  - set /p package-version=<package-version
 *  - npm install %package-version%
 *  - node ExampleUsage.js
 */

import http = require('http');
import aiModule = require("applicationInsights");

// instantiate an instance of NodeAppInsights
var appInsights = new aiModule.NodeAppInsights(
    /* configuration can optionally be passed here instead of the environment variable, example:
    {
        instrumentationKey: "<guid>"
    }
    */
);

// must be done before creating the http server ('monkey patch' http.createServer to inject request tracking)
// this example tracks all requests except requests for "favicon" 
appInsights.trackAllHttpServerRequests("favicon");

// log unhandled exceptions by adding a handler to process.on("uncaughtException")
appInsights.trackAllUncaughtExceptions();

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
var server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');

    // stop tracking server startup (this will send a timed telemetry event)
    appInsights.stopTrackEvent(exampleUsageServerStartEvent);
}).listen(port);
